import { build } from 'esbuild';
import { cardsCssBuildOptions, cardsJsBuildOptions, editorJsBuildOptions } from './build.config.js';

await Promise.all([build(cardsJsBuildOptions), build(cardsCssBuildOptions), build(editorJsBuildOptions)]);
console.log('Built card and editor assets.');
