import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const addonWeb = `${root}addon/web`;

export const cardsJsBuildOptions = {
  entryPoints: [`${root}src/cards/js/index.js`],
  outfile: `${addonWeb}/_anki-global-kit.min.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  legalComments: 'none',
  minify: true,
  banner: { js: 'var hasMyCustomScript = true;' },
};

export const cardsCssBuildOptions = {
  entryPoints: [`${root}src/cards/css/index.css`],
  outfile: `${addonWeb}/_anki-global-kit.min.css`,
  bundle: true,
  legalComments: 'none',
  minify: true,
  external: ['*.woff', '*.woff2'],
};

export const editorJsBuildOptions = {
  entryPoints: [`${root}src/editor/js/index.js`],
  outfile: `${root}addon/desktop/editor/assets/editor.min.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'none',
  minify: true,
};
