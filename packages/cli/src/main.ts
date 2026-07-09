#!/usr/bin/env node
import { CliExitError } from '@studnicky/errors';

import { Cli } from './Cli.ts';

const configPath = process.argv[2];

if (configPath === undefined) {
  process.stderr.write('Usage: iridis <config.json>\n');
  process.exit(1);
}

new Cli().run(configPath)
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    const message  = err instanceof Error ? err.message : String(err);
    const exitCode = err instanceof CliExitError ? err.exitCode : 1;
    process.stderr.write(`Error: ${message}\n`);
    process.exit(exitCode);
  });
