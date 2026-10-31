import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLibrary } from '../src/lib/library.js';

const a = { id: 'a', title: 'One', text: 'First prompt\n  ' };
const b = { id: 'b', title: 'Two', text: 'Second prompt' };
function fakeStorage(legacy) {
  const local = {};
  const sync = legacy === undefined ? {} : { prompts: structuredClone(legacy) };
  let fail = false;
  return {
    local: {
      get: async () => structuredClone(local),
      set: async value => { if (fail) throw new Error('Storage quota exceeded'); Object.assign(local, structuredClone(value)); },
    },
    sync: { get: async () => structuredClone(sync) },
    fail: value => { fail = value; },
    data: local,
    legacy: sync,
  };
}

test('migrates sync once without changing the legacy copy', async () => {
  const storage = fakeStorage([a]);
  const repo = createLibrary(storage);
  assert.deepEqual((await repo.get()).prompts, [a]);
  await repo.mutate({ type: 'create', prompt: b });
  assert.deepEqual((await createLibrary(storage).get()).prompts, [b, a]);
  assert.deepEqual(storage.legacy.prompts, [a]);
});

test('an empty library stays empty across reads, worker restarts and migration', async () => {
  const storage = fakeStorage([]);
  assert.deepEqual((await createLibrary(storage).get()).prompts, []);
  assert.deepEqual((await createLibrary(storage).get()).prompts, []);
  const repo = createLibrary(fakeStorage([a]));
  await repo.mutate({ type: 'delete', id: 'a', expected: a });
  assert.deepEqual((await repo.get()).prompts, []);
});

test('seeds only a new install, not an intentionally cleared library', async () => {
  const repo = createLibrary(fakeStorage());
  assert.equal((await repo.get()).prompts.length, 2);
});

test('failed save leaves persisted state intact and the queue recovers', async () => {
  const storage = fakeStorage([a]);
  const repo = createLibrary(storage);
  await repo.get();
  storage.fail(true);
  await assert.rejects(repo.mutate({ type: 'create', prompt: b }), /quota/);
  storage.fail(false);
  assert.deepEqual((await repo.get()).prompts, [a]);
  await repo.mutate({ type: 'create', prompt: b });
  assert.deepEqual((await repo.get()).prompts, [b, a]);
});

test('simultaneous adds do not lose each other', async () => {
  const repo = createLibrary(fakeStorage([]));
  await Promise.all([repo.mutate({ type: 'create', prompt: a }), repo.mutate({ type: 'create', prompt: b })]);
  assert.deepEqual((await repo.get()).prompts, [b, a]);
});

test('stale edits and deletes cannot overwrite a concurrent edit', async () => {
  const repo = createLibrary(fakeStorage([a]));
  const changed = { ...a, text: 'Updated elsewhere' };
  await repo.mutate({ type: 'update', id: 'a', expected: a, prompt: changed });
  await assert.rejects(repo.mutate({ type: 'update', id: 'a', expected: a, prompt: { ...a, text: 'Lost edit' } }), /changed in another panel/);
  await assert.rejects(repo.mutate({ type: 'delete', id: 'a', expected: a }), /changed in another panel/);
  assert.deepEqual((await repo.get()).prompts, [changed]);
});

test('merge skips exact duplicates, preserves differing text and replaces colliding IDs', async () => {
  const repo = createLibrary(fakeStorage([a]));
  const changed = { ...a, text: 'A different body' };
  const state = await repo.mutate({ type: 'import', mode: 'merge', prompts: [a, a, changed, b] });
  assert.equal(state.prompts.length, 3);
  assert.equal(state.prompts[0].id, 'a');
  assert.equal(new Set(state.prompts.map(p => p.id)).size, 3);
});

test('replace atomically keeps a recovery copy and rejects stale revisions', async () => {
  const storage = fakeStorage([a]);
  const repo = createLibrary(storage);
  const initial = await repo.get();
  await repo.mutate({ type: 'create', prompt: b });
  await assert.rejects(repo.mutate({ type: 'import', mode: 'replace', prompts: [], expectedRevision: initial.revision }), /library changed/);
  const current = await repo.get();
  await repo.mutate({ type: 'import', mode: 'replace', prompts: [], expectedRevision: current.revision });
  assert.deepEqual(storage.data.libraryBackup, current);
  assert.deepEqual((await repo.get()).prompts, []);
});

test('invalid data and unsupported future schemas are never overwritten', async () => {
  const storage = fakeStorage([{ title: 'Bad', text: 123 }]);
  await assert.rejects(createLibrary(storage).get(), /both strings/);
  assert.equal(storage.data.library, undefined);
  storage.data.library = { schemaVersion: 999, revision: 1, prompts: [a] };
  await assert.rejects(createLibrary(storage).mutate({ type: 'create', prompt: b }), /unsupported format/);
  assert.equal(storage.data.library.schemaVersion, 999);
});

test('large prompts beyond the former sync item quota work', async () => {
  const large = { ...a, text: 'x'.repeat(30_000) };
  const repo = createLibrary(fakeStorage([]));
  await repo.mutate({ type: 'create', prompt: large });
  assert.equal((await repo.get()).prompts[0].text.length, 30_000);
});
