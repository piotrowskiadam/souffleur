const API = 'https://chromewebstore.googleapis.com';

import { compareVersions } from './version.js';

export function revisionVersions(revision) {
  return revision?.distributionChannels?.map(channel => channel.crxVersion).filter(Boolean) ?? [];
}

/** Access tokens are passed only to Google's fixed API origin, never to logs. */
export function createChromeStore({ accessToken, publisherId, extensionId, fetchImpl = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!accessToken) throw new Error('Missing Google access token. Check Workload Identity Federation configuration.');
  if (!/^[a-zA-Z0-9-]+$/.test(publisherId ?? '')) throw new Error('Set CHROME_PUBLISHER_ID to the ID in the Chrome publisher dashboard.');
  if (!/^[a-p]{32}$/.test(extensionId ?? '')) throw new Error('Set CHROME_EXTENSION_ID to the existing Chrome extension ID.');
  const name = `publishers/${publisherId}/items/${extensionId}`;
  const url = `${API}/v2/${name}`;

  async function request(endpoint, options = {}) {
    const response = await fetchImpl(endpoint, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(`Chrome Web Store returned invalid JSON (HTTP ${response.status}).`); }
    if (!response.ok) {
      const message = String(body.error?.message ?? 'Request failed').replaceAll(accessToken, '[redacted]');
      throw new Error(`Chrome Web Store HTTP ${response.status}: ${message}`);
    }
    return body;
  }

  const status = () => request(`${url}:fetchStatus`);
  return {
    status,
    async publish({ version, zip, maxPolls = 60 }) {
      compareVersions(version, version);
      if (!(zip instanceof Uint8Array) || !zip.length) throw new Error('A non-empty validated Chrome ZIP is required.');
      const current = await status();
      if (current.takenDown) throw new Error('The Chrome listing is taken down. Resolve its dashboard policy issue before publishing.');
      const published = revisionVersions(current.publishedItemRevisionStatus);
      if (published.some(value => compareVersions(value, version) > 0)) throw new Error('Refusing to replace a newer Chrome store version with an older build.');
      if (published.some(value => compareVersions(value, version) === 0)) return { result: 'already-published', version };
      const submitted = current.submittedItemRevisionStatus;
      if (submitted && !['REJECTED', 'CANCELLED'].includes(submitted.state)) {
        const same = revisionVersions(submitted).some(value => compareVersions(value, version) === 0);
        if (same && ['PENDING_REVIEW', 'STAGED', 'PUBLISHED', 'PUBLISHED_TO_TESTERS'].includes(submitted.state)) {
          return { result: 'already-submitted', version, state: submitted.state };
        }
        throw new Error('Another Chrome submission is active. Resolve it in the dashboard before uploading a different build.');
      }
      const upload = await request(`${API}/upload/v2/${name}:upload`, {
        method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: zip,
      });
      if (upload.crxVersion && compareVersions(upload.crxVersion, version) !== 0) throw new Error('The Chrome ZIP version does not match the release version. Nothing was submitted for review.');
      let state = upload.uploadState;
      let count = 0;
      // Google's upload docs use both labels; the UploadState enum uses IN_PROGRESS.
      while (['IN_PROGRESS', 'UPLOAD_IN_PROGRESS'].includes(state) && count < maxPolls) {
        await wait(3000);
        state = (await status()).lastAsyncUploadState;
        count++;
      }
      if (state !== 'SUCCEEDED') throw new Error(`Chrome upload did not complete successfully (${state ?? 'unknown'}). Nothing was submitted for review.`);
      const submission = await request(`${url}:publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH', blockOnWarnings: true }),
      });
      if (!['PENDING_REVIEW', 'STAGED', 'PUBLISHED', 'PUBLISHED_TO_TESTERS'].includes(submission.state)) {
        throw new Error(`Chrome returned an unexpected submission state: ${submission.state ?? 'unknown'}. Check the dashboard.`);
      }
      return { result: 'submitted', version, state: submission.state };
    },
  };
}
