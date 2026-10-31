import { readFile, appendFile } from 'node:fs/promises';

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Store releases require a numeric package version.');
const release = process.env.GITHUB_EVENT_NAME === 'release';
if (release && (event.release.tag_name !== `v${version}` || event.release.prerelease || event.release.draft)) throw new Error('Publish a stable GitHub release tagged v<package version>.');
if (!release && process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Run store verification or publication from main.');
const operation = release ? 'publish' : event.inputs?.operation ?? 'verify';
if (!['verify', 'publish'].includes(operation)) throw new Error('Unknown store operation.');
await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\noperation=${operation}\n`);
