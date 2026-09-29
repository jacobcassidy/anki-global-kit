import { context } from 'esbuild';
import { cssBuildOptions, jsBuildOptions } from './build.config.js';

const contexts = await Promise.all([context(jsBuildOptions), context(cssBuildOptions)]);
await Promise.all(contexts.map((buildContext) => buildContext.watch()));
console.log('Watching global-kit/src/js and global-kit/src/css. Press Ctrl+C to stop.');
