#!/usr/bin/env node
import { Cli } from './Cli.ts';

const configPath = process.argv[2];

if (!configPath) {
  process.stderr.write('Usage: iridis <config.json>\n');
  process.exit(1);
}

new Cli().run(configPath)
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  });
