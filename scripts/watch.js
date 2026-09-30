import { watch } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { context, formatMessages } from 'esbuild';
import { cssBuildOptions, jsBuildOptions } from './build.config.js';

const colors = {
  yellow: '\u001B[33m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  reset: '\u001B[0m',
};

const contentByPath = new Map();
const pendingChanges = new Map();
const changedDirectories = new Set();
let changeTimer;

function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

async function indexDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await indexDirectory(path);
    } else if (entry.isFile()) {
      contentByPath.set(path, await readFile(path));
    }
  }
}

for (const sourceDirectory of ['src/js', 'src/css']) {
  const absoluteDirectory = fileURLToPath(new URL(`../${sourceDirectory}`, import.meta.url));
  await indexDirectory(absoluteDirectory);

  const watcher = watch(absoluteDirectory, { recursive: true });
  watcher.on('change', (_eventType, filename) => {
    if (!filename) return;
    const path = join(absoluteDirectory, filename.toString());
    pendingChanges.set(path, sourceDirectory);

    clearTimeout(changeTimer);
    changeTimer = setTimeout(async () => {
      for (const [changedPath, directory] of pendingChanges) {
        const content = await readFile(changedPath).catch(() => null);
        const previousContent = contentByPath.get(changedPath);
        if (content && previousContent?.equals(content)) continue;
        if (!content && !previousContent) continue;

        if (content) contentByPath.set(changedPath, content);
        else contentByPath.delete(changedPath);

        changedDirectories.add(directory);
        const file = relative(fileURLToPath(new URL('../', import.meta.url)), changedPath);
        console.log(colorize(`Changed: ${file}`, colors.yellow));
      }
      pendingChanges.clear();
    }, 120);
  });
}

function createWatchPlugin(outfile) {
  let initialBuild = true;

  return {
    name: 'watch-logging',
    setup(build) {
      build.onEnd(async (result) => {
        const sourceDirectory = outfile.endsWith('.css') ? 'src/css' : 'src/js';
        const wasInitialBuild = initialBuild;
        initialBuild = false;
        const hasDiagnostics = result.warnings.length > 0 || result.errors.length > 0;

        if (!hasDiagnostics) {
          await Promise.all(
            result.outputFiles.map((outputFile) => writeFile(outputFile.path, outputFile.contents)),
          );
        }

        // Let the filesystem watcher compare contents and print changed paths first.
        await new Promise((resolve) => setTimeout(resolve, 180));

        for (const warning of result.warnings) {
          const [formatted] = await formatMessages([warning], {
            kind: 'warning',
            color: false,
          });
          console.warn(`${colorize('Warning:', colors.red)}\n${formatted}`);
        }
        for (const error of result.errors) {
          const [formatted] = await formatMessages([error], {
            kind: 'error',
            color: false,
          });
          console.error(`${colorize('Error:', colors.red)}\n${formatted}`);
        }

        if (
          !wasInitialBuild &&
          !hasDiagnostics &&
          changedDirectories.delete(sourceDirectory)
        ) {
          console.log(colorize(`Rebuilt: ${outfile}`, colors.green));
        }
      });
    },
  };
}

const contexts = await Promise.all(
  [jsBuildOptions, cssBuildOptions].map((options) =>
    context({
      ...options,
      write: false,
      logLevel: 'silent',
      plugins: [createWatchPlugin(options.outfile)],
    }),
  ),
);

await Promise.all(contexts.map((buildContext) => buildContext.watch()));
console.log('Watching src/js and src/css. Press Ctrl+C to stop.');
