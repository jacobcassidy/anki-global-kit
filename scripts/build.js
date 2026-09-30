import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cssBuildOptions, jsBuildOptions } from './build.config.js';

await Promise.all([build(jsBuildOptions), build(cssBuildOptions)]);
const root = fileURLToPath(new URL('../', import.meta.url));
const templates = `${root}addon/templates/note-types`;
mkdirSync(templates, { recursive: true });
cpSync(`${root}docs/reference/note-types`, templates, { recursive: true });
console.log('Built add-on assets and reference templates.');
