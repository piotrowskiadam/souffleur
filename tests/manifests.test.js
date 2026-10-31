import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
test('release versions, privacy declarations and browser adapters remain consistent', async () => {
  const pkg = await readJson('package.json');
  const chrome = await readJson('manifest.chrome.json');
  const firefox = await readJson('manifest.firefox.json');
  for (const manifest of [chrome, firefox]) {
    assert.equal(manifest.version, pkg.version);
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.host_permissions, undefined);
    assert.equal(manifest.permissions.includes('scripting'), false);
    assert.equal(manifest.permissions.includes('tabs'), false);
    assert.deepEqual(manifest.content_scripts[0].js, ['content.js']);
  }
  assert.equal(chrome.background.service_worker, 'background.js');
  assert.deepEqual(firefox.background.scripts, ['background.js']);
  assert.deepEqual(firefox.browser_specific_settings.gecko.data_collection_permissions, { required: ['none'] });
  const lock = await readJson('package-lock.json');
  assert.equal(lock.packages[''].version, pkg.version);
});
