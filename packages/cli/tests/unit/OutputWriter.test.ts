/**
 * OutputWriter — scenario-matrix suite.
 *
 * Subject: `OutputWriter` (writes plugin output slots to the configured
 * output directory, resolving an untrusted filename against the directory).
 *
 * Cells:
 *   1. containment — traversal / absolute-path filenames are rejected before
 *      any write happens, and legitimate flat/nested filenames still write.
 */

import type { CliConfigInterface }    from '@studnicky/iridis-cli/types';
import type { PaletteStateInterface } from '@studnicky/iridis/model';

import { OutputWriter } from '@studnicky/iridis-cli';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class OutputWriterTestFixture {
  static async createDirectory(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'iridis-out-'));
    return directory;
  }

  static state(): PaletteStateInterface {
    return {
      'colors': [],
      'input': {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     undefined,
        'runtime':   undefined
      },
      'metadata': {},
      'outputs':  { 'stylesheet:cssVars': 'content' },
      'roles':    {},
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
      'variants': {}
    };
  }

  static config(directory: string, filename: string): CliConfigInterface {
    return {
      'enableCapacitor':  undefined,
      'enableContrast':   undefined,
      'enableImage':      undefined,
      'enableRdf':        undefined,
      'enableStylesheet': undefined,
      'enableTailwind':   undefined,
      'enableVscode':     undefined,
      'input': {
        'bypass':    undefined,
        'colors':    ['#000000'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     undefined,
        'runtime':   undefined
      },
      'output':   { 'directory': directory, 'files': { 'stylesheet:cssVars': filename } },
      'pipeline': ['x']
    };
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — containment: traversal and absolute-path filenames are rejected
// (with nothing written into the temp directory), while legitimate flat and
// nested filenames still write successfully.
//
// Each scenario owns a fresh temp directory, created up front so the
// `assert` callback (which runs after `write()` returns or throws) can read
// the directory's contents. All temp directories are removed once the
// whole suite has finished.
// ---------------------------------------------------------------------------

type ContainmentOutputType = {
  readonly 'written': readonly string[];
};

const traversalDirectory = await OutputWriterTestFixture.createDirectory();
const absoluteDirectory  = await OutputWriterTestFixture.createDirectory();
const flatDirectory      = await OutputWriterTestFixture.createDirectory();
const nestedDirectory    = await OutputWriterTestFixture.createDirectory();

const containmentScenarios: readonly ScenarioInterface<CliConfigInterface, ContainmentOutputType>[] = [
  {
    'assert': async function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=traversal] expected throw');
      assert.match(error.message, /escapes the configured output directory/,
        '[cell=1, scenario=traversal] message names the escape');
      const entries = await readdir(traversalDirectory);
      assert.deepStrictEqual(entries, [],
        '[cell=1, scenario=traversal] nothing was written into the configured output directory');
    },
    'input': OutputWriterTestFixture.config(traversalDirectory, '../../../../etc/passwd'),
    'kind': 'unhappy',
    'name': 'traversal filename is rejected and nothing is written'
  },
  {
    'assert': async function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=absolute] expected throw');
      assert.match(error.message, /escapes the configured output directory/,
        '[cell=1, scenario=absolute] message names the escape');
      const entries = await readdir(absoluteDirectory);
      assert.deepStrictEqual(entries, [],
        '[cell=1, scenario=absolute] nothing was written into the configured output directory');
    },
    'input': OutputWriterTestFixture.config(absoluteDirectory, '/etc/hostname'),
    'kind': 'unhappy',
    'name': 'absolute-path filename is rejected and nothing is written'
  },
  {
    'assert': async function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=flat] no throw');
      assert.ok(output !== undefined,      '[cell=1, scenario=flat] output present');
      const written = await readFile(join(flatDirectory, 'theme.css'), 'utf-8');
      assert.strictEqual(written, 'content',
        '[cell=1, scenario=flat] flat filename content round-trips');
    },
    'input': OutputWriterTestFixture.config(flatDirectory, 'theme.css'),
    'kind': 'happy',
    'name': 'legitimate flat filename writes successfully'
  },
  {
    'assert': async function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=nested] no throw');
      assert.ok(output !== undefined,      '[cell=1, scenario=nested] output present');
      const written = await readFile(join(nestedDirectory, 'nested', 'file.css'), 'utf-8');
      assert.strictEqual(written, 'content',
        '[cell=1, scenario=nested] nested filename content round-trips');
    },
    'input': OutputWriterTestFixture.config(nestedDirectory, 'nested/file.css'),
    'kind': 'happy',
    'name': 'legitimate nested filename still writes successfully (not a false-positive traversal)'
  }
];

try {
  await new ScenarioRunner<CliConfigInterface, ContainmentOutputType>(
    'OutputWriter :: cell-1 :: containment',
    async (config) => {
      const written = await new OutputWriter().write(OutputWriterTestFixture.state(), config);
      return { 'written': written };
    }
  ).run(containmentScenarios);
} finally {
  await rm(traversalDirectory, { 'force': true, 'recursive': true });
  await rm(absoluteDirectory, { 'force': true, 'recursive': true });
  await rm(flatDirectory, { 'force': true, 'recursive': true });
  await rm(nestedDirectory, { 'force': true, 'recursive': true });
}
