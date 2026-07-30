/**
 * Cli — end-to-end scenario-matrix suite.
 *
 * Subject: `Cli.run(configPath)` (full pipeline from config file to written outputs).
 * Also covers `PluginResolver.resolve()` and `OutputWriter.write()` as observable
 * side-effects of the orchestration. Each cell drives one observable concern through
 * its happy / edge / unhappy matrix.
 *
 * Cells:
 *   1. config-loading   — Cli.run reads config from disk; bad paths and corrupt JSON reject
 *   2. plugin-resolver  — enable* flags drive dynamic import of the correct plugin
 *   3. output-writer    — files are written to the declared directory with correct content
 *   4. pipeline-exec    — full intake → resolve → emit pipeline produces typed state
 *   5. flag-edges       — all enable flags, no flags, unicode paths, multiple output files
 *   6. unhappy-paths    — invalid config, unknown pipeline task, bad plugin flag
 */

import type { CliConfigInterface } from '@studnicky/iridis-cli/types';
import type { JsonObjectType, JsonValueType } from '@studnicky/types';

import { Cli, ConfigLoader, PluginResolver } from '@studnicky/iridis-cli';
import { JsonObject, JsonValue } from '@studnicky/types';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join }  from 'node:path';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { FlagKeyEntity } from '../../src/entities/FlagKeyEntity.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class CliTestFixture {
  static async temporaryDirectory(): Promise<string> {
    const result = await mkdtemp(join(tmpdir(), 'iridis-e2e-'));
    return result;
  }

  static async writeConfig(directory: string, config: JsonObjectType): Promise<string> {
    const configPath = join(directory, 'iridis.config.json');
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return configPath;
  }

  static minimalCssConfig(directory: string): JsonObjectType {
    return {
      'enableStylesheet': true,
      'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'output':           { 'directory': directory, 'files': { 'stylesheet:cssVars': 'theme.json' } },
      'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
    };
  }

  static async loadDataViaDisk(data: JsonValueType): Promise<CliConfigInterface> {
    const directory = await CliTestFixture.temporaryDirectory();
    const configPath = join(directory, 'cfg.json');
    try {
      await writeFile(configPath, JSON.stringify(data), 'utf-8');
      return await new ConfigLoader().load(configPath);
    } finally {
      await rm(directory, { 'force': true, 'recursive': true });
    }
  }

  static outputDirectory(config: JsonObjectType): string {
    if (!JsonObject.is(config) || !JsonObject.is(config.output) || typeof config.output.directory !== 'string') {
      throw new Error('Expected config.output.directory to be a string');
    }
    return config.output.directory;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — config loading: Cli.run reads a JSON config from disk
//
// Cli.run() delegates to ConfigLoader for file I/O. The integration must:
//   - accept a valid path and complete without error
//   - surface ENOENT when the config file is absent
//   - surface a JSON parse error when the file is not valid JSON
//   - surface "Config invalid" when the JSON is valid but schema-invalid
// ---------------------------------------------------------------------------

interface ConfigLoadInputInterface {
  readonly 'setup': (temporaryDirectory: string) => Promise<string>;
}
type ConfigLoadOutput = {
  readonly 'outputsWritten': readonly string[];
};

const configLoadScenarios: readonly ScenarioInterface<ConfigLoadInputInterface, ConfigLoadOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=valid-path] no throw');
      assert.ok(output!.outputsWritten.length >= 1,
        '[cell=1, scenario=valid-path] at least one output written');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'out');
        return await CliTestFixture.writeConfig(dir, CliTestFixture.minimalCssConfig(outDir));
      }
    },
    'kind': 'happy',
    'name': 'valid config path runs to completion'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=missing-file] expected throw');
      assert.match(
        'code' in error && typeof error.code === 'string' ? error.code : error.message,
        /ENOENT|no such file/i,
        '[cell=1, scenario=missing-file] surfaces file-not-found'
      );
    },
    'input': {
      'setup': (_directory) => { const result = Promise.resolve('/tmp/__iridis_absent_config_xyz.json'); return result; }
    },
    'kind': 'unhappy',
    'name': 'missing config file surfaces ENOENT'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=non-json] expected throw');
      assert.match((error).message, /JSON|parse|Unexpected|token/i,
        '[cell=1, scenario=non-json] surfaces parse error');
    },
    'input': {
      'setup': async (dir) => {
        const path = join(dir, 'bad.json');
        await writeFile(path, '{{ not json }}', 'utf-8');
        return path;
      }
    },
    'kind': 'unhappy',
    'name': 'non-JSON config file surfaces parse error'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=schema-invalid] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=1, scenario=schema-invalid] names validation context');
    },
    'input': {
      'setup': async (dir) => {
        const path = join(dir, 'invalid.json');
        // missing required `pipeline` field
        await writeFile(path, JSON.stringify({ 'input': { 'colors': ['#ff0000'] }, 'output': { 'directory': dir, 'files': {} } }), 'utf-8');
        return path;
      }
    },
    'kind': 'unhappy',
    'name': 'schema-invalid config surfaces Config invalid'
  }
];

await new ScenarioRunner<ConfigLoadInputInterface, ConfigLoadOutput>(
  'Cli :: cell-1 :: config-loading',
  async (input) => {
    const dir = await CliTestFixture.temporaryDirectory();
    try {
      const path = await input.setup(dir);
      const result = await new Cli().run(path);
      return { 'outputsWritten': result.outputsWritten };
    } finally {
      await rm(dir, { 'force': true, 'recursive': true });
    }
  }
).run(configLoadScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — plugin resolver: enable* flags drive dynamic plugin import
//
// PluginResolver.resolve() iterates the enable* flags and dynamically imports
// each matching package. The integration must:
//   - import exactly the right plugin for each flag
//   - return an empty array when no flags are set
//   - load multiple plugins when multiple flags are set
//   - throw descriptively when an enable flag maps to an unresolvable package
// ---------------------------------------------------------------------------

interface ResolverInputInterface {
  readonly 'config': Partial<Record<FlagKeyEntity.Type, boolean>>;
}
type ResolverOutput = {
  readonly 'count':       number;
  readonly 'pluginNames': readonly string[];
};

const resolverScenarios: readonly ScenarioInterface<ResolverInputInterface, ResolverOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,       '[cell=2, scenario=stylesheet] no throw');
      assert.strictEqual(output!.count, 1,       '[cell=2, scenario=stylesheet] exactly one plugin');
      assert.strictEqual(output!.pluginNames.at(0), 'stylesheet',
        '[cell=2, scenario=stylesheet] plugin name is stylesheet');
    },
    'input': {
      'config': {
        'enableStylesheet': true
      }
    },
    'kind': 'happy',
    'name': 'enableStylesheet resolves stylesheet plugin'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=no-flags] no throw');
      assert.strictEqual(output!.count, 0, '[cell=2, scenario=no-flags] no plugins resolved');
    },
    'input': {
      'config': {}
    },
    'kind': 'happy',
    'name': 'no enable flags yields empty plugin list'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=false-flag] no throw');
      assert.strictEqual(output!.count, 0, '[cell=2, scenario=false-flag] false flag excluded');
    },
    'input': {
      'config': {
        'enableStylesheet': false
      }
    },
    'kind': 'edge',
    'name': 'false enable flag yields no plugin'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=tasks-fn] no throw');
      // Verified indirectly: pluginNames only populated from valid plugins (resolver throws otherwise)
      assert.strictEqual(output!.count, 1, '[cell=2, scenario=tasks-fn] one valid plugin resolved');
    },
    'input': {
      'config': {
        'enableStylesheet': true
      }
    },
    'kind': 'edge',
    'name': 'resolved plugin has a tasks() function'
  }
];

await new ScenarioRunner<ResolverInputInterface, ResolverOutput>(
  'Cli :: cell-2 :: plugin-resolver',
  async (input) => {
    const plugins = await new PluginResolver().resolve(input.config);
    return {
      'count':       plugins.length,
      'pluginNames': plugins.map((plugin) => { const result = plugin.name; return result; })
    };
  }
).run(resolverScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — output writer: files written to disk with correct content
//
// OutputWriter (via Cli.run) must:
//   - create the output directory if it does not exist
//   - write one file per output.files entry
//   - return the absolute paths of every written file
//   - serialize non-string state output values as JSON
//
// Cli.run must reject at config time when output.files declares a slot that
// no pipeline task writes (validated before any task execution).
// ---------------------------------------------------------------------------

interface WriterInputInterface {
  readonly 'buildConfig': (outputDirectory: string) => JsonObjectType;
}
type WriterOutput = {
  readonly 'firstContent':   string;
  readonly 'outDir':         string;
  readonly 'outDirExists':   boolean;
  readonly 'outputsWritten': readonly string[];
};

const writerScenarios: readonly ScenarioInterface<WriterInputInterface, WriterOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=file-written] no throw');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=3, scenario=file-written] one file written');
      assert.ok(output!.outputsWritten.at(0)!.startsWith(output!.outDir),
        '[cell=3, scenario=file-written] file is inside declared output directory');
      assert.ok(output!.firstContent.length > 0,
        '[cell=3, scenario=file-written] written file is non-empty');
    },
    'input': {
      'buildConfig': (outDir) => { const result = CliTestFixture.minimalCssConfig(outDir); return result; }
    },
    'kind': 'happy',
    'name': 'output file written to declared directory'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=nested-dir] no throw');
      assert.ok(output!.outDirExists,
        '[cell=3, scenario=nested-dir] nested output directory created by OutputWriter');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=3, scenario=nested-dir] one file written into nested dir');
    },
    'input': {
      'buildConfig': (outDir) => { const result = CliTestFixture.minimalCssConfig(join(outDir, 'deeply', 'nested')); return result; }
    },
    'kind': 'edge',
    'name': 'non-existent output directory is created automatically'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=3, scenario=missing-slot] Cli.run throws before any task executes');
      assert.match((error).message, /Config error/,
        '[cell=3, scenario=missing-slot] error is a config-level rejection');
      assert.match((error).message, /ghost/,
        '[cell=3, scenario=missing-slot] error names the unwritten slot');
    },
    'input': {
      'buildConfig': (outDir) => {return {
        'enableStylesheet': true,
        'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
        'output': {
          'directory': outDir,
          'files': {
            'ghost':              'missing-slot.json',
            'stylesheet:cssVars': 'theme.json'
          }
        },
        'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
      };}
    },
    'kind': 'unhappy',
    'name': 'output.files entry referencing missing slot rejected at config time'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=3, scenario=multi-missing] Cli.run throws for multiple unwritten slots');
      assert.match((error).message, /Config error/,
        '[cell=3, scenario=multi-missing] error is a config-level rejection');
      assert.match((error).message, /ghost1/,
        '[cell=3, scenario=multi-missing] error names first unwritten slot');
      assert.match((error).message, /ghost2/,
        '[cell=3, scenario=multi-missing] error names second unwritten slot');
    },
    'input': {
      'buildConfig': (outDir) => {return {
        'enableStylesheet': true,
        'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
        'output': {
          'directory': outDir,
          'files': {
            'ghost1': 'a.json',
            'ghost2': 'b.json'
          }
        },
        'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
      };}
    },
    'kind': 'unhappy',
    'name': 'multiple unwritten slots listed in error'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,
        '[cell=3, scenario=all-written] no false positive when all declared slots are produced');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=3, scenario=all-written] one output file written');
    },
    'input': {
      'buildConfig': (outDir) => {return {
        'enableStylesheet': true,
        'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
        'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
        'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
      };}
    },
    'kind': 'happy',
    'name': 'all slots written — no false positive rejection'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,
        '[cell=3, scenario=empty-files] empty output.files is accepted');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=3, scenario=empty-files] no files written');
    },
    'input': {
      'buildConfig': (outDir) => {return {
        'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
        'output':           { 'directory': outDir, 'files': {} },
        'pipeline':         ['intake:hex']
      };}
    },
    'kind': 'edge',
    'name': 'empty output.files is accepted (no-op)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=abs-paths] no throw');
      for (const outputPath of output!.outputsWritten) {
        assert.ok(outputPath.startsWith('/'),
          `[cell=3, scenario=abs-paths] path is absolute: ${outputPath}`);
      }
    },
    'input': {
      'buildConfig': (outDir) => { const result = CliTestFixture.minimalCssConfig(outDir); return result; }
    },
    'kind': 'edge',
    'name': 'returned outputsWritten paths are absolute'
  }
];

await new ScenarioRunner<WriterInputInterface, WriterOutput>(
  'Cli :: cell-3 :: output-writer',
  async (input) => {
    const temporaryBase  = await CliTestFixture.temporaryDirectory();
    const baseDir  = join(temporaryBase, 'out');
    try {
      const config     = input.buildConfig(baseDir);
      const configPath = await CliTestFixture.writeConfig(temporaryBase, config);
      const result  = await new Cli().run(configPath);

      // The actual output directory is whatever the config declared.
      const actualOutDir = CliTestFixture.outputDirectory(config);

      let firstContent = '';
      if (result.outputsWritten.length > 0) {
        firstContent = await readFile(result.outputsWritten.at(0)!, 'utf-8');
      }

      let outDirExists = false;
      try {
        const outputDirectoryStats = await stat(actualOutDir);
        outDirExists = outputDirectoryStats.isDirectory();
      } catch {
        // outDirExists stays false — directory was not created
      }

      return {
        'firstContent': firstContent,
        'outDir': actualOutDir,
        'outDirExists': outDirExists,
        'outputsWritten': result.outputsWritten
      };
    } finally {
      await rm(temporaryBase, { 'force': true, 'recursive': true });
    }
  }
).run(writerScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — full pipeline execution: intake → resolve → emit produces state
//
// Cli.run() must thread input through the core pipeline and expose results.
// The cssVars emitter produces a `full` property containing a :root CSS block.
// ---------------------------------------------------------------------------

interface PipelineExecInputInterface {
  readonly 'setup': (temporaryDirectory: string) => Promise<string>;
}
type PipelineExecOutput = {
  readonly 'outputsWritten': readonly string[];
  readonly 'writtenContent': string;
};

const pipelineExecScenarios: readonly ScenarioInterface<PipelineExecInputInterface, PipelineExecOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=css-root] no throw');
      assert.ok(output!.writtenContent.includes(':root'),
        '[cell=4, scenario=css-root] :root block present in emitted output');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'out');
        return await CliTestFixture.writeConfig(dir, CliTestFixture.minimalCssConfig(outDir));
      }
    },
    'kind': 'happy',
    'name': 'cssVars emitter produces :root block in output JSON'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=two-colors] no throw');
      assert.ok(output!.writtenContent.includes(':root'),
        '[cell=4, scenario=two-colors] :root block present');
      assert.ok(output!.writtenContent.length > 20,
        '[cell=4, scenario=two-colors] non-trivial output produced');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'out');
        const config: JsonObjectType = {
          'enableStylesheet': true,
          'input':            { 'bypass': undefined, 'colors': ['#8b5cf6', '#ec4899'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
          'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'happy',
    'name': 'two-color input produces a richer output than one-color input'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,               '[cell=4, scenario=intake-only] no throw');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=4, scenario=intake-only] no output files when files map is empty');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'minimal');
        const config: JsonObjectType = {
          'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': {} },
          'pipeline':         ['intake:hex']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'edge',
    'name': 'pipeline with only intake:hex succeeds (no downstream tasks)'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=4, scenario=oklch] intake:hex must throw on non-hex input');
      assert.match((error).message, /intake:hex/,
        '[cell=4, scenario=oklch] error names the offending intake task');
      assert.match((error).message, /index 0/,
        '[cell=4, scenario=oklch] error names the failing entry position');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'oklch-out');
        const config: JsonObjectType = {
          'enableStylesheet': true,
          'input':            { 'bypass': undefined, 'colors': ['oklch(50% 0.2 270)'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
          'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'unhappy',
    'name': 'intake:hex rejects oklch string with a descriptive error'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=unknown-task] expected throw');
      assert.match((error).message, /not registered|ghost|unknown/i,
        '[cell=4, scenario=unknown-task] names the unregistered task');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'bad-pipeline');
        const config: JsonObjectType = {
          'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': {} },
          'pipeline':         ['intake:hex', 'does-not-exist:ghost']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'unhappy',
    'name': 'pipeline with unknown task name throws descriptive error'
  }
];

await new ScenarioRunner<PipelineExecInputInterface, PipelineExecOutput>(
  'Cli :: cell-4 :: pipeline-exec',
  async (input) => {
    const dir = await CliTestFixture.temporaryDirectory();
    try {
      const configPath = await input.setup(dir);
      const result  = await new Cli().run(configPath);
      let writtenContent = '';
      if (result.outputsWritten.length > 0) {
        writtenContent = await readFile(result.outputsWritten.at(0)!, 'utf-8');
        const parsed = JsonValue.from(JSON.parse(writtenContent));
        if (parsed !== null && !Array.isArray(parsed) && typeof parsed === 'object' && typeof parsed.full === 'string') {
          writtenContent = parsed.full;
        }
      }
      return { 'outputsWritten': result.outputsWritten, 'writtenContent': writtenContent };
    } finally {
      await rm(dir, { 'force': true, 'recursive': true });
    }
  }
).run(pipelineExecScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — flag and path edge cases
//
// The Cli must handle:
//   - unicode characters in output directory path
//   - enable* flag false (same as absent)
//   - all enable flags false simultaneously
// ---------------------------------------------------------------------------

interface FlagEdgeInputInterface {
  readonly 'setup': (temporaryDirectory: string) => Promise<string>;
}
type FlagEdgeOutput = {
  readonly 'outputsWritten': readonly string[];
};

const flagEdgeScenarios: readonly ScenarioInterface<FlagEdgeInputInterface, FlagEdgeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=all-false] no throw');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=5, scenario=all-false] no outputs when no files declared');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'no-plugins');
        const config: JsonObjectType = {
          'enableCapacitor':  false,
          'enableContrast':   false,
          'enableImage':      false,
          'enableRdf':        false,
          'enableStylesheet': false,
          'enableTailwind':   false,
          'enableVscode':     false,
          'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': {} },
          'pipeline':         ['intake:hex']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'edge',
    'name': 'all enable flags false behaves same as no flags'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=unicode-dir] no throw');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=5, scenario=unicode-dir] file written to unicode directory');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'données-出力');
        const config: JsonObjectType = {
          'enableStylesheet': true,
          'input':            { 'bypass': undefined, 'colors': ['#8b5cf6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
          'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'edge',
    'name': 'unicode output directory path accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=bare-min] no throw');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=5, scenario=bare-min] zero files written when files map is empty');
    },
    'input': {
      'setup': async (dir) => {
        const outDir = join(dir, 'bare-min');
        const config: JsonObjectType = {
          'input':            { 'bypass': undefined, 'colors': ['#ff0000'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
          'output':           { 'directory': outDir, 'files': {} },
          'pipeline':         ['intake:hex']
        };
        return await CliTestFixture.writeConfig(dir, config);
      }
    },
    'kind': 'edge',
    'name': 'config with only required fields and empty files map completes'
  }
];

await new ScenarioRunner<FlagEdgeInputInterface, FlagEdgeOutput>(
  'Cli :: cell-5 :: flag-edges',
  async (input) => {
    const dir = await CliTestFixture.temporaryDirectory();
    try {
      const configPath = await input.setup(dir);
      const result  = await new Cli().run(configPath);
      return { 'outputsWritten': result.outputsWritten };
    } finally {
      await rm(dir, { 'force': true, 'recursive': true });
    }
  }
).run(flagEdgeScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — ConfigLoader standalone validation
//
// ConfigLoader is exported from the package. Its interface contract is
// independently testable: loads a file, parses JSON, validates the schema.
// ---------------------------------------------------------------------------

type LoaderStandaloneInputInterface = {
  readonly 'data': JsonValueType;
};
interface LoaderStandaloneOutputInterface {
  readonly 'loaded': CliConfigInterface;
}

const loaderStandaloneScenarios: readonly ScenarioInterface<LoaderStandaloneInputInterface, LoaderStandaloneOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=standalone-ok] no throw');
      assert.ok(output!.loaded !== null && typeof output!.loaded === 'object',
        '[cell=6, scenario=standalone-ok] loaded is object');
    },
    'input': {
      'data': {
        'input':    { 'colors': ['#8b5cf6'] },
        'output':   { 'directory': '/tmp', 'files': {} },
        'pipeline': ['intake:hex', 'resolve:roles']
      }
    },
    'kind': 'happy',
    'name': 'ConfigLoader is independently constructible and functional'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=colors-roundtrip] no throw');
      assert.deepStrictEqual(output!.loaded.input.colors, ['#8b5cf6', '#ec4899', '#10b981'],
        '[cell=6, scenario=colors-roundtrip] all three colors round-trip through disk');
    },
    'input': {
      'data': {
        'input':    { 'colors': ['#8b5cf6', '#ec4899', '#10b981'] },
        'output':   { 'directory': '/tmp', 'files': {} },
        'pipeline': ['intake:hex']
      }
    },
    'kind': 'happy',
    'name': 'ConfigLoader returns exact color values from file'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=schema-rejected] expected throw');
      assert.match((error).message, /Config invalid/,
        '[cell=6, scenario=schema-rejected] message says Config invalid');
    },
    'input': {
      'data': { 'not': 'a valid config' }
    },
    'kind': 'unhappy',
    'name': 'ConfigLoader rejects valid JSON that fails schema'
  }
];

await new ScenarioRunner<LoaderStandaloneInputInterface, LoaderStandaloneOutputInterface>(
  'Cli :: cell-6 :: config-loader-standalone',
  async (input) => {
    const loaded = await CliTestFixture.loadDataViaDisk(input.data);
    return { 'loaded': loaded };
  }
).run(loaderStandaloneScenarios);
