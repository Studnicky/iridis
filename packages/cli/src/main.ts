#!/usr/bin/env node
import { CliExitError } from '@studnicky/errors';

import { Cli } from './Cli.ts';

const configPath = process.argv[2];

if (configPath === undefined) {
  process.stderr.write('Usage: iridis <config.json>\n');
  process.exit(1);
}

try {
  await new Cli().run(configPath);
  process.exit(0);
} catch (error) {
  const message  = error instanceof Error ? error.message : String(error);
  const exitCode = error instanceof CliExitError ? error.exitCode : 1;
  process.stderr.write(`Error: ${message}\n`);
  process.exit(exitCode);
}
