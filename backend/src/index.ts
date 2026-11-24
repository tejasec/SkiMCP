#!/usr/bin/env node
import { runCli } from './cli';

export * from './scanner';
export { runCli } from './cli';

// Execute CLI dispatcher if invoked directly from command line
if (
  process.argv[1] &&
  (process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('cli.js') ||
    process.argv[1].endsWith('skimcp'))
) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
