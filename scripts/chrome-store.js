import { readFile } from 'node:fs/promises';
import { createChromeStore, revisionVersions } from './lib/chrome-store.js';

try {
  const operation = process.argv[2];
  if (!['verify', 'publish'].includes(operation)) throw new Error('Usage: node scripts/chrome-store.js verify|publish [validated ZIP]');
  const store = createChromeStore({
    accessToken: process.env.GOOGLE_ACCESS_TOKEN,
    publisherId: process.env.CHROME_PUBLISHER_ID,
    extensionId: process.env.CHROME_EXTENSION_ID,
  });
  if (operation === 'verify') {
    const state = await store.status();
    console.log(JSON.stringify({ store: 'chrome', authenticated: true, publishedVersions: revisionVersions(state.publishedItemRevisionStatus), submittedVersions: revisionVersions(state.submittedItemRevisionStatus), takenDown: Boolean(state.takenDown) }));
  } else {
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    if (!process.argv[3]) throw new Error('Pass the validated Chrome ZIP path.');
    console.log(JSON.stringify(await store.publish({ version, zip: await readFile(process.argv[3]) })));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
