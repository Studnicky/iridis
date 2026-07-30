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

import type { CliConfigInterface } from '@studnicky/iridis-cli/types';
import type { JsonValueType } from '@studnicky/types';

import { ConfigLoader } from '@studnicky/iridis-cli';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir }                  from 'node:os';
import { join }                    from 'node:path';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

abstract class TemporaryConfig {
  abstract readonly 'directory': string;
  abstract readonly 'path':      string;
}

class ConfigLoaderTestFixture {
  static async writeTemporaryConfig(data: JsonValueType): Promise<TemporaryConfig> {
    const directory  = await mkdtemp(join(tmpdir(), 'iridis-cfg-'));
    const path = join(directory, 'config.json');
    await writeFile(path, JSON.stringify(data), 'utf-8');
    return { 'directory': directory, 'path': path };
  }

  static async loadAndCleanup(data: JsonValueType): Promise<CliConfigInterface> {
    const { directory, path } = await ConfigLoaderTestFixture.writeTemporaryConfig(data);
    try {
      return await new ConfigLoader().load(path);
    } finally {
      await rm(directory, { 'force': true, 'recursive': true });
    }
  }

  static validBase(overrides: Record<string, JsonValueType> = {}): JsonValueType {
    return {
      'input':    { 'colors': ['#8b5cf6'] },
      'output':   { 'directory': '/tmp', 'files': {} },
      'pipeline': ['intake:hex'],
      ...overrides
    };
  }
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

interface FileIoInputInterface {
  readonly 'setup': () => Promise<TemporaryConfig | null>;
}
interface FileIoOutputInterface {
  readonly 'result': CliConfigInterface;
}

const fileIoScenarios: readonly ScenarioInterface<FileIoInputInterface, FileIoOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,   undefined,    '[cell=1, scenario=reads-valid] no throw');
      assert.ok(output !== undefined,           '[cell=1, scenario=reads-valid] output present');
      assert.deepStrictEqual(output.result.pipeline, ['intake:hex'],
        '[cell=1, scenario=reads-valid] parsed pipeline returned');
    },
    'input': {
      'setup': () => { const result = ConfigLoaderTestFixture.writeTemporaryConfig(ConfigLoaderTestFixture.validBase()); return result; }
    },
    'kind': 'happy',
    'name': 'reads valid JSON config from disk and returns typed object'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=full-fields] no throw');
      assert.deepStrictEqual(
        output!.result.input.colors,
        ['#8b5cf6'],
        '[cell=1, scenario=full-fields] input.colors preserved'
      );
      assert.deepStrictEqual(output!.result.pipeline, ['intake:hex', 'resolve:roles'],
        '[cell=1, scenario=full-fields] pipeline preserved');
      assert.strictEqual(output!.result.output.directory, '/tmp/out',
        '[cell=1, scenario=full-fields] output.directory preserved');
      assert.strictEqual(output!.result.enableStylesheet, true,
        '[cell=1, scenario=full-fields] enableStylesheet preserved');
    },
    'input': {
      'setup': () => { const result = ConfigLoaderTestFixture.writeTemporaryConfig(ConfigLoaderTestFixture.validBase({
        'enableStylesheet': true,
        'enableVscode':     false,
        'output':           { 'directory': '/tmp/out', 'files': { 'stylesheet:cssVars': 'theme.css' } },
        'pipeline':         ['intake:hex', 'resolve:roles']
      })); return result; }
    },
    'kind': 'happy',
    'name': 'preserves all top-level fields in the returned config'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=enoent] expected throw');
      assert.match('code' in error && typeof error.code === 'string' ? error.code : error.message, /ENOENT|no such file/i,
        '[cell=1, scenario=enoent] surfaces file-not-found error');
    },
    'input': {
      'setup': () => { const result = Promise.resolve(null); return result; }
    },
    'kind': 'unhappy',
    'name': 'throws on missing file (ENOENT)'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=bad-json] expected throw');
      assert.match((error).message, /JSON|parse|Unexpected/i,
        '[cell=1, scenario=bad-json] reports JSON parse error');
    },
    'input': {
      'setup': async () => {
        const directory  = await mkdtemp(join(tmpdir(), 'iridis-cfg-'));
        const path = join(directory, 'config.json');
        await writeFile(path, 'not json at all }{', 'utf-8');
        return { 'directory': directory, 'path': path };
      }
    },
    'kind': 'unhappy',
    'name': 'throws on non-JSON file content'
  }
];

await new ScenarioRunner<FileIoInputInterface, FileIoOutputInterface>(
  'ConfigLoader :: cell-1 :: file-io',
  async (input) => {
    const context = await input.setup();
    if (context === null) {
      // ENOENT scenario: load from a guaranteed-absent path
      return { 'result': await new ConfigLoader().load('/tmp/__iridis_no_such_file_abc123.json') };
    }
    try {
      const result = await new ConfigLoader().load(context.path);
      return { 'result': result };
    } finally {
      await rm(context.directory, { 'force': true, 'recursive': true });
    }
  }
).run(fileIoScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — required-field schema enforcement
//
// CliConfigSchema declares `input`, `pipeline`, and `output` as required.
// Within `input`, `colors` is required. Within `output`, `directory` and
// `files` are required. Missing any of these MUST throw "Config invalid".
// ---------------------------------------------------------------------------

type SchemaFieldInputInterface = {
  readonly 'data': JsonValueType;
};
interface SchemaFieldOutputInterface {
  readonly 'loaded': CliConfigInterface;
}

const schemaFieldScenarios: readonly ScenarioInterface<SchemaFieldInputInterface, SchemaFieldOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-required] no throw');
      assert.ok(output !== undefined,      '[cell=2, scenario=all-required] loaded config returned');
    },
    'input': { 'data': ConfigLoaderTestFixture.validBase() },
    'kind': 'happy',
    'name': 'valid config with all required fields accepted'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-input] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=missing-input] message says Config invalid');
    },
    'input': {
      'data': { 'output': { 'directory': '/tmp', 'files': {} }, 'pipeline': ['intake:hex'] }
    },
    'kind': 'unhappy',
    'name': 'config missing top-level input throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-pipeline] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=missing-pipeline] message says Config invalid');
    },
    'input': {
      'data': { 'input': { 'colors': ['#ff0000'] }, 'output': { 'directory': '/tmp', 'files': {} } }
    },
    'kind': 'unhappy',
    'name': 'config missing top-level pipeline throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-output] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=missing-output] message says Config invalid');
    },
    'input': {
      'data': { 'input': { 'colors': ['#ff0000'] }, 'pipeline': ['intake:hex'] }
    },
    'kind': 'unhappy',
    'name': 'config missing top-level output throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-colors] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=missing-colors] message says Config invalid');
    },
    'input': {
      'data': { 'input': {}, 'output': { 'directory': '/tmp', 'files': {} }, 'pipeline': ['intake:hex'] }
    },
    'kind': 'unhappy',
    'name': 'config missing input.colors throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-output-dir] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=missing-output-dir] message says Config invalid');
    },
    'input': {
      'data': { 'input': { 'colors': ['#ff0000'] }, 'output': { 'files': {} }, 'pipeline': ['intake:hex'] }
    },
    'kind': 'unhappy',
    'name': 'config missing output.directory throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=missing-output-files] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=missing-output-files] message says Config invalid');
    },
    'input': {
      'data': { 'input': { 'colors': ['#ff0000'] }, 'output': { 'directory': '/tmp' }, 'pipeline': ['intake:hex'] }
    },
    'kind': 'unhappy',
    'name': 'config missing output.files throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=non-object] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=non-object] message says Config invalid');
    },
    'input': { 'data': 'not-an-object' },
    'kind': 'unhappy',
    'name': 'non-object root value throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=null-root] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=null-root] message says Config invalid');
    },
    'input': { 'data': null },
    'kind': 'unhappy',
    'name': 'null root throws Config invalid'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=array-root] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=2, scenario=array-root] message says Config invalid');
    },
    'input': { 'data': [1, 2, 3] },
    'kind': 'unhappy',
    'name': 'array root throws Config invalid'
  }
];

await new ScenarioRunner<SchemaFieldInputInterface, SchemaFieldOutputInterface>(
  'ConfigLoader :: cell-2 :: schema-fields',
  async (input) => {
    const loaded = await ConfigLoaderTestFixture.loadAndCleanup(input.data);
    return { 'loaded': loaded };
  }
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

const schemaTypeScenarios: readonly ScenarioInterface<SchemaFieldInputInterface, SchemaFieldOutputInterface>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=colors-empty] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=colors-empty] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'input': { 'colors': [] } })
    },
    'kind': 'unhappy',
    'name': 'input.colors empty array rejected (minItems:1)'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=colors-not-array] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=colors-not-array] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'input': { 'colors': '#ff0000' } })
    },
    'kind': 'unhappy',
    'name': 'input.colors non-array rejected'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=pipeline-empty] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=pipeline-empty] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'pipeline': [] })
    },
    'kind': 'unhappy',
    'name': 'pipeline empty array rejected (minItems:1)'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=pipeline-not-array] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=pipeline-not-array] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'pipeline': 'intake:hex' })
    },
    'kind': 'unhappy',
    'name': 'pipeline non-array rejected'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=files-not-object] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=files-not-object] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'output': { 'directory': '/tmp', 'files': 'bad' } })
    },
    'kind': 'unhappy',
    'name': 'output.files non-object rejected'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=enable-not-bool] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=enable-not-bool] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'enableStylesheet': 'yes' })
    },
    'kind': 'unhappy',
    'name': 'enable flag as non-boolean rejected'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=dir-not-string] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=3, scenario=dir-not-string] message says Config invalid');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({ 'output': { 'directory': 123, 'files': {} } })
    },
    'kind': 'unhappy',
    'name': 'output.directory non-string rejected'
  }
];

await new ScenarioRunner<SchemaFieldInputInterface, SchemaFieldOutputInterface>(
  'ConfigLoader :: cell-3 :: schema-types',
  async (input) => {
    const loaded = await ConfigLoaderTestFixture.loadAndCleanup(input.data);
    return { 'loaded': loaded };
  }
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

interface EdgeInputInterface {
  readonly 'check': (loaded: CliConfigInterface) => void;
  readonly 'data':  JsonValueType;
}
interface EdgeOutputInterface {
  readonly 'check':  (loaded: CliConfigInterface) => void;
  readonly 'loaded': CliConfigInterface;
}

const edgeScenarios: readonly ScenarioInterface<EdgeInputInterface, EdgeOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=multi-colors] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        assert.strictEqual(loaded.input.colors.length, 3,
          '[cell=4, scenario=multi-colors] three colors preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({ 'input': { 'colors': ['#8b5cf6', 'oklch(50% 0.2 270)', 'rgb(139,92,246)'] } })
    },
    'kind': 'edge',
    'name': 'unicode color strings in input.colors accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=unicode-path] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        assert.strictEqual(loaded.output.directory, '/tmp/お出力/données',
          '[cell=4, scenario=unicode-path] unicode directory preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({ 'output': { 'directory': '/tmp/お出力/données', 'files': {} } })
    },
    'kind': 'edge',
    'name': 'unicode path in output.directory accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=all-flags] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        assert.strictEqual(loaded.enableVscode,     true, '[cell=4, scenario=all-flags] enableVscode');
        assert.strictEqual(loaded.enableRdf,        true, '[cell=4, scenario=all-flags] enableRdf');
        assert.strictEqual(loaded.enableStylesheet, true, '[cell=4, scenario=all-flags] enableStylesheet');
      },
      'data': ConfigLoaderTestFixture.validBase({
        'enableCapacitor':  true,
        'enableContrast':   true,
        'enableImage':      true,
        'enableRdf':        true,
        'enableStylesheet': true,
        'enableTailwind':   true,
        'enableVscode':     true
      })
    },
    'kind': 'edge',
    'name': 'all enable flags set to true simultaneously accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=multi-files] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        const files = loaded.output.files;
        assert.strictEqual(Object.keys(files).length, 3,
          '[cell=4, scenario=multi-files] three output files preserved');
        assert.deepStrictEqual(files, {
          'stylesheet:cssVars': 'theme.css',
          'tailwind:theme':     'tailwind.config.js',
          'vscode:themeJson':   'settings.json'
        }, '[cell=4, scenario=multi-files] output file mapping preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({
        'output': {
          'directory': '/tmp',
          'files': {
            'stylesheet:cssVars': 'theme.css',
            'tailwind:theme':     'tailwind.config.js',
            'vscode:themeJson':   'settings.json'
          }
        }
      })
    },
    'kind': 'edge',
    'name': 'output.files with multiple entries accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=metadata] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        const metadata = loaded.input.metadata;
        assert.ok(metadata !== undefined,
          '[cell=4, scenario=metadata] metadata present');
        assert.strictEqual(metadata.seed, 'violet',
          '[cell=4, scenario=metadata] seed preserved');
        assert.strictEqual(metadata.theme, 'dark',
          '[cell=4, scenario=metadata] theme preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({
        'input': {
          'colors':   ['#8b5cf6'],
          'metadata': { 'author': 'test suite', 'seed': 'violet', 'theme': 'dark' }
        }
      })
    },
    'kind': 'edge',
    'name': 'metadata object with nested structure accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=contrast] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        const contrast = loaded.input.contrast;
        assert.ok(contrast !== undefined,
          '[cell=4, scenario=contrast] contrast present');
        assert.strictEqual(contrast.level, 'AA',
          '[cell=4, scenario=contrast] level preserved');
        assert.strictEqual(contrast.algorithm, 'wcag21',
          '[cell=4, scenario=contrast] algorithm preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({
        'input': {
          'colors':   ['#8b5cf6'],
          'contrast': { 'algorithm': 'wcag21', 'level': 'AA' }
        }
      })
    },
    'kind': 'edge',
    'name': 'contrast object in input accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=single-pipeline] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        assert.deepStrictEqual(loaded.pipeline, ['intake:hex'],
          '[cell=4, scenario=single-pipeline] single-item pipeline preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({ 'pipeline': ['intake:hex'] })
    },
    'kind': 'edge',
    'name': 'single-element pipeline accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=empty-files] no throw');
      output!.check(output!.loaded);
    },
    'input': {
      'check': (loaded) => {
        assert.deepStrictEqual(loaded.output.files, {},
          '[cell=4, scenario=empty-files] empty files object preserved');
      },
      'data': ConfigLoaderTestFixture.validBase({ 'output': { 'directory': '/tmp', 'files': {} } })
    },
    'kind': 'edge',
    'name': 'empty output.files object accepted'
  }
];

await new ScenarioRunner<EdgeInputInterface, EdgeOutputInterface>(
  'ConfigLoader :: cell-4 :: edge-content',
  async (input) => {
    const loaded = await ConfigLoaderTestFixture.loadAndCleanup(input.data);
    return { 'check': input.check, 'loaded': loaded };
  }
).run(edgeScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — contrast configuration: preserve every validated core option
//
// The CLI boundary must preserve algorithm/level selection, CVD correction,
// and additional contrast relations. Invalid relation shapes or unknown
// contrast fields must fail before JsonTology instantiation.
// ---------------------------------------------------------------------------

const completeContrast = {
  'algorithm':  'apca',
  'cvdCorrect': true,
  'extra': [
    {
      'algorithm':  'apca',
      'background': 'canvas',
      'foreground': 'text',
      'minRatio':   60
    },
    {
      'algorithm':  'wcag21',
      'background': 'accent',
      'foreground': 'onAccent',
      'minRatio':   4.5
    }
  ],
  'level': 'AAA'
};

const contrastConfigScenarios: readonly ScenarioInterface<SchemaFieldInputInterface, SchemaFieldOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=complete] no throw');
      if (output === undefined) {
        assert.fail('[cell=5, scenario=complete] loaded config returned');
      }
      assert.deepStrictEqual(
        output.loaded.input.contrast,
        completeContrast,
        '[cell=5, scenario=complete] every contrast field survives the validated JSON round trip'
      );
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': { 'colors': ['#8b5cf6'], 'contrast': completeContrast }
      })
    },
    'kind': 'happy',
    'name': 'full AA/AAA/APCA/CVD configuration round-trips without field loss'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=cvd-type] expected throw');
      assert.match(error.message, /Config invalid/,
        '[cell=5, scenario=cvd-type] malformed cvdCorrect rejected');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': { 'colors': ['#8b5cf6'], 'contrast': { 'cvdCorrect': 'true' } }
      })
    },
    'kind': 'unhappy',
    'name': 'cvdCorrect rejects non-boolean values'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=extra-type] expected throw');
      assert.match(error.message, /Config invalid/,
        '[cell=5, scenario=extra-type] malformed extra collection rejected');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': { 'colors': ['#8b5cf6'], 'contrast': { 'extra': 'text-on-canvas' } }
      })
    },
    'kind': 'unhappy',
    'name': 'extra rejects non-array values'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=extra-required] expected throw');
      assert.match(error.message, /Config invalid/,
        '[cell=5, scenario=extra-required] incomplete relation rejected');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': {
          'colors': ['#8b5cf6'],
          'contrast': { 'extra': [{ 'background': 'canvas', 'foreground': 'text' }] }
        }
      })
    },
    'kind': 'unhappy',
    'name': 'extra relation requires minRatio'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=extra-algorithm] expected throw');
      assert.match(error.message, /Config invalid/,
        '[cell=5, scenario=extra-algorithm] unknown algorithm rejected');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': {
          'colors': ['#8b5cf6'],
          'contrast': {
            'extra': [{
              'algorithm': 'custom',
              'background': 'canvas',
              'foreground': 'text',
              'minRatio': 4.5
            }]
          }
        }
      })
    },
    'kind': 'unhappy',
    'name': 'extra relation rejects unsupported algorithms'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=extra-unknown] expected throw');
      assert.match(error.message, /Config invalid/,
        '[cell=5, scenario=extra-unknown] unknown relation field rejected');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': {
          'colors': ['#8b5cf6'],
          'contrast': {
            'extra': [{
              'background': 'canvas',
              'foreground': 'text',
              'minRatio': 4.5,
              'priority': 'high'
            }]
          }
        }
      })
    },
    'kind': 'unhappy',
    'name': 'extra relation rejects arbitrary fields'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=contrast-unknown] expected throw');
      assert.match(error.message, /Config invalid/,
        '[cell=5, scenario=contrast-unknown] unknown contrast field rejected');
    },
    'input': {
      'data': ConfigLoaderTestFixture.validBase({
        'input': { 'colors': ['#8b5cf6'], 'contrast': { 'mode': 'strict' } }
      })
    },
    'kind': 'unhappy',
    'name': 'contrast rejects arbitrary fields instead of silently dropping them'
  }
];

await new ScenarioRunner<SchemaFieldInputInterface, SchemaFieldOutputInterface>(
  'ConfigLoader :: cell-5 :: contrast-config',
  async (input) => {
    const loaded = await ConfigLoaderTestFixture.loadAndCleanup(input.data);
    return { 'loaded': loaded };
  }
).run(contrastConfigScenarios);
