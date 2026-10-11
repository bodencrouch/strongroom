// Bundles the CLI and the shared TypeScript it imports into one Node file.
import { build } from 'esbuild';
import { chmodSync } from 'node:fs';
import { resolve } from 'node:path';

const cli = resolve(import.meta.dirname, '../apps/cli');
const outfile = resolve(cli, 'dist/strongroom.mjs');

await build({
  entryPoints: [resolve(cli, 'src/index.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
  // index.ts already starts with a shebang, which esbuild keeps. This banner is not added twice.
  logLevel: 'info',
});
chmodSync(outfile, 0o755);
