import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('.', import.meta.url));
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

// Cleaning first prevents stale assets and removed permissions shipping unnoticed.
await rm(resolve(root, 'dist'), { recursive: true, force: true });
for (const browser of ['chrome', 'firefox']) {
  const output = resolve(root, 'dist', browser);
  const manifest = JSON.parse(await readFile(resolve(root, `manifest.${browser}.json`), 'utf8'));
  if (manifest.version !== packageJson.version) throw new Error(`Version mismatch in ${browser} manifest.`);
  await mkdir(resolve(output, 'sidebar'), { recursive: true });
  await cp(resolve(root, `manifest.${browser}.json`), resolve(output, 'manifest.json'));
  await cp(resolve(root, 'src/theme.css'), resolve(output, 'theme.css'));
  await cp(resolve(root, 'src/icons'), resolve(output, 'icons'), { recursive: true });
  for (const file of ['sidebar.html', 'sidebar.css']) {
    await cp(resolve(root, 'src/sidebar', file), resolve(output, 'sidebar', file));
  }
  await build({
    absWorkingDir: root,
    entryPoints: ['src/background.js', 'src/content.js', 'src/sidebar/sidebar.js'],
    outbase: 'src',
    outdir: output,
    bundle: true,
    format: 'iife',
    charset: 'utf8',
    legalComments: 'none',
    target: browser === 'chrome' ? 'chrome116' : 'firefox142',
    loader: { '.css': 'text' },
  });
  console.log(`Built dist/${browser} (${packageJson.version})`);
}
