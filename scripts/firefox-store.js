import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { verifyFirefox, firefoxSubmissionState } from './lib/firefox-store.js';

try {
  const operation = process.argv[2];
  if (!['verify', 'publish'].includes(operation)) throw new Error('Usage: node scripts/firefox-store.js verify|publish [validated ZIP] [reviewer source ZIP]');
  const manifest = JSON.parse(await readFile(new URL('../manifest.firefox.json', import.meta.url), 'utf8'));
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const auth = { issuer: process.env.AMO_JWT_ISSUER, secret: process.env.AMO_JWT_SECRET, version, addonId: manifest.browser_specific_settings.gecko.id };
  const status = await verifyFirefox(auth);
  console.log(JSON.stringify({ store: 'firefox', ...status }));
  const decision = operation === 'publish' ? firefoxSubmissionState(status, version) : 'verify';
  if (decision.startsWith('already-')) {
    console.log(`Firefox ${version}: ${decision}; no duplicate upload.`);
  } else if (decision === 'upload') {
    if (!process.argv[3] || !process.argv[4]) throw new Error('Pass both the validated Firefox ZIP and the reviewer source ZIP.');
    const zip = resolve(process.argv[3]);
    const source = resolve(process.argv[4]);
    await readFile(source); // Fail before submitting if the source archive is absent.
    const directory = await mkdtemp(join(tmpdir(), 'souffleur-firefox-publish-'));
    try {
      execFileSync('unzip', ['-q', zip, '-d', directory]);
      const bundled = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      if (bundled.version !== version || bundled.browser_specific_settings.gecko.id !== auth.addonId) throw new Error('The validated Firefox ZIP does not match the release manifest.');
      const { default: webExt } = await import('web-ext');
      await webExt.cmd.sign({ sourceDir: directory, artifactsDir: resolve('artifacts/firefox-signed'), apiKey: auth.issuer, apiSecret: auth.secret, channel: 'listed', uploadSourceCode: source, approvalTimeout: 0 }, { shouldExitProgram: false });
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
