import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export const jsBuildOptions = {
  entryPoints: [`${root}global-kit/src/js/index.js`],
  outfile: `${root}collection.media/_global.min.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  legalComments: 'none',
  minify: true,
  banner: { js: 'var hasMyCustomScript = true;' },
};

export const cssBuildOptions = {
  entryPoints: [`${root}global-kit/src/css/index.css`],
  outfile: `${root}collection.media/_global.min.css`,
  bundle: true,
  legalComments: 'none',
  minify: true,
  external: ['*.woff', '*.woff2'],
};
