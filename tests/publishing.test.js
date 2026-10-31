import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createChromeStore } from '../scripts/lib/chrome-store.js';
import { compareVersions } from '../scripts/lib/version.js';
import { amoToken, verifyFirefox, firefoxSubmissionState } from '../scripts/lib/firefox-store.js';

const extensionId = 'jpencajlhojahjjokfkjbjnchdbacpfn';
const publisherId = '4f0fffd3-8066-448a-a5a8-b1398c6c37d5';
const revision = (version, state = 'PUBLISHED') => ({ state, distributionChannels: [{ crxVersion: version }] });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
function chrome(responses) {
  const calls = [];
  const store = createChromeStore({ accessToken: 'test-token', extensionId, publisherId, wait: async () => {}, fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    assert.ok(responses.length, 'unexpected request');
    return responses.shift();
  } });
  return { store, calls };
}
const candidate = { version: '4.8.0', zip: new Uint8Array([80, 75, 1]), maxPolls: 2 };

test('extension versions compare numerically with zero-padded segments', () => {
  assert.equal(compareVersions('4.10.0', '4.9.99'), 1);
  assert.equal(compareVersions('4.8', '4.8.0.0'), 0);
  assert.equal(compareVersions('4.7.7', '4.8.0'), -1);
  assert.throws(() => compareVersions('4.8-beta', '4.8'), /Invalid/);
});

test('Chrome verify performs only a GET at the fixed Google API origin', async () => {
  const { store, calls } = chrome([response({ publishedItemRevisionStatus: revision('4.7.7') })]);
  await store.status();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}:fetchStatus`);
  assert.equal(calls[0].method, undefined);
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token');
  assert.equal(calls[0].redirect, 'error');
});

test('Chrome polls async upload before requesting default publication with warnings blocked', async () => {
  const { store, calls } = chrome([
    response({ publishedItemRevisionStatus: revision('4.7.7') }),
    response({ uploadState: 'IN_PROGRESS', crxVersion: '4.8.0' }),
    response({ lastAsyncUploadState: 'IN_PROGRESS' }),
    response({ lastAsyncUploadState: 'SUCCEEDED' }),
    response({ state: 'PENDING_REVIEW' }),
  ]);
  assert.deepEqual(await store.publish(candidate), { result: 'submitted', version: '4.8.0', state: 'PENDING_REVIEW' });
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].url, `https://chromewebstore.googleapis.com/upload/v2/publishers/${publisherId}/items/${extensionId}:upload`);
  assert.equal(calls[1].body, candidate.zip);
  assert.deepEqual(JSON.parse(calls.at(-1).body), { publishType: 'DEFAULT_PUBLISH', blockOnWarnings: true });
});

test('Chrome reruns skip already-published and pending identical versions without mutation', async () => {
  for (const current of [
    { publishedItemRevisionStatus: revision('4.8.0') },
    { submittedItemRevisionStatus: revision('4.8.0', 'PENDING_REVIEW') },
  ]) {
    const { store, calls } = chrome([response(current)]);
    assert.match((await store.publish(candidate)).result, /^already-/);
    assert.equal(calls.length, 1);
  }
});

test('Chrome prevents downgrades, conflicting submissions and taken-down listing uploads', async () => {
  for (const current of [
    { publishedItemRevisionStatus: revision('4.10.0') },
    { submittedItemRevisionStatus: revision('4.9.0', 'PENDING_REVIEW') },
    { takenDown: true },
  ]) {
    const { store, calls } = chrome([response(current)]);
    await assert.rejects(store.publish(candidate));
    assert.equal(calls.length, 1);
  }
});

test('Chrome never submits failed uploads, version mismatches, or timed-out async uploads', async () => {
  for (const uploadResponses of [
    [response({ uploadState: 'FAILED' })],
    [response({ uploadState: 'SUCCEEDED', crxVersion: '4.7.0' })],
    [response({ uploadState: 'IN_PROGRESS' }), response({ lastAsyncUploadState: 'IN_PROGRESS' }), response({ lastAsyncUploadState: 'IN_PROGRESS' })],
  ]) {
    const { store, calls } = chrome([response({}), ...uploadResponses]);
    await assert.rejects(store.publish(candidate));
    assert.equal(calls.filter(call => call.url.endsWith(':publish')).length, 0);
  }
});

test('Chrome API errors redact tokens and do not retry mutations', async () => {
  const { store, calls } = chrome([response({}), response({ error: { message: 'invalid test-token' } }, 401)]);
  await assert.rejects(store.publish(candidate), error => error.message.includes('[redacted]') && !error.message.includes('test-token'));
  assert.equal(calls.length, 2);
  assert.throws(() => createChromeStore({ accessToken: 'x', publisherId: '../elsewhere', extensionId }), /CHROME_PUBLISHER_ID/);
});

test('AMO JWT has a one-minute lifetime, issuer and valid HS256 signature', () => {
  const jwt = amoToken({ issuer: 'issuer', secret: 'secret', now: 1000, nonce: 'unique-request' });
  const [head, payload, signature] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(head, 'base64url')), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url')), { iss: 'issuer', jti: 'unique-request', iat: 1000, exp: 1060 });
  assert.equal(signature, createHmac('sha256', 'secret').update(`${head}.${payload}`).digest('base64url'));
  assert.throws(() => amoToken({}), /AMO_JWT/);
});

test('Firefox verification proves authentication and ownership and reports a pending candidate', async () => {
  const calls = [];
  const responses = [response({ id: 123 }), response({ authors: [{ id: 123 }], current_version: { version: '4.7.7' } }), response({ version: '4.8.0', channel: 'listed', source: 'https://example.invalid/reviewer-source.zip', file: { status: 'unreviewed' } })];
  const result = await verifyFirefox({ issuer: 'i', secret: 's', addonId: '{guid}', version: '4.8.0', fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    return responses.shift();
  } });
  assert.equal(result.authenticated, true);
  assert.equal(result.publishedVersion, '4.7.7');
  assert.equal(result.existingStatus, 'unreviewed');
  assert.equal(result.hasReviewerSource, true);
  assert.equal(calls[0].url, 'https://addons.mozilla.org/api/v5/accounts/profile/');
  for (const call of calls) {
    assert.equal(call.method, undefined);
    assert.match(call.headers.Authorization, /^JWT /);
    assert.equal(call.redirect, 'error');
  }
});

test('Firefox refuses invalid credentials and another author even if the public listing exists', async () => {
  await assert.rejects(verifyFirefox({ issuer: 'i', secret: 's', addonId: 'guid', fetchImpl: async () => response({}, 401) }), /HTTP 401/);
  const responses = [response({ id: 123 }), response({ authors: [{ id: 999 }] })];
  await assert.rejects(verifyFirefox({ issuer: 'i', secret: 's', addonId: 'guid', fetchImpl: async () => responses.shift() }), /author/);
});

test('Firefox candidate 404 is expected; other errors do not count as absent versions', async () => {
  for (const status of [404, 403]) {
    const responses = [response({ id: 123 }), response({ authors: [{ id: 123 }] }), response({}, status)];
    const check = verifyFirefox({ issuer: 'i', secret: 's', addonId: 'guid', version: '4.8.0', fetchImpl: async () => responses.shift() });
    if (status === 404) { const result = await check; assert.equal(result.existingVersion, null); assert.equal(result.hasReviewerSource, false); }
    else await assert.rejects(check, /HTTP 403/);
  }
});

test('release context permits manual main checks and matching stable releases, rejects other refs/tags', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'souffleur-release-test-'));
  try {
    const eventPath = join(directory, 'event.json');
    const output = join(directory, 'output');
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const cases = [
      { eventName: 'workflow_dispatch', ref: 'refs/heads/main', event: {}, expected: 'verify' },
      { eventName: 'workflow_dispatch', ref: 'refs/heads/main', event: { inputs: { operation: 'publish' } }, expected: 'publish' },
      { eventName: 'workflow_dispatch', ref: 'refs/heads/untrusted', event: {}, expected: null },
      { eventName: 'release', ref: `refs/tags/v${version}`, event: { release: { tag_name: `v${version}` } }, expected: 'publish' },
      { eventName: 'release', ref: 'refs/tags/v0.0.0', event: { release: { tag_name: 'v0.0.0' } }, expected: null },
      { eventName: 'release', ref: `refs/tags/v${version}`, event: { release: { tag_name: `v${version}`, prerelease: true } }, expected: null },
    ];
    for (const item of cases) {
      await writeFile(eventPath, JSON.stringify(item.event));
      await writeFile(output, '');
      const run = () => execFileSync(process.execPath, ['scripts/release-context.js'], { env: { ...process.env, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: output, GITHUB_EVENT_NAME: item.eventName, GITHUB_REF: item.ref }, stdio: 'pipe' });
      if (item.expected) { run(); assert.match(await readFile(output, 'utf8'), new RegExp(`operation=${item.expected}\\n`)); }
      else { assert.throws(run); assert.equal(await readFile(output, 'utf8'), ''); }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Firefox reruns skip complete submissions but refuse missing reviewer source and unsafe versions', () => {
  const pending = { publishedVersion: '4.7.7', existingVersion: '4.8.0', existingStatus: 'unreviewed', existingChannel: 'listed', hasReviewerSource: true };
  assert.equal(firefoxSubmissionState({ publishedVersion: '4.7.7' }, '4.8.0'), 'upload');
  assert.equal(firefoxSubmissionState({ publishedVersion: '4.8.0' }, '4.8.0'), 'already-published');
  assert.equal(firefoxSubmissionState(pending, '4.8.0'), 'already-submitted');
  assert.throws(() => firefoxSubmissionState({ ...pending, hasReviewerSource: false }, '4.8.0'), /missing reviewer source/);
  assert.throws(() => firefoxSubmissionState({ ...pending, existingDisabled: true }, '4.8.0'), /disabled/);
  assert.throws(() => firefoxSubmissionState({ ...pending, existingChannel: 'unlisted' }, '4.8.0'), /another channel/);
  assert.throws(() => firefoxSubmissionState({ publishedVersion: '4.10.0' }, '4.8.0'), /newer/);
});
