import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import webExt from 'web-ext';
import '../build.js';

const root = fileURLToPath(new URL('..', import.meta.url));
for (const browser of ['chrome', 'firefox']) {
  await webExt.cmd.build({
    sourceDir: resolve(root, 'dist', browser),
    artifactsDir: resolve(root, 'artifacts'),
    filename: `souffleur-${browser}-{version}.zip`,
    overwriteDest: true,
  }, { shouldExitProgram: false });
}
