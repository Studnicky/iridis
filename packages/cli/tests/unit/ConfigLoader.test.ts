/**
 * ConfigLoader — scenario-matrix suite.
 *
 * Subject: `ConfigLoader` (reads JSON from disk, validates against CliConfigSchema).
 * Each cell covers one concern; scenarios exhaust the happy / edge / unhappy matrix.
 *
 * Cells:
 *   1. file-io       — reads file from disk, parses JSON, returns typed config
 *   2. schema-fields — required-field presence enforced by schema validator
 *   3. schema-types  — field type constraints enforced (arrays, booleans, objects)
 *   4. edge-content  — unusual but valid config content accepted
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join }                    from 'node:path';
import { tmpdir }                  from 'node:os';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { ConfigLoader } from '@studnicky/iridis-cli';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function writeTmpConfig(data: unknown): Promise<{ path: string; dir: string }> {
  const dir  = await mkdtemp(join(tmpdir(), 'iridis-cfg-'));
  const path = join(dir, 'config.json');
  await writeFile(path, JSON.stringify(data), 'utf-8');
  return { path, dir };
}

async function loadAndCleanup(data: unknown): Promise<unknown> {
  const { path, dir } = await writeTmpConfig(data);
  try {
    return await new ConfigLoader().load(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function validBase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'input':    { 'colors': ['#8b5cf6'] },
    'pipeline': ['intake:hex'],
    'output':   { 'directory': '/tmp', 'files': {} },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cell 1 — file I/O: reads a JSON file from disk and returns typed config
//
// ConfigLoader.load() must:
//   - read the file at the given path
//   - parse its JSON content
//   - validate and return the typed CliConfigInterface
//   - propagate OS-level errors (missing file, non-JSON content)
// ---------------------------------------------------------------------------

interface FileIoInput {
  readonly setup: () => Promise<{ path: string; dir: string } | null>;
}
interface FileIoOutput {
  readonly result: unknown;
}

const fileIoScenarios: readonly ScenarioInterface<FileIoInput, FileIoOutput>[] = [
  {
    name: 'reads valid JSON config from disk and returns typed object',
    kind: 'happy',
    input: {
      setup: () => writeTmpConfig(validBase()),
    },
    async assert(output, error) {
      assert.strictEqual(error,   undefined,    '[cell=1, scenario=reads-valid] no throw');
      assert.ok(output,                         '[cell=1, scenario=reads-valid] output present');
      assert.ok(typeof output!.result === 'object' && output!.result !== null,
        '[cell=1, scenario=reads-valid] result is object');
    },
  },
  {
    name: 'preserves all top-level fields in the returned config',
    kind: 'happy',
    input: {
      setup: () => writeTmpConfig(validBase({
        'enableStylesheet': true,
        'enableVscode':     false,
        'pipeline':         ['intake:hex', 'resolve:roles'],
        'output':           { 'directory': '/tmp/out', 'files': { 'stylesheet:cssVars': 'theme.css' } },
      })),
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=full-fields] no throw');
      const cfg = output!.result as Record<string, unknown>;
      assert.deepStrictEqual(
        (cfg['input'] as Record<string, unknown>)['colors'],
        ['#8b5cf6'],
        '[cell=1, scenario=full-fields] input.colors preserved',
      );
      assert.deepStrictEqual(cfg['pipeline'], ['intake:hex', 'resolve:roles'],
        '[cell=1, scenario=full-fields] pipeline preserved');
      assert.strictEqual((cfg['output'] as Record<string, unknown>)['directory'], '/tmp/out',
        '[cell=1, scenario=full-fields] output.directory preserved');
      assert.strictEqual(cfg['enableStylesheet'], true,
        '[cell=1, scenario=full-fields] enableStylesheet preserved');
    },
  },
  {
    name: 'throws on missing file (ENOENT)',
    kind: 'unhappy',
    input: {
      setup: async () => null,
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=enoent] expected throw');
      assert.match((error as NodeJS.ErrnoException).code ?? (error as Error).message, /ENOENT|no such file/i,
        '[cell=1, scenario=enoent] surfaces file-not-found error');
    },
  },
  {
    name: 'throws on non-JSON file content',
    kind: 'unhappy',
    input: {
      setup: async () => {
        const dir  = await mkdtemp(join(tmpdir(), 'iridis-cfg-'));
        const path = join(dir, 'config.json');
        await writeFile(path, 'not json at all }{', 'utf-8');
        return { path, dir };
      },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=bad-json] expected throw');
      assert.match((error as Error).message, /JSON|parse|Unexpected/i,
        '[cell=1, scenario=bad-json] reports JSON parse error');
    },
  },
];

new ScenarioRunner<FileIoInput, FileIoOutput>(
  'ConfigLoader :: cell-1 :: file-io',
  async (input) => {
    const ctx = await input.setup();
    if (ctx === null) {
      // ENOENT scenario: load from a guaranteed-absent path
      return { result: await new ConfigLoader().load('/tmp/__iridis_no_such_file_abc123.json') };
    }
    try {
      const result = await new ConfigLoader().load(ctx.path);
      return { result };
    } finally {
      await rm(ctx.dir, { recursive: true, force: true });
    }
  },
).run(fileIoScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — required-field schema enforcement
//
// CliConfigSchema declares `input`, `pipeline`, and `output` as required.
// Within `input`, `colors` is required. Within `output`, `directory` and
// `files` are required. Missing any of these MUST throw "Config invalid".
// ---------------------------------------------------------------------------

interface SchemaFieldInput {
  readonly data: unknown;
}
interface SchemaFieldOutput {
  readonly loaded: unknown;
}

const schemaFieldScenarios: readonly ScenarioInterface<SchemaFieldInput, SchemaFieldOutput>[] = [
  {
    name: 'valid config with all required fields accepted',
    kind: 'happy',
    input: { data: validBase() },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-required] no throw');
      assert.ok(output!.loaded,            '[cell=2, scenario=all-required] loaded non-null');
    },
  },
  {
    name: 'config missing top-level input throws Config invalid',
    kind: 'unhappy',
    input: {
      data: { 'pipeline': ['intake:hex'], 'output': { 'directory': '/tmp', 'files': {} } },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-input] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=missing-input] message says Config invalid');
    },
  },
  {
    name: 'config missing top-level pipeline throws Config invalid',
    kind: 'unhappy',
    input: {
      data: { 'input': { 'colors': ['#ff0000'] }, 'output': { 'directory': '/tmp', 'files': {} } },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-pipeline] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=missing-pipeline] message says Config invalid');
    },
  },
  {
    name: 'config missing top-level output throws Config invalid',
    kind: 'unhappy',
    input: {
      data: { 'input': { 'colors': ['#ff0000'] }, 'pipeline': ['intake:hex'] },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-output] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=missing-output] message says Config invalid');
    },
  },
  {
    name: 'config missing input.colors throws Config invalid',
    kind: 'unhappy',
    input: {
      data: { 'input': {}, 'pipeline': ['intake:hex'], 'output': { 'directory': '/tmp', 'files': {} } },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-colors] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=missing-colors] message says Config invalid');
    },
  },
  {
    name: 'config missing output.directory throws Config invalid',
    kind: 'unhappy',
    input: {
      data: { 'input': { 'colors': ['#ff0000'] }, 'pipeline': ['intake:hex'], 'output': { 'files': {} } },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-output-dir] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=missing-output-dir] message says Config invalid');
    },
  },
  {
    name: 'config missing output.files throws Config invalid',
    kind: 'unhappy',
    input: {
      data: { 'input': { 'colors': ['#ff0000'] }, 'pipeline': ['intake:hex'], 'output': { 'directory': '/tmp' } },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-output-files] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=missing-output-files] message says Config invalid');
    },
  },
  {
    name: 'non-object root value throws Config invalid',
    kind: 'unhappy',
    input: { data: 'not-an-object' },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=non-object] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=non-object] message says Config invalid');
    },
  },
  {
    name: 'null root throws Config invalid',
    kind: 'unhappy',
    input: { data: null },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=null-root] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=null-root] message says Config invalid');
    },
  },
  {
    name: 'array root throws Config invalid',
    kind: 'unhappy',
    input: { data: [1, 2, 3] },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=array-root] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=2, scenario=array-root] message says Config invalid');
    },
  },
];

new ScenarioRunner<SchemaFieldInput, SchemaFieldOutput>(
  'ConfigLoader :: cell-2 :: schema-fields',
  async (input) => {
    const loaded = await loadAndCleanup(input.data);
    return { loaded };
  },
).run(schemaFieldScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — field type and constraint enforcement
//
// CliConfigSchema enforces type constraints beyond mere presence:
//   - input.colors must be a non-empty array of strings (minItems:1)
//   - pipeline must be a non-empty array of strings (minItems:1)
//   - output.directory must be a string
//   - output.files must be an object (Record<string,string>)
//   - enable* flags must be boolean when present
// ---------------------------------------------------------------------------

const schemaTypeScenarios: readonly ScenarioInterface<SchemaFieldInput, SchemaFieldOutput>[] = [
  {
    name: 'input.colors empty array rejected (minItems:1)',
    kind: 'unhappy',
    input: {
      data: validBase({ 'input': { 'colors': [] } }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=colors-empty] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=colors-empty] message says Config invalid');
    },
  },
  {
    name: 'input.colors non-array rejected',
    kind: 'unhappy',
    input: {
      data: validBase({ 'input': { 'colors': '#ff0000' } }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=colors-not-array] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=colors-not-array] message says Config invalid');
    },
  },
  {
    name: 'pipeline empty array rejected (minItems:1)',
    kind: 'unhappy',
    input: {
      data: validBase({ 'pipeline': [] }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=pipeline-empty] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=pipeline-empty] message says Config invalid');
    },
  },
  {
    name: 'pipeline non-array rejected',
    kind: 'unhappy',
    input: {
      data: validBase({ 'pipeline': 'intake:hex' }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=pipeline-not-array] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=pipeline-not-array] message says Config invalid');
    },
  },
  {
    name: 'output.files non-object rejected',
    kind: 'unhappy',
    input: {
      data: validBase({ 'output': { 'directory': '/tmp', 'files': 'bad' } }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=files-not-object] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=files-not-object] message says Config invalid');
    },
  },
  {
    name: 'enable flag as non-boolean rejected',
    kind: 'unhappy',
    input: {
      data: validBase({ 'enableStylesheet': 'yes' }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=enable-not-bool] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=enable-not-bool] message says Config invalid');
    },
  },
  {
    name: 'output.directory non-string rejected',
    kind: 'unhappy',
    input: {
      data: validBase({ 'output': { 'directory': 123, 'files': {} } }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=dir-not-string] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=3, scenario=dir-not-string] message says Config invalid');
    },
  },
];

new ScenarioRunner<SchemaFieldInput, SchemaFieldOutput>(
  'ConfigLoader :: cell-3 :: schema-types',
  async (input) => {
    const loaded = await loadAndCleanup(input.data);
    return { loaded };
  },
).run(schemaTypeScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — edge content: unusual but valid configs accepted
//
// The loader must accept valid configs with:
//   - unicode characters in string values
//   - unicode in file paths (output.directory)
//   - multiple colors in input.colors
//   - all optional enable* flags set to true simultaneously
//   - deeply-nested metadata object
//   - output.files with multiple keys
//   - empty metadata object
//   - contrast object present
// ---------------------------------------------------------------------------

interface EdgeInput {
  readonly data:  unknown;
  readonly check: (loaded: unknown) => void;
}
interface EdgeOutput {
  readonly loaded: unknown;
  readonly check:  (loaded: unknown) => void;
}

const edgeScenarios: readonly ScenarioInterface<EdgeInput, EdgeOutput>[] = [
  {
    name: 'unicode color strings in input.colors accepted',
    kind: 'edge',
    input: {
      data: validBase({ 'input': { 'colors': ['#8b5cf6', 'oklch(50% 0.2 270)', 'rgb(139,92,246)'] } }),
      check: (loaded) => {
        const cfg = loaded as Record<string, unknown>;
        const colors = (cfg['input'] as Record<string, unknown>)['colors'] as string[];
        assert.strictEqual(colors.length, 3,
          '[cell=4, scenario=multi-colors] three colors preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=multi-colors] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'unicode path in output.directory accepted',
    kind: 'edge',
    input: {
      data: validBase({ 'output': { 'directory': '/tmp/お出力/données', 'files': {} } }),
      check: (loaded) => {
        const cfg = loaded as Record<string, unknown>;
        const dir = (cfg['output'] as Record<string, unknown>)['directory'];
        assert.strictEqual(dir, '/tmp/お出力/données',
          '[cell=4, scenario=unicode-path] unicode directory preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=unicode-path] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'all enable flags set to true simultaneously accepted',
    kind: 'edge',
    input: {
      data: validBase({
        'enableVscode':     true,
        'enableStylesheet': true,
        'enableTailwind':   true,
        'enableImage':      true,
        'enableContrast':   true,
        'enableCapacitor':  true,
        'enableRdf':        true,
      }),
      check: (loaded) => {
        const cfg = loaded as Record<string, unknown>;
        assert.strictEqual(cfg['enableVscode'],     true, '[cell=4, scenario=all-flags] enableVscode');
        assert.strictEqual(cfg['enableRdf'],        true, '[cell=4, scenario=all-flags] enableRdf');
        assert.strictEqual(cfg['enableStylesheet'], true, '[cell=4, scenario=all-flags] enableStylesheet');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=all-flags] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'output.files with multiple entries accepted',
    kind: 'edge',
    input: {
      data: validBase({
        'output': {
          'directory': '/tmp',
          'files': {
            'stylesheet:cssVars': 'theme.css',
            'tailwind:theme':     'tailwind.config.js',
            'vscode:themeJson':   'settings.json',
          },
        },
      }),
      check: (loaded) => {
        const cfg   = loaded as Record<string, unknown>;
        const files = (cfg['output'] as Record<string, unknown>)['files'] as Record<string, string>;
        assert.strictEqual(Object.keys(files).length, 3,
          '[cell=4, scenario=multi-files] three output files preserved');
        assert.strictEqual(files['stylesheet:cssVars'], 'theme.css',
          '[cell=4, scenario=multi-files] stylesheet:cssVars key preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=multi-files] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'metadata object with nested structure accepted',
    kind: 'edge',
    input: {
      data: validBase({
        'input': {
          'colors':   ['#8b5cf6'],
          'metadata': { 'seed': 'violet', 'theme': 'dark', 'author': 'test suite' },
        },
      }),
      check: (loaded) => {
        const cfg      = loaded as Record<string, unknown>;
        const metadata = (cfg['input'] as Record<string, unknown>)['metadata'] as Record<string, string>;
        assert.strictEqual(metadata['seed'], 'violet',
          '[cell=4, scenario=metadata] seed preserved');
        assert.strictEqual(metadata['theme'], 'dark',
          '[cell=4, scenario=metadata] theme preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=metadata] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'contrast object in input accepted',
    kind: 'edge',
    input: {
      data: validBase({
        'input': {
          'colors':   ['#8b5cf6'],
          'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
        },
      }),
      check: (loaded) => {
        const cfg      = loaded as Record<string, unknown>;
        const contrast = (cfg['input'] as Record<string, unknown>)['contrast'] as Record<string, string>;
        assert.strictEqual(contrast['level'], 'AA',
          '[cell=4, scenario=contrast] level preserved');
        assert.strictEqual(contrast['algorithm'], 'wcag21',
          '[cell=4, scenario=contrast] algorithm preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=contrast] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'single-element pipeline accepted',
    kind: 'edge',
    input: {
      data: validBase({ 'pipeline': ['intake:hex'] }),
      check: (loaded) => {
        const cfg = loaded as Record<string, unknown>;
        assert.deepStrictEqual(cfg['pipeline'], ['intake:hex'],
          '[cell=4, scenario=single-pipeline] single-item pipeline preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=single-pipeline] no throw');
      output!.check(output!.loaded);
    },
  },
  {
    name: 'empty output.files object accepted',
    kind: 'edge',
    input: {
      data: validBase({ 'output': { 'directory': '/tmp', 'files': {} } }),
      check: (loaded) => {
        const cfg   = loaded as Record<string, unknown>;
        const files = (cfg['output'] as Record<string, unknown>)['files'] as Record<string, string>;
        assert.deepStrictEqual(files, {},
          '[cell=4, scenario=empty-files] empty files object preserved');
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=empty-files] no throw');
      output!.check(output!.loaded);
    },
  },
];

new ScenarioRunner<EdgeInput, EdgeOutput>(
  'ConfigLoader :: cell-4 :: edge-content',
  async (input) => {
    const loaded = await loadAndCleanup(input.data);
    return { loaded, check: input.check };
  },
).run(edgeScenarios);
