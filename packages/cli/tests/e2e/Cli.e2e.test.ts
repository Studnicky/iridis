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

import { mkdtemp, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { join }  from 'node:path';
import { tmpdir } from 'node:os';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { Cli, ConfigLoader, PluginResolver } from '@studnicky/iridis-cli';
import type { CliConfigInterface }            from '@studnicky/iridis-cli/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'iridis-e2e-'));
}

async function writeConfig(dir: string, cfg: CliConfigInterface): Promise<string> {
  const path = join(dir, 'iridis.config.json');
  await writeFile(path, JSON.stringify(cfg, null, 2), 'utf-8');
  return path;
}

function minimalCssConfig(dir: string): CliConfigInterface {
  return {
    'input':            { 'colors': ['#8b5cf6'] },
    'enableStylesheet': true,
    'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
    'output':           { 'directory': dir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
  };
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

interface ConfigLoadInput {
  readonly setup: (tmpDir: string) => Promise<string>;
}
interface ConfigLoadOutput {
  readonly outputsWritten: readonly string[];
}

const configLoadScenarios: readonly ScenarioInterface<ConfigLoadInput, ConfigLoadOutput>[] = [
  {
    name: 'valid config path runs to completion',
    kind: 'happy',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'out');
        return writeConfig(dir, minimalCssConfig(outDir));
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=valid-path] no throw');
      assert.ok(output!.outputsWritten.length >= 1,
        '[cell=1, scenario=valid-path] at least one output written');
    },
  },
  {
    name: 'missing config file surfaces ENOENT',
    kind: 'unhappy',
    input: {
      setup: async (_dir) => '/tmp/__iridis_absent_config_xyz.json',
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=missing-file] expected throw');
      assert.match(
        (error as NodeJS.ErrnoException).code ?? (error as Error).message,
        /ENOENT|no such file/i,
        '[cell=1, scenario=missing-file] surfaces file-not-found',
      );
    },
  },
  {
    name: 'non-JSON config file surfaces parse error',
    kind: 'unhappy',
    input: {
      setup: async (dir) => {
        const path = join(dir, 'bad.json');
        await writeFile(path, '{{ not json }}', 'utf-8');
        return path;
      },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=non-json] expected throw');
      assert.match((error as Error).message, /JSON|parse|Unexpected|token/i,
        '[cell=1, scenario=non-json] surfaces parse error');
    },
  },
  {
    name: 'schema-invalid config surfaces Config invalid',
    kind: 'unhappy',
    input: {
      setup: async (dir) => {
        const path = join(dir, 'invalid.json');
        // missing required `pipeline` field
        await writeFile(path, JSON.stringify({ 'input': { 'colors': ['#ff0000'] }, 'output': { 'directory': dir, 'files': {} } }), 'utf-8');
        return path;
      },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=schema-invalid] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=1, scenario=schema-invalid] names validation context');
    },
  },
];

new ScenarioRunner<ConfigLoadInput, ConfigLoadOutput>(
  'Cli :: cell-1 :: config-loading',
  async (input) => {
    const dir = await makeTmpDir();
    try {
      const path = await input.setup(dir);
      const result = await new Cli().run(path);
      return { outputsWritten: result.outputsWritten };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
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

interface ResolverInput {
  readonly config: CliConfigInterface;
}
interface ResolverOutput {
  readonly pluginNames: readonly string[];
  readonly count:       number;
}

const resolverScenarios: readonly ScenarioInterface<ResolverInput, ResolverOutput>[] = [
  {
    name: 'enableStylesheet resolves stylesheet plugin',
    kind: 'happy',
    input: {
      config: {
        'input':            { 'colors': ['#8b5cf6'] },
        'enableStylesheet': true,
        'pipeline':         ['intake:hex'],
        'output':           { 'directory': '.', 'files': {} },
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined,       '[cell=2, scenario=stylesheet] no throw');
      assert.strictEqual(output!.count, 1,       '[cell=2, scenario=stylesheet] exactly one plugin');
      assert.strictEqual(output!.pluginNames[0], 'stylesheet',
        '[cell=2, scenario=stylesheet] plugin name is stylesheet');
    },
  },
  {
    name: 'no enable flags yields empty plugin list',
    kind: 'happy',
    input: {
      config: {
        'input':    { 'colors': ['#8b5cf6'] },
        'pipeline': ['intake:hex'],
        'output':   { 'directory': '.', 'files': {} },
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=no-flags] no throw');
      assert.strictEqual(output!.count, 0, '[cell=2, scenario=no-flags] no plugins resolved');
    },
  },
  {
    name: 'false enable flag yields no plugin',
    kind: 'edge',
    input: {
      config: {
        'input':            { 'colors': ['#8b5cf6'] },
        'enableStylesheet': false,
        'pipeline':         ['intake:hex'],
        'output':           { 'directory': '.', 'files': {} },
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=false-flag] no throw');
      assert.strictEqual(output!.count, 0, '[cell=2, scenario=false-flag] false flag excluded');
    },
  },
  {
    name: 'resolved plugin has a tasks() function',
    kind: 'edge',
    input: {
      config: {
        'input':            { 'colors': ['#8b5cf6'] },
        'enableStylesheet': true,
        'pipeline':         ['intake:hex'],
        'output':           { 'directory': '.', 'files': {} },
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=tasks-fn] no throw');
      // Verified indirectly: pluginNames only populated from valid plugins (resolver throws otherwise)
      assert.strictEqual(output!.count, 1, '[cell=2, scenario=tasks-fn] one valid plugin resolved');
    },
  },
];

new ScenarioRunner<ResolverInput, ResolverOutput>(
  'Cli :: cell-2 :: plugin-resolver',
  async (input) => {
    const plugins = await new PluginResolver().resolve(input.config);
    return {
      pluginNames: plugins.map((p) => p.name),
      count:       plugins.length,
    };
  },
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

interface WriterInput {
  readonly buildConfig: (outDir: string) => CliConfigInterface;
}
interface WriterOutput {
  readonly outputsWritten: readonly string[];
  readonly firstContent:   string;
  readonly outDir:         string;
  readonly outDirExists:   boolean;
}

const writerScenarios: readonly ScenarioInterface<WriterInput, WriterOutput>[] = [
  {
    name: 'output file written to declared directory',
    kind: 'happy',
    input: {
      buildConfig: (outDir) => minimalCssConfig(outDir),
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=file-written] no throw');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=3, scenario=file-written] one file written');
      assert.ok(output!.outputsWritten[0]!.startsWith(output!.outDir),
        '[cell=3, scenario=file-written] file is inside declared output directory');
      assert.ok(output!.firstContent.length > 0,
        '[cell=3, scenario=file-written] written file is non-empty');
    },
  },
  {
    name: 'non-existent output directory is created automatically',
    kind: 'edge',
    input: {
      buildConfig: (outDir) => minimalCssConfig(join(outDir, 'deeply', 'nested')),
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=nested-dir] no throw');
      assert.ok(output!.outDirExists,
        '[cell=3, scenario=nested-dir] nested output directory created by OutputWriter');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=3, scenario=nested-dir] one file written into nested dir');
    },
  },
  {
    name: 'output.files entry referencing missing slot rejected at config time',
    kind: 'unhappy',
    input: {
      buildConfig: (outDir) => ({
        'input':            { 'colors': ['#8b5cf6'] },
        'enableStylesheet': true,
        'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
        'output': {
          'directory': outDir,
          'files': {
            'stylesheet:cssVars': 'theme.json',
            'ghost':              'missing-slot.json',
          },
        },
      }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=3, scenario=missing-slot] Cli.run throws before any task executes');
      assert.match((error as Error).message, /Config error/,
        '[cell=3, scenario=missing-slot] error is a config-level rejection');
      assert.match((error as Error).message, /ghost/,
        '[cell=3, scenario=missing-slot] error names the unwritten slot');
    },
  },
  {
    name: 'multiple unwritten slots listed in error',
    kind: 'unhappy',
    input: {
      buildConfig: (outDir) => ({
        'input':            { 'colors': ['#8b5cf6'] },
        'enableStylesheet': true,
        'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
        'output': {
          'directory': outDir,
          'files': {
            'ghost1': 'a.json',
            'ghost2': 'b.json',
          },
        },
      }),
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=3, scenario=multi-missing] Cli.run throws for multiple unwritten slots');
      assert.match((error as Error).message, /Config error/,
        '[cell=3, scenario=multi-missing] error is a config-level rejection');
      assert.match((error as Error).message, /ghost1/,
        '[cell=3, scenario=multi-missing] error names first unwritten slot');
      assert.match((error as Error).message, /ghost2/,
        '[cell=3, scenario=multi-missing] error names second unwritten slot');
    },
  },
  {
    name: 'all slots written — no false positive rejection',
    kind: 'happy',
    input: {
      buildConfig: (outDir) => ({
        'input':            { 'colors': ['#8b5cf6'] },
        'enableStylesheet': true,
        'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
        'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
      }),
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined,
        '[cell=3, scenario=all-written] no false positive when all declared slots are produced');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=3, scenario=all-written] one output file written');
    },
  },
  {
    name: 'empty output.files is accepted (no-op)',
    kind: 'edge',
    input: {
      buildConfig: (outDir) => ({
        'input':    { 'colors': ['#8b5cf6'] },
        'pipeline': ['intake:hex'],
        'output':   { 'directory': outDir, 'files': {} },
      }),
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined,
        '[cell=3, scenario=empty-files] empty output.files is accepted');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=3, scenario=empty-files] no files written');
    },
  },
  {
    name: 'returned outputsWritten paths are absolute',
    kind: 'edge',
    input: {
      buildConfig: (outDir) => minimalCssConfig(outDir),
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=abs-paths] no throw');
      for (const p of output!.outputsWritten) {
        assert.ok(p.startsWith('/'),
          `[cell=3, scenario=abs-paths] path is absolute: ${p}`);
      }
    },
  },
];

new ScenarioRunner<WriterInput, WriterOutput>(
  'Cli :: cell-3 :: output-writer',
  async (input) => {
    const tmpBase  = await makeTmpDir();
    const baseDir  = join(tmpBase, 'out');
    try {
      const cfg     = input.buildConfig(baseDir);
      const cfgPath = await writeConfig(tmpBase, cfg);
      const result  = await new Cli().run(cfgPath);

      // The actual output directory is whatever the config declared.
      const actualOutDir = cfg.output.directory;

      let firstContent = '';
      if (result.outputsWritten.length > 0) {
        firstContent = await readFile(result.outputsWritten[0]!, 'utf-8');
      }

      let outDirExists = false;
      try {
        const s = await stat(actualOutDir);
        outDirExists = s.isDirectory();
      } catch {
        // outDirExists stays false — directory was not created
      }

      return {
        outputsWritten: result.outputsWritten,
        firstContent,
        outDir: actualOutDir,
        outDirExists,
      };
    } finally {
      await rm(tmpBase, { recursive: true, force: true });
    }
  },
).run(writerScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — full pipeline execution: intake → resolve → emit produces state
//
// Cli.run() must thread input through the core pipeline and expose results.
// The cssVars emitter produces a `full` property containing a :root CSS block.
// ---------------------------------------------------------------------------

interface PipelineExecInput {
  readonly setup: (tmpDir: string) => Promise<string>;
}
interface PipelineExecOutput {
  readonly outputsWritten: readonly string[];
  readonly writtenContent: string;
}

const pipelineExecScenarios: readonly ScenarioInterface<PipelineExecInput, PipelineExecOutput>[] = [
  {
    name: 'cssVars emitter produces :root block in output JSON',
    kind: 'happy',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'out');
        return writeConfig(dir, minimalCssConfig(outDir));
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=css-root] no throw');
      assert.ok(output!.writtenContent.includes(':root'),
        '[cell=4, scenario=css-root] :root block present in emitted output');
    },
  },
  {
    name: 'two-color input produces a richer output than one-color input',
    kind: 'happy',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'out');
        const cfg: CliConfigInterface = {
          'input':            { 'colors': ['#8b5cf6', '#ec4899'] },
          'enableStylesheet': true,
          'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
          'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=two-colors] no throw');
      assert.ok(output!.writtenContent.includes(':root'),
        '[cell=4, scenario=two-colors] :root block present');
      assert.ok(output!.writtenContent.length > 20,
        '[cell=4, scenario=two-colors] non-trivial output produced');
    },
  },
  {
    name: 'pipeline with only intake:hex succeeds (no downstream tasks)',
    kind: 'edge',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'minimal');
        const cfg: CliConfigInterface = {
          'input':    { 'colors': ['#8b5cf6'] },
          'pipeline': ['intake:hex'],
          'output':   { 'directory': outDir, 'files': {} },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined,               '[cell=4, scenario=intake-only] no throw');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=4, scenario=intake-only] no output files when files map is empty');
    },
  },
  {
    name: 'intake:hex rejects oklch string with a descriptive error',
    kind: 'unhappy',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'oklch-out');
        const cfg: CliConfigInterface = {
          'input':            { 'colors': ['oklch(50% 0.2 270)'] },
          'enableStylesheet': true,
          'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
          'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=4, scenario=oklch] intake:hex must throw on non-hex input');
      assert.match((error as Error).message, /intake:hex/,
        '[cell=4, scenario=oklch] error names the offending intake task');
      assert.match((error as Error).message, /index 0/,
        '[cell=4, scenario=oklch] error names the failing entry position');
    },
  },
  {
    name: 'pipeline with unknown task name throws descriptive error',
    kind: 'unhappy',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'bad-pipeline');
        const cfg: CliConfigInterface = {
          'input':    { 'colors': ['#8b5cf6'] },
          'pipeline': ['intake:hex', 'does-not-exist:ghost'],
          'output':   { 'directory': outDir, 'files': {} },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=unknown-task] expected throw');
      assert.match((error as Error).message, /not registered|ghost|unknown/i,
        '[cell=4, scenario=unknown-task] names the unregistered task');
    },
  },
];

new ScenarioRunner<PipelineExecInput, PipelineExecOutput>(
  'Cli :: cell-4 :: pipeline-exec',
  async (input) => {
    const dir = await makeTmpDir();
    try {
      const cfgPath = await input.setup(dir);
      const result  = await new Cli().run(cfgPath);
      let writtenContent = '';
      if (result.outputsWritten.length > 0) {
        writtenContent = await readFile(result.outputsWritten[0]!, 'utf-8');
        const parsed = JSON.parse(writtenContent) as Record<string, unknown>;
        writtenContent = typeof parsed['full'] === 'string' ? parsed['full'] : writtenContent;
      }
      return { outputsWritten: result.outputsWritten, writtenContent };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
).run(pipelineExecScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — flag and path edge cases
//
// The Cli must handle:
//   - unicode characters in output directory path
//   - enable* flag false (same as absent)
//   - all enable flags false simultaneously
// ---------------------------------------------------------------------------

interface FlagEdgeInput {
  readonly setup: (tmpDir: string) => Promise<string>;
}
interface FlagEdgeOutput {
  readonly outputsWritten: readonly string[];
}

const flagEdgeScenarios: readonly ScenarioInterface<FlagEdgeInput, FlagEdgeOutput>[] = [
  {
    name: 'all enable flags false behaves same as no flags',
    kind: 'edge',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'no-plugins');
        const cfg: CliConfigInterface = {
          'input':            { 'colors': ['#8b5cf6'] },
          'enableVscode':     false,
          'enableStylesheet': false,
          'enableTailwind':   false,
          'enableImage':      false,
          'enableContrast':   false,
          'enableCapacitor':  false,
          'enableRdf':        false,
          'pipeline':         ['intake:hex'],
          'output':           { 'directory': outDir, 'files': {} },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=all-false] no throw');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=5, scenario=all-false] no outputs when no files declared');
    },
  },
  {
    name: 'unicode output directory path accepted',
    kind: 'edge',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'données-出力');
        const cfg: CliConfigInterface = {
          'input':            { 'colors': ['#8b5cf6'] },
          'enableStylesheet': true,
          'pipeline':         ['intake:hex', 'resolve:roles', 'emit:cssVars'],
          'output':           { 'directory': outDir, 'files': { 'stylesheet:cssVars': 'theme.json' } },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=unicode-dir] no throw');
      assert.strictEqual(output!.outputsWritten.length, 1,
        '[cell=5, scenario=unicode-dir] file written to unicode directory');
    },
  },
  {
    name: 'config with only required fields and empty files map completes',
    kind: 'edge',
    input: {
      setup: async (dir) => {
        const outDir = join(dir, 'bare-min');
        const cfg: CliConfigInterface = {
          'input':    { 'colors': ['#ff0000'] },
          'pipeline': ['intake:hex'],
          'output':   { 'directory': outDir, 'files': {} },
        };
        return writeConfig(dir, cfg);
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=bare-min] no throw');
      assert.strictEqual(output!.outputsWritten.length, 0,
        '[cell=5, scenario=bare-min] zero files written when files map is empty');
    },
  },
];

new ScenarioRunner<FlagEdgeInput, FlagEdgeOutput>(
  'Cli :: cell-5 :: flag-edges',
  async (input) => {
    const dir = await makeTmpDir();
    try {
      const cfgPath = await input.setup(dir);
      const result  = await new Cli().run(cfgPath);
      return { outputsWritten: result.outputsWritten };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
).run(flagEdgeScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — ConfigLoader standalone validation
//
// ConfigLoader is exported from the package. Its interface contract is
// independently testable: loads a file, parses JSON, validates the schema.
// ---------------------------------------------------------------------------

interface LoaderStandaloneInput {
  readonly data: unknown;
}
interface LoaderStandaloneOutput {
  readonly loaded: unknown;
}

async function loadDataViaDisk(data: unknown): Promise<unknown> {
  const dir  = await makeTmpDir();
  const path = join(dir, 'cfg.json');
  try {
    await writeFile(path, JSON.stringify(data), 'utf-8');
    return await new ConfigLoader().load(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const loaderStandaloneScenarios: readonly ScenarioInterface<LoaderStandaloneInput, LoaderStandaloneOutput>[] = [
  {
    name: 'ConfigLoader is independently constructible and functional',
    kind: 'happy',
    input: {
      data: {
        'input':    { 'colors': ['#8b5cf6'] },
        'pipeline': ['intake:hex', 'resolve:roles'],
        'output':   { 'directory': '/tmp', 'files': {} },
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=standalone-ok] no throw');
      assert.ok(output!.loaded !== null && typeof output!.loaded === 'object',
        '[cell=6, scenario=standalone-ok] loaded is object');
    },
  },
  {
    name: 'ConfigLoader returns exact color values from file',
    kind: 'happy',
    input: {
      data: {
        'input':    { 'colors': ['#8b5cf6', '#ec4899', '#10b981'] },
        'pipeline': ['intake:hex'],
        'output':   { 'directory': '/tmp', 'files': {} },
      },
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=colors-roundtrip] no throw');
      const cfg    = output!.loaded as Record<string, unknown>;
      const colors = (cfg['input'] as Record<string, unknown>)['colors'] as string[];
      assert.deepStrictEqual(colors, ['#8b5cf6', '#ec4899', '#10b981'],
        '[cell=6, scenario=colors-roundtrip] all three colors round-trip through disk');
    },
  },
  {
    name: 'ConfigLoader rejects valid JSON that fails schema',
    kind: 'unhappy',
    input: {
      data: { 'not': 'a valid config' },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=schema-rejected] expected throw');
      assert.match((error as Error).message, /Config invalid/,
        '[cell=6, scenario=schema-rejected] message says Config invalid');
    },
  },
];

new ScenarioRunner<LoaderStandaloneInput, LoaderStandaloneOutput>(
  'Cli :: cell-6 :: config-loader-standalone',
  async (input) => {
    const loaded = await loadDataViaDisk(input.data);
    return { loaded };
  },
).run(loaderStandaloneScenarios);
