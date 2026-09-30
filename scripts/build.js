import { build } from 'esbuild';
import { cardsCssBuildOptions, cardsJsBuildOptions } from './build.config.js';

await Promise.all([build(cardsJsBuildOptions), build(cardsCssBuildOptions)]);
console.log('Built card assets.');
