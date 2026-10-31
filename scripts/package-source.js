import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
// Archive tracked review/build inputs only; no credentials, historical ZIPs or profiles.
const inputs = ['src', 'scripts', 'tests', '.github', '.gitignore', 'build.js', 'manifest.chrome.json', 'manifest.firefox.json', 'package.json', 'package-lock.json', 'playwright.config.js', 'README.md', 'DEVELOPERS.md', 'ARCHITECTURE.md', 'DESIGN.md', 'PRODUCT.md', 'CHANGELOG.md', 'LICENSE', 'docs'];
const dirty = execFileSync('git', ['status', '--porcelain', '--', ...inputs], { cwd: root, encoding: 'utf8' });
if (dirty.trim()) throw new Error('Commit source/build changes before packaging reviewer source, so it matches the validated release commit.');
await mkdir(resolve(root, 'artifacts'), { recursive: true });
const output = resolve(root, 'artifacts', `souffleur-source-${version}.zip`);
execFileSync('git', ['archive', '--format=zip', `--output=${output}`, 'HEAD', '--', ...inputs], { cwd: root });
console.log(`Reviewer source: ${output}`);
