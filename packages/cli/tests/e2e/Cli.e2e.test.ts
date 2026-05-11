/**
 * CLI end-to-end tests.
 *
 * `cli` is the iridis binary, not a plugin: these tests exercise Cli.run with
 * a minimal config, asserting the dynamic plugin resolver loads the requested
 * plugin and the OutputWriter writes outputs to disk.
 */
import { test }              from 'node:test';
import assert                 from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join }               from 'node:path';
import { tmpdir }             from 'node:os';

import { Cli, ConfigLoader, PluginResolver } from '@studnicky/iridis-cli';
import type { CliConfigInterface }            from '@studnicky/iridis-cli/types';

test('Cli e2e :: shape :: classes are constructible', () => {
  assert.ok(new Cli());
  assert.ok(new ConfigLoader());
  assert.ok(new PluginResolver());
});

test('Cli e2e :: happy :: ConfigLoader.load reads a JSON config from disk', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'iridis-cli-test-'));
  try {
    const cfg: CliConfigInterface = {
      'input':            { 'colors': ['#8b5cf6'] },
      'enableStylesheet': true,
      'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
      'output':           { 'directory': dir, 'files': { 'cssVars': 'theme.css.json' } },
    };
    const cfgPath = join(dir, 'config.json');
    await writeFile(cfgPath, JSON.stringify(cfg, null, 2), 'utf-8');

    const loaded = await new ConfigLoader().load(cfgPath);
    assert.deepStrictEqual(loaded.input.colors, ['#8b5cf6']);
    assert.strictEqual(loaded.enableStylesheet, true);
  } finally {
    await rm(dir, { 'recursive': true, 'force': true });
  }
});

test('Cli e2e :: happy :: PluginResolver dynamically imports stylesheetPlugin when enableStylesheet is true', async () => {
  const cfg: CliConfigInterface = {
    'input':            { 'colors': ['#8b5cf6'] },
    'enableStylesheet': true,
    'pipeline':         ['intake:hex'],
    'output':           { 'directory': '.', 'files': {} },
  };

  const plugins = await new PluginResolver().resolve(cfg);
  assert.strictEqual(plugins.length, 1);
  assert.strictEqual(plugins[0]?.name, 'stylesheet');
});

test('Cli e2e :: happy :: full Cli.run produces an output file on disk', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'iridis-cli-test-'));
  try {
    const cfg: CliConfigInterface = {
      'input':            { 'colors': ['#8b5cf6'] },
      'enableStylesheet': true,
      'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
      'output':           { 'directory': dir, 'files': { 'cssVars': 'theme.json' } },
    };
    const cfgPath = join(dir, 'config.json');
    await writeFile(cfgPath, JSON.stringify(cfg, null, 2), 'utf-8');

    const result = await new Cli().run(cfgPath);
    assert.strictEqual(result.outputsWritten.length, 1);
    const written = await readFile(result.outputsWritten[0]!, 'utf-8');
    const parsed  = JSON.parse(written) as { 'full': string };
    assert.ok(parsed.full.includes(':root'), 'emitted CSS contains :root block');
  } finally {
    await rm(dir, { 'recursive': true, 'force': true });
  }
});
