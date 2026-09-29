import { build } from 'esbuild';
import { cssBuildOptions, jsBuildOptions } from './build.config.js';

await Promise.all([build(jsBuildOptions), build(cssBuildOptions)]);
console.log('Built minified collection.media/_global.min.js and _global.min.css');
