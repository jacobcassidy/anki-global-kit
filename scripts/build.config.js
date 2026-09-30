import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const addonWeb = `${root}addon/web`;

export const jsBuildOptions = {
  entryPoints: [`${root}src/js/index.js`],
  outfile: `${addonWeb}/_anki-global-kit.min.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  legalComments: 'none',
  minify: true,
  banner: { js: 'var hasMyCustomScript = true;' },
};

export const cssBuildOptions = {
  entryPoints: [`${root}src/css/index.css`],
  outfile: `${addonWeb}/_anki-global-kit.min.css`,
  bundle: true,
  legalComments: 'none',
  minify: true,
  external: ['*.woff', '*.woff2'],
};
