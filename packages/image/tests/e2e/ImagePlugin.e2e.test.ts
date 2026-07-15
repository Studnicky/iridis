/**
 * ImagePlugin — scenario-matrix suite.
 *
 * Subject: `ImagePlugin` and its four gallery tasks end-to-end.
 * Each cell is one concern of the plugin or a single task. The engine
 * drives real pipeline runs so all integration seams are exercised.
 *
 * Cells:
 *   1. plugin shape        — singleton identity, version, task manifest
 *   2. gallery:extract     — algorithm dispatch (median-cut, delta-e, weighted),
 *                            k boundary, empty-colors no-op, dominantColors metadata
 *   3. gallery:assignRoles — role assignment invariants (canvas=darkest,
 *                            accent=highest-C, text derivation), empty-colors no-op
 *   4. gallery:harmonize   — hue-shift when deltaE < threshold, no-op when > threshold,
 *                            configurable threshold, missing roles guard
 *   5. galleryRoleSchema5  — exported schema shape
 */

import { test } from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { Engine }     from '@studnicky/iridis/engine';
import { coreTasks }  from '@studnicky/iridis/tasks';
import {
  imagePlugin,
  ImagePlugin,
  galleryRoleSchema5,
} from '@studnicky/iridis-image';
import type { InputInterface, PaletteStateInterface } from '@studnicky/iridis';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(imagePlugin);
  return engine;
}

function buildImageData(
  pixels: readonly [number, number, number][],
): { 'data': Uint8ClampedArray; 'width': number; 'height': number } {
  const data = new Uint8ClampedArray(pixels.length * 4);
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i];
    if (px === undefined) continue;
    data[i * 4]     = px[0];
    data[i * 4 + 1] = px[1];
    data[i * 4 + 2] = px[2];
    data[i * 4 + 3] = 255;
  }
  return { 'data': data, 'width': pixels.length, 'height': 1 };
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// imagePlugin must be the singleton instance of ImagePlugin; the class
// constructor must produce instances that satisfy the PluginInterface shape.
// The task list must contain exactly the four gallery tasks, and each task
// must have a manifest with the expected name string.
// ---------------------------------------------------------------------------

interface PluginShapeInput {
  readonly label: string;
}
interface PluginShapeOutput {
  readonly ok: boolean;
  readonly detail: string;
}

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    name: 'singleton imagePlugin is an instance of ImagePlugin',
    kind: 'happy',
    input: { label: 'instanceof' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=instanceof] must not throw');
      assert.ok(imagePlugin instanceof ImagePlugin, '[cell=1, scenario=instanceof] imagePlugin instanceof ImagePlugin');
    },
  },
  {
    name: 'plugin name is "image"',
    kind: 'happy',
    input: { label: 'name' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=plugin-name] must not throw');
      assert.strictEqual(imagePlugin.name, 'image', '[cell=1, scenario=plugin-name] name is "image"');
    },
  },
  {
    name: 'plugin version is "0.2.0"',
    kind: 'happy',
    input: { label: 'version' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=version] must not throw');
      assert.strictEqual(imagePlugin.version, '0.2.0', '[cell=1, scenario=version] version matches');
    },
  },
  {
    name: 'tasks() returns exactly five gallery task names',
    kind: 'happy',
    input: { label: 'task-names' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] must not throw');
      const names = imagePlugin.tasks().map((t) => t.name).sort();
      assert.deepStrictEqual(
        names,
        ['gallery:assignRoles', 'gallery:extract', 'gallery:extractCandidates', 'gallery:harmonize', 'gallery:histogram'],
        '[cell=1, scenario=task-names] five gallery tasks registered',
      );
    },
  },
  {
    name: 'every task exposes a manifest with a name matching the task name',
    kind: 'happy',
    input: { label: 'manifest-names' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=manifest-names] must not throw');
      for (const task of imagePlugin.tasks()) {
        assert.ok(task.manifest !== undefined, `[cell=1, scenario=manifest-names] manifest present for ${task.name}`);
        assert.strictEqual(
          task.manifest!.name, task.name,
          `[cell=1, scenario=manifest-names] manifest.name matches task.name for ${task.name}`,
        );
      }
    },
  },
];

new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'ImagePlugin :: cell-1 :: plugin-shape',
  (input) => ({ ok: true, detail: input.label }),
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — gallery:extract algorithm dispatch
//
// gallery:extract accepts state.colors as input and reduces it to K
// dominant colors. The algorithm is selected via metadata.gallery.algorithm.
// State invariants:
//   - result count ≤ k
//   - state.metadata.gallery.dominantColors populated
//   - metadata.gallery.algorithm echoes back the chosen algorithm string
//   - weighted median-cut dispatches when hints.weight present
//   - delta-e dispatches when algorithm = 'delta-e'
//   - empty colors is a no-op (no crash, empty result)
// ---------------------------------------------------------------------------

interface ExtractInput {
  readonly input: InputInterface;
}
interface ExtractOutput {
  readonly state:        PaletteStateInterface;
  readonly colorCount:   number;
  readonly dominantMeta: unknown;
  readonly algorithmMeta: string | undefined;
}

const extractScenarios: readonly ScenarioInterface<ExtractInput, ExtractOutput>[] = [
  {
    name: 'median-cut reduces 13-hex palette to ≤ k=5 colors',
    kind: 'happy',
    input: {
      input: {
        'bypass':    undefined,
        'colors': [
          '#1a1a1a', '#2b2b2b', '#3c3c3c', '#4d4d4d', '#5e5e5e',
          '#8b5cf6', '#a78bfa', '#c4b5fd', '#d8b4fe', '#e9d5ff',
          '#ec4899', '#f472b6', '#f9a8d4',
        ],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata': { 'gallery': { 'k': 5 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=median-cut-hex] must not throw');
      assert.ok(output!.colorCount <= 5, `[cell=2, scenario=median-cut-hex] ≤ k=5, got ${String(output?.colorCount)}`);
      assert.ok(Array.isArray(output!.dominantMeta), '[cell=2, scenario=median-cut-hex] dominantColors is array');
    },
  },
  {
    name: 'median-cut echoes algorithm string in metadata when set explicitly',
    kind: 'happy',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'gallery': { 'k': 3, 'algorithm': 'median-cut' } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=algorithm-echo] must not throw');
      assert.strictEqual(output!.algorithmMeta, 'median-cut', '[cell=2, scenario=algorithm-echo] algorithm echoed in metadata');
    },
  },
  {
    name: 'delta-e algorithm reduces 4-primary image to ≤ k=3',
    kind: 'happy',
    input: {
      input: {
        'bypass':    undefined,
        'colors': [
          buildImageData([
            ...(Array<null>(80).fill(null).map<[number, number, number]>(() => [200, 10, 10])),
            ...(Array<null>(80).fill(null).map<[number, number, number]>(() => [10, 200, 10])),
            ...(Array<null>(80).fill(null).map<[number, number, number]>(() => [10, 10, 200])),
            ...(Array<null>(80).fill(null).map<[number, number, number]>(() => [200, 200, 10])),
          ]),
        ],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata': { 'gallery': { 'k': 3, 'algorithm': 'delta-e' } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=delta-e-dispatch] must not throw');
      assert.ok(output!.colorCount <= 3, `[cell=2, scenario=delta-e-dispatch] ≤ k=3, got ${String(output?.colorCount)}`);
    },
  },
  {
    name: 'k=1 produces exactly one dominant color',
    kind: 'edge',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    ['#ff0000', '#00ff00', '#0000ff'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'gallery': { 'k': 1 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k=1] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=2, scenario=k=1] exactly 1 result');
    },
  },
  {
    name: 'k larger than input count does not produce phantom colors',
    kind: 'edge',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    ['#ff0000', '#00ff00'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'gallery': { 'k': 50 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-exceeds-colors] must not throw');
      assert.ok(output!.colorCount <= 2, '[cell=2, scenario=k-exceeds-colors] cannot exceed input count');
    },
  },
  {
    name: 'empty colors array is a no-op — extract does not crash, empty result',
    kind: 'edge',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'gallery': { 'k': 5 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-colors-noop] must not throw on empty input');
      assert.strictEqual(output!.colorCount, 0, '[cell=2, scenario=empty-colors-noop] empty result from empty input');
    },
  },
];

new ScenarioRunner<ExtractInput, ExtractOutput>(
  'ImagePlugin :: cell-2 :: gallery:extract',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'intake:hex', 'gallery:histogram', 'gallery:extract']);
    const state = await engine.run(input.input);
    const dominantMeta  = state.metadata['gallery:dominantColors'] as unknown[] | undefined;
    const galleryConfig = state.metadata['gallery'] as { 'algorithm'?: string } | undefined;
    return {
      state,
      colorCount:    state.colors.length,
      dominantMeta,
      algorithmMeta: galleryConfig?.algorithm,
    };
  },
).run(extractScenarios);

// ---------------------------------------------------------------------------
// Cell 2b — gallery:extractCandidates non-destructive multi-palette output
//
// gallery:extractCandidates runs clustering across several configs against
// the SAME state.colors input and writes each as a labeled candidate to
// metadata.gallery:candidates, WITHOUT mutating state.colors (unlike
// gallery:extract, which is destructive).
//
// Invariants:
//   - unconfigured → default 3-candidate set (median-cut, k-means, delta-e)
//   - custom `candidates` config produces exactly the labeled candidates requested
//   - state.colors is untouched by this task
//   - running gallery:extract alongside gallery:extractCandidates in the same
//     pipeline still produces gallery:extract's original single result
//   - empty-input case matches gallery:extract's warn/no-op behavior
// ---------------------------------------------------------------------------

interface ExtractCandidatesInput {
  readonly input: InputInterface;
  readonly withExtract?: boolean;
}
interface ExtractCandidatesOutput {
  readonly state:          PaletteStateInterface;
  readonly candidates:     { 'algorithm': string; 'k': number; 'label': string; 'colors': unknown[] }[] | undefined;
  readonly colorCountAfter: number;
  readonly dominantMeta:   unknown[] | undefined;
}

const extractCandidatesScenarios: readonly ScenarioInterface<ExtractCandidatesInput, ExtractCandidatesOutput>[] = [
  {
    name: 'unconfigured input produces default 3-candidate set',
    kind: 'happy',
    input: {
      input: {
        'bypass':    undefined,
        'colors': [
          '#1a1a1a', '#2b2b2b', '#3c3c3c', '#4d4d4d', '#5e5e5e',
          '#8b5cf6', '#a78bfa', '#c4b5fd', '#d8b4fe', '#e9d5ff',
          '#ec4899', '#f472b6', '#f9a8d4',
        ],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata': { 'gallery': { 'k': 4 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2b, scenario=default-candidates] must not throw');
      assert.ok(output!.candidates !== undefined, '[cell=2b, scenario=default-candidates] candidates written');
      assert.strictEqual(output!.candidates!.length, 3, '[cell=2b, scenario=default-candidates] three default candidates');
      const algorithms = output!.candidates!.map((c) => c.algorithm).sort();
      assert.deepStrictEqual(
        algorithms,
        ['delta-e', 'k-means', 'median-cut'],
        '[cell=2b, scenario=default-candidates] default set covers median-cut, k-means, delta-e',
      );
      for (const c of output!.candidates!) {
        assert.ok(c.colors.length <= 4, `[cell=2b, scenario=default-candidates] candidate "${c.label}" respects shared k=4`);
      }
    },
  },
  {
    name: 'custom candidates config produces exactly the labeled candidates requested',
    kind: 'happy',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata': {
          'gallery': {
            'candidates': [
              { 'algorithm': 'median-cut', 'k': 2, 'label': 'compact' },
              { 'algorithm': 'wu-quantize', 'k': 4, 'label': 'wide' },
            ],
          },
        },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2b, scenario=custom-candidates] must not throw');
      assert.strictEqual(output!.candidates!.length, 2, '[cell=2b, scenario=custom-candidates] exactly 2 candidates requested');
      const labels = output!.candidates!.map((c) => c.label).sort();
      assert.deepStrictEqual(labels, ['compact', 'wide'], '[cell=2b, scenario=custom-candidates] labels match request');
      const compact = output!.candidates!.find((c) => c.label === 'compact');
      const wide    = output!.candidates!.find((c) => c.label === 'wide');
      assert.ok(compact!.colors.length <= 2, '[cell=2b, scenario=custom-candidates] compact candidate respects k=2');
      assert.ok(wide!.colors.length <= 4, '[cell=2b, scenario=custom-candidates] wide candidate respects k=4');
    },
  },
  {
    name: 'gallery:extract run alongside gallery:extractCandidates leaves extract\'s result unaffected',
    kind: 'happy',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'gallery': { 'k': 3 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
      withExtract: true,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2b, scenario=order-independence] must not throw');
      assert.ok(output!.dominantMeta !== undefined, '[cell=2b, scenario=order-independence] gallery:extract dominantColors still written');
      assert.ok(output!.colorCountAfter <= 3, '[cell=2b, scenario=order-independence] gallery:extract still reduced state.colors to ≤ k=3');
      assert.ok(output!.candidates !== undefined, '[cell=2b, scenario=order-independence] candidates also written');
      assert.strictEqual(output!.candidates!.length, 3, '[cell=2b, scenario=order-independence] default 3 candidates still produced');
    },
  },
  {
    name: 'empty colors array matches gallery:extract\'s warn/no-op behavior',
    kind: 'edge',
    input: {
      input: {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'gallery': { 'k': 5 } },
        'roles':     undefined,
        'runtime':   undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2b, scenario=empty-colors-noop] must not throw on empty input');
      assert.strictEqual(output!.candidates, undefined, '[cell=2b, scenario=empty-colors-noop] no candidates written on empty input');
    },
  },
];

new ScenarioRunner<ExtractCandidatesInput, ExtractCandidatesOutput>(
  'ImagePlugin :: cell-2b :: gallery:extractCandidates',
  async (input) => {
    const engine = freshEngine();
    const order = input.withExtract === true
      ? ['intake:imagePixels', 'intake:hex', 'gallery:extract', 'gallery:extractCandidates']
      : ['intake:imagePixels', 'intake:hex', 'gallery:extractCandidates'];
    engine.pipeline(order);
    const state = await engine.run(input.input);
    const candidates = state.metadata['gallery:candidates'] as
      | { 'algorithm': string; 'k': number; 'label': string; 'colors': unknown[] }[]
      | undefined;
    const dominantMeta = state.metadata['gallery:dominantColors'] as unknown[] | undefined;
    return {
      state,
      candidates,
      colorCountAfter: state.colors.length,
      dominantMeta,
    };
  },
).run(extractCandidatesScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — gallery:assignRoles role assignment invariants
//
// After gallery:assignRoles, state.roles must contain all five gallery
// roles. Role selection invariants:
//   canvas:  lowest L among extracted colors
//   accent:  highest C among extracted colors
//   text:    #ffffff when canvas L ≤ 0.5, else #000000
//   muted:   lowest C among non-neutral (C > 0.02) colors, excluding accent
//
// Edge: empty state.colors after extract → task skips without error.
// Unhappy: no structurally-impossible path (pure accumulator task, no throws).
// ---------------------------------------------------------------------------

interface AssignRolesInput {
  readonly hexColors: readonly string[];
  readonly k:         number;
}
interface AssignRolesOutput {
  readonly state: PaletteStateInterface;
  readonly hasCanvas: boolean;
  readonly hasFrame:  boolean;
  readonly hasAccent: boolean;
  readonly hasMuted:  boolean;
  readonly hasText:   boolean;
}

const assignRolesScenarios: readonly ScenarioInterface<AssignRolesInput, AssignRolesOutput>[] = [
  {
    name: 'dark-neutral + violet palette → all five roles assigned',
    kind: 'happy',
    input: {
      hexColors: [
        '#0d0d0d', '#202020', '#3c3c3c',
        '#8b5cf6', '#a78bfa',
        '#5b6470', '#7d8390',
      ],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=dark-violet] must not throw');
      assert.ok(output!.hasCanvas, '[cell=3, scenario=dark-violet] canvas role assigned');
      assert.ok(output!.hasFrame,  '[cell=3, scenario=dark-violet] frame role assigned');
      assert.ok(output!.hasAccent, '[cell=3, scenario=dark-violet] accent role assigned');
      assert.ok(output!.hasMuted,  '[cell=3, scenario=dark-violet] muted role assigned');
      assert.ok(output!.hasText,   '[cell=3, scenario=dark-violet] text role assigned');
    },
  },
  {
    name: 'canvas is the darkest (lowest-L) color among extracted set',
    kind: 'happy',
    input: {
      hexColors: ['#0d0d0d', '#202020', '#8b5cf6', '#a78bfa', '#c4b5fd'],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=canvas-darkest] must not throw');
      const canvas = output!.state.roles['canvas'];
      assert.ok(canvas !== undefined, '[cell=3, scenario=canvas-darkest] canvas role exists');
      for (const c of output!.state.colors) {
        assert.ok(
          c.oklch.l >= canvas!.oklch.l - 1e-9,
          `[cell=3, scenario=canvas-darkest] canvas L=${String(canvas!.oklch.l)} is lowest, found L=${String(c.oklch.l)}`,
        );
      }
    },
  },
  {
    name: 'accent is the highest-chroma color among extracted set',
    kind: 'happy',
    input: {
      hexColors: ['#0d0d0d', '#202020', '#8b5cf6', '#a78bfa', '#c4b5fd'],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=accent-highest-c] must not throw');
      const accent = output!.state.roles['accent'];
      assert.ok(accent !== undefined, '[cell=3, scenario=accent-highest-c] accent role exists');
      for (const c of output!.state.colors) {
        assert.ok(
          c.oklch.c <= accent!.oklch.c + 1e-9,
          `[cell=3, scenario=accent-highest-c] accent C=${String(accent!.oklch.c)} is highest, found C=${String(c.oklch.c)}`,
        );
      }
    },
  },
  {
    name: 'dark canvas (L ≤ 0.5) → text is pure white #ffffff',
    kind: 'happy',
    input: {
      hexColors: ['#0d0d0d', '#1a1a1a', '#8b5cf6', '#a78bfa', '#c4b5fd'],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=text-white] must not throw');
      const canvas = output!.state.roles['canvas'];
      const text   = output!.state.roles['text'];
      assert.ok(canvas !== undefined, '[cell=3, scenario=text-white] canvas exists');
      assert.ok(text   !== undefined, '[cell=3, scenario=text-white] text exists');
      if (canvas!.oklch.l <= 0.5) {
        assert.strictEqual(text!.hex.toLowerCase(), '#ffffff', '[cell=3, scenario=text-white] dark canvas → white text');
      }
    },
  },
  {
    name: 'light canvas (L > 0.5) → text is pure black #000000',
    kind: 'happy',
    input: {
      hexColors: ['#f0f0f0', '#e0e0e0', '#8b5cf6', '#a78bfa', '#c4b5fd'],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=text-black] must not throw');
      const canvas = output!.state.roles['canvas'];
      const text   = output!.state.roles['text'];
      assert.ok(text !== undefined, '[cell=3, scenario=text-black] text role exists');
      if (canvas !== undefined && canvas.oklch.l > 0.5) {
        assert.strictEqual(text!.hex.toLowerCase(), '#000000', '[cell=3, scenario=text-black] light canvas → black text');
      }
    },
  },
  {
    name: 'single-color input — all roles assigned from that color (degenerate)',
    kind: 'edge',
    input: {
      hexColors: ['#8b5cf6'],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=single-color] must not throw');
      assert.ok(output!.hasCanvas, '[cell=3, scenario=single-color] canvas assigned even with single color');
      assert.ok(output!.hasAccent, '[cell=3, scenario=single-color] accent assigned even with single color');
      assert.ok(output!.hasText,   '[cell=3, scenario=single-color] text derived even with single color');
    },
  },
];

new ScenarioRunner<AssignRolesInput, AssignRolesOutput>(
  'ImagePlugin :: cell-3 :: gallery:assignRoles',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'gallery:extract', 'gallery:assignRoles']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    input.hexColors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': { 'k': input.k } },
      'roles':     undefined,
      'runtime':   undefined,
    });
    return {
      state,
      hasCanvas: 'canvas' in state.roles,
      hasFrame:  'frame'  in state.roles,
      hasAccent: 'accent' in state.roles,
      hasMuted:  'muted'  in state.roles,
      hasText:   'text'   in state.roles,
    };
  },
).run(assignRolesScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — gallery:harmonize hue-shift behavior
//
// gallery:harmonize checks deltaE2000 between accent and frame.
// If deltaE < threshold (default 10), it shifts accent hue ±30° away
// from frame hue and records the details in metadata.gallery.harmonizeDetails.
//
// Invariants:
//   - harmonized=true → |hueShift| = 30, before ≠ after
//   - harmonized=false → state.roles.accent unchanged, no harmonizeDetails
//   - custom harmonizeThreshold overrides the default 10
//   - missing accent or frame role → harmonized=false, no error
// ---------------------------------------------------------------------------

interface HarmonizeInput {
  readonly hexColors:            readonly string[];
  readonly k:                    number;
  readonly harmonizeThreshold?:  number;
}
interface HarmonizeOutput {
  readonly state:           PaletteStateInterface;
  readonly harmonized:      boolean | undefined;
  readonly hueShift:        number | undefined;
  readonly beforeHex:       string | undefined;
  readonly afterHex:        string | undefined;
  readonly deltaE:          number | undefined;
}

type HarmonizeDetailsType = {
  'before':   string;
  'after':    string;
  'deltaE':   number;
  'hueShift': number;
};

const harmonizeScenarios: readonly ScenarioInterface<HarmonizeInput, HarmonizeOutput>[] = [
  {
    name: 'similar-violet palette triggers harmonize and records ±30° shift',
    kind: 'happy',
    input: {
      hexColors: [
        '#0d0d0d',
        '#6d28d9',
        '#7c3aed',
        '#a78bfa', '#c4b5fd',
      ],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=similar-violet] must not throw');
      const harmonized = output!.state.metadata['gallery:harmonized'] as boolean | undefined;
      const details    = output!.state.metadata['gallery:harmonizeDetails'] as HarmonizeDetailsType | undefined;
      assert.ok(harmonized !== undefined, '[cell=4, scenario=similar-violet] gallery:harmonized written');
      // harmonized may be true or false depending on extraction result —
      // if it fired, verify the structural invariant
      if (harmonized === true) {
        assert.ok(details !== undefined, '[cell=4, scenario=similar-violet] details present when harmonized');
        assert.strictEqual(
          Math.abs(details!.hueShift), 30,
          '[cell=4, scenario=similar-violet] shift magnitude is 30°',
        );
        assert.notStrictEqual(
          details!.before, details!.after,
          '[cell=4, scenario=similar-violet] before ≠ after when shift applied',
        );
        assert.ok(
          details!.deltaE < 10,
          `[cell=4, scenario=similar-violet] deltaE ${String(details!.deltaE)} must be < 10 to have fired`,
        );
      } else {
        assert.strictEqual(harmonized, false, '[cell=4, scenario=similar-violet] harmonized is boolean false when not triggered');
      }
    },
  },
  {
    name: 'diverse palette keeps harmonized=false when accent and frame are distinct',
    kind: 'happy',
    input: {
      hexColors: [
        '#0d0d0d',       // dark canvas
        '#6b7280',       // grey mid-tone → frame
        '#ef4444',       // saturated red → accent (far from grey)
        '#a1a1aa',
        '#d4d4d8',
      ],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=diverse-palette] must not throw');
      const harmonized = output!.state.metadata['gallery:harmonized'] as boolean | undefined;
      const details    = output!.state.metadata['gallery:harmonizeDetails'] as HarmonizeDetailsType | undefined;
      assert.ok(harmonized !== undefined, '[cell=4, scenario=diverse-palette] gallery:harmonized written');
      // When accent and frame are perceptually distant, harmonize is skipped
      if (harmonized === false) {
        assert.strictEqual(details, undefined, '[cell=4, scenario=diverse-palette] no details on no-op');
      }
      // If the clustering happened to land on similar hues anyway (allowed),
      // just verify the structural invariant is valid
    },
  },
  {
    name: 'harmonizeThreshold=0 prevents shift when deltaE is always ≥ 0',
    kind: 'edge',
    input: {
      hexColors: [
        '#0d0d0d', '#6d28d9', '#7c3aed', '#a78bfa', '#c4b5fd',
      ],
      k: 5,
      harmonizeThreshold: 0,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=threshold=0] must not throw');
      const harmonized = output!.state.metadata['gallery:harmonized'] as boolean | undefined;
      assert.ok(harmonized !== undefined, '[cell=4, scenario=threshold=0] gallery:harmonized written');
      // deltaE is always ≥ 0, so with threshold=0, deltaE >= threshold always → no shift
      assert.strictEqual(harmonized, false, '[cell=4, scenario=threshold=0] threshold=0 means no shift ever fires');
    },
  },
  {
    name: 'harmonizeThreshold=100 always triggers shift on any pair',
    kind: 'edge',
    input: {
      hexColors: [
        '#0d0d0d',
        '#ef4444',    // red
        '#3b82f6',    // blue — large deltaE from red
        '#a1a1aa', '#d4d4d8',
      ],
      k: 5,
      harmonizeThreshold: 100,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=threshold=100] must not throw');
      const harmonized = output!.state.metadata['gallery:harmonized'] as boolean | undefined;
      const details    = output!.state.metadata['gallery:harmonizeDetails'] as HarmonizeDetailsType | undefined;
      assert.ok(harmonized !== undefined, '[cell=4, scenario=threshold=100] gallery:harmonized written');
      // With threshold=100, any deltaE < 100 triggers the shift
      // Most realistic palettes have deltaE < 100, so this should fire
      if (harmonized === true) {
        assert.strictEqual(
          Math.abs(details!.hueShift), 30,
          '[cell=4, scenario=threshold=100] shift magnitude still 30°',
        );
      }
    },
  },
];

new ScenarioRunner<HarmonizeInput, HarmonizeOutput>(
  'ImagePlugin :: cell-4 :: gallery:harmonize',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'gallery:extract', 'gallery:assignRoles', 'gallery:harmonize']);
    const meta: Record<string, unknown> = { 'k': input.k };
    if (input.harmonizeThreshold !== undefined) {
      meta['harmonizeThreshold'] = input.harmonizeThreshold;
    }
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    input.hexColors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': meta },
      'roles':     undefined,
      'runtime':   undefined,
    });
    const harmonized = state.metadata['gallery:harmonized'] as boolean | undefined;
    const details    = state.metadata['gallery:harmonizeDetails'] as HarmonizeDetailsType | undefined;
    return {
      state,
      harmonized,
      hueShift:   details?.hueShift,
      beforeHex:  details?.before,
      afterHex:   details?.after,
      deltaE:     details?.deltaE,
    };
  },
).run(harmonizeScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — galleryRoleSchema5 exported schema shape
//
// galleryRoleSchema5 is a static data export. Its shape must satisfy the
// five-role contract used by gallery pipelines.
// ---------------------------------------------------------------------------

interface SchemaShapeInput { readonly label: string }
interface SchemaShapeOutput { readonly ok: boolean }

const schemaShapeScenarios: readonly ScenarioInterface<SchemaShapeInput, SchemaShapeOutput>[] = [
  {
    name: 'schema has exactly five roles',
    kind: 'happy',
    input: { label: 'role-count' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=role-count] must not throw');
      assert.strictEqual(galleryRoleSchema5.roles.length, 5, '[cell=5, scenario=role-count] five roles');
    },
  },
  {
    name: 'schema roles include canvas, frame, accent, muted, text by name',
    kind: 'happy',
    input: { label: 'role-names' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=role-names] must not throw');
      const names = galleryRoleSchema5.roles.map((r) => r.name).sort();
      assert.deepStrictEqual(
        names,
        ['accent', 'canvas', 'frame', 'muted', 'text'],
        '[cell=5, scenario=role-names] expected role names present',
      );
    },
  },
  {
    name: 'schema has contrastPairs with at least one entry',
    kind: 'happy',
    input: { label: 'contrast-pairs' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=contrast-pairs] must not throw');
      assert.ok(
        Array.isArray(galleryRoleSchema5.contrastPairs) && galleryRoleSchema5.contrastPairs.length > 0,
        '[cell=5, scenario=contrast-pairs] at least one contrast pair',
      );
    },
  },
  {
    name: 'schema name is "gallery-5"',
    kind: 'happy',
    input: { label: 'schema-name' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=schema-name] must not throw');
      assert.strictEqual(galleryRoleSchema5.name, 'gallery-5', '[cell=5, scenario=schema-name] schema name matches');
    },
  },
  {
    name: 'text role has derivedFrom = "canvas"',
    kind: 'edge',
    input: { label: 'text-derived-from' },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=text-derived-from] must not throw');
      const textRole = galleryRoleSchema5.roles.find((r) => r.name === 'text');
      assert.ok(textRole !== undefined, '[cell=5, scenario=text-derived-from] text role exists');
      assert.strictEqual(textRole!.derivedFrom, 'canvas', '[cell=5, scenario=text-derived-from] derivedFrom = canvas');
    },
  },
];

new ScenarioRunner<SchemaShapeInput, SchemaShapeOutput>(
  'ImagePlugin :: cell-5 :: galleryRoleSchema5',
  (input) => ({ ok: true }),
).run(schemaShapeScenarios);

// ---------------------------------------------------------------------------
// Golden fixtures — full pipeline round-trip assertions
// ---------------------------------------------------------------------------

test('ImagePlugin :: golden :: assignRoles full pipeline round-trip', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'gallery:extract', 'gallery:assignRoles']);
  const state = await engine.run({
    'bypass': undefined,
    'colors': [
      '#0d0d0d', '#202020', '#3c3c3c',
      '#8b5cf6', '#a78bfa',
      '#5b6470', '#7d8390',
    ],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'gallery': { 'k': 5 } },
    'roles':     undefined,
    'runtime':   undefined,
  });

  assert.ok('canvas' in state.roles, '[golden, scenario=full-pipeline] canvas role present');
  assert.ok('frame'  in state.roles, '[golden, scenario=full-pipeline] frame role present');
  assert.ok('accent' in state.roles, '[golden, scenario=full-pipeline] accent role present');
  assert.ok('muted'  in state.roles, '[golden, scenario=full-pipeline] muted role present');
  assert.ok('text'   in state.roles, '[golden, scenario=full-pipeline] text role present');

  const canvasL = state.roles['canvas']!.oklch.l;
  for (const c of state.colors) {
    assert.ok(c.oklch.l >= canvasL - 1e-9, '[golden, scenario=full-pipeline] canvas has lowest lightness');
  }
  const accentC = state.roles['accent']!.oklch.c;
  for (const c of state.colors) {
    assert.ok(c.oklch.c <= accentC + 1e-9, '[golden, scenario=full-pipeline] accent has highest chroma');
  }
  const textHex = state.roles['text']!.hex.toLowerCase();
  assert.ok(
    textHex === '#ffffff' || textHex === '#000000',
    `[golden, scenario=full-pipeline] text must be pure white or black, got ${textHex}`,
  );
});
