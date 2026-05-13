/**
 * Contrast plugin end-to-end tests.
 *
 * Drives every enforce task in the plugin through one shared engine via a
 * single scenario table. Each scenario constructs its own role schema +
 * input, runs the pipeline once, and asserts the full set of outputs +
 * metadata produced by the task under test in one `it` body.
 */
import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

import { Engine }           from '@studnicky/iridis/engine';
import { coreTasks }        from '@studnicky/iridis/tasks';
import type {
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterface,
} from '@studnicky/iridis';
import { contrastPlugin, ContrastPlugin } from '@studnicky/iridis-contrast';

interface ApcaPairInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  string;
  readonly 'requiredLc': number;
  readonly 'beforeLc':   number;
  readonly 'afterLc':    number;
  readonly 'pass':       boolean;
}
interface WcagPairInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  string;
  readonly 'required':   number;
  readonly 'before':     number;
  readonly 'after':      number;
  readonly 'pass':       boolean;
}
interface CvdWarningInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'cvdType':    string;
  readonly 'drop':       number;
}
interface WcagMetaShapeInterface {
  readonly 'apca'?: { readonly 'pairs': readonly ApcaPairInterface[] };
  readonly 'aa'?:   { readonly 'pairs': readonly WcagPairInterface[] };
  readonly 'aaa'?:  { readonly 'pairs': readonly WcagPairInterface[] };
  readonly 'cvd'?:  { readonly 'warnings': readonly CvdWarningInterface[] };
}

interface ScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(contrastPlugin);

const SIMPLE_WCAG_ROLES: RoleSchemaInterface = {
  'name':  'simple-contrast',
  'roles': [
    { 'name': 'text',       'required': true },
    { 'name': 'background', 'required': true },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

const APCA_ROLES: RoleSchemaInterface = {
  'name':  'apca-contrast',
  'roles': [
    { 'name': 'text',       'required': true, 'intent': 'text',    'lightnessRange': [0.00, 0.30], 'chromaRange': [0.00, 0.05] },
    { 'name': 'background', 'required': true, 'intent': 'surface', 'lightnessRange': [0.85, 1.00], 'chromaRange': [0.00, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1, 'algorithm': 'apca' },
  ],
};

const WCAG_AAA_ROLES: RoleSchemaInterface = {
  'name':  'aaa-contrast',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.10, 0.95], 'chromaRange': [0.00, 0.05] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.55, 0.85], 'chromaRange': [0.00, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 7.0, 'algorithm': 'wcag21' },
  ],
};

const CVD_ROLES: RoleSchemaInterface = {
  'name':  'cvd-contrast',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.00, 0.50], 'chromaRange': [0.10, 0.40] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.80, 1.00], 'chromaRange': [0.00, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};

describe('ContrastPlugin e2e :: scenarios', () => {
  const scenarios: readonly ScenarioInterface[] = [
    {
      'name':     'plugin shape — singleton + four task registrations',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA', 'emit:json'],
      'input': {
        'colors': ['#000000', '#ffffff'],
        'roles':  SIMPLE_WCAG_ROLES,
      },
      assert(state): void {
        assert.ok(contrastPlugin instanceof ContrastPlugin, 'singleton is class instance');
        assert.strictEqual(contrastPlugin.name,    'contrast');
        assert.strictEqual(contrastPlugin.version, '0.1.0');
        const taskNames = contrastPlugin.tasks().map((t) => t.name).sort();
        assert.deepStrictEqual(
          taskNames,
          ['enforce:apca', 'enforce:cvdSimulate', 'enforce:wcagAA', 'enforce:wcagAAA'],
          'plugin exposes the four canonical enforce task names',
        );
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag !== undefined,        'wcag metadata bag present');
        assert.ok(wcag.aa !== undefined,     'wcag.aa populated by enforce:wcagAA');
        assert.ok(Array.isArray(wcag.aa.pairs), 'wcag.aa.pairs is an array');
        assert.strictEqual(wcag.aa.pairs.length, 1, 'one AA pair processed');
      },
    },
    {
      'name':     'enforce:apca — black-on-white text pair meets the APCA Lc target',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca'],
      'input': {
        'colors': ['#000000', '#ffffff'],
        'roles':  APCA_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.apca !== undefined,       'metadata.wcag.apca written');
        assert.ok(Array.isArray(wcag.apca.pairs), 'apca.pairs is an array');
        assert.strictEqual(wcag.apca.pairs.length, 1, 'one APCA pair processed');
        const entry = wcag.apca.pairs[0]!;
        assert.strictEqual(entry.foreground, 'text');
        assert.strictEqual(entry.background, 'background');
        assert.strictEqual(entry.algorithm,  'apca');
        // EnforceApca picks Lc 75 / 60 / 45 from role hint intents; colors arriving via
        // intake:hex don't carry hints, so the non-text UI fallback Lc 45 applies.
        // The black-on-white pair clears any APCA target by a wide margin.
        assert.ok([45, 60, 75].includes(entry.requiredLc),
          `requiredLc ${entry.requiredLc} should be one of 45 / 60 / 75`);
        assert.ok(entry.afterLc >= entry.requiredLc,
          `afterLc ${entry.afterLc} should meet requiredLc ${entry.requiredLc}`);
        assert.strictEqual(entry.pass, true, 'pair passes the chosen APCA Lc target');
        // Black-on-white (or its inverse) has high APCA Lc magnitude regardless of which
        // role lands on which colour — the absolute Lc must be substantial.
        assert.ok(Math.abs(entry.afterLc) >= 45,
          `afterLc magnitude ${entry.afterLc} should be substantial for high-contrast pair`);
      },
    },
    {
      'name':     'enforce:wcagAAA — low-contrast pair is adjusted to ≥7:1',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA'],
      'input': {
        'colors': ['#777777', '#aaaaaa'],
        'roles':  WCAG_AAA_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.aaa !== undefined,        'metadata.wcag.aaa written');
        assert.ok(Array.isArray(wcag.aaa.pairs),  'aaa.pairs is an array');
        assert.strictEqual(wcag.aaa.pairs.length, 1, 'one AAA pair processed');
        const entry = wcag.aaa.pairs[0]!;
        assert.strictEqual(entry.foreground, 'text');
        assert.strictEqual(entry.required,   7, 'minRatio 7 surfaces as required ratio');
        assert.ok(entry.before  < entry.required, `before ${entry.before} must be < 7 for adjustment`);
        assert.ok(entry.after   >= entry.required, `after ${entry.after} should be ≥ 7 after enforce`);
        assert.strictEqual(entry.pass, true, 'pair passes after adjustment');
        // The text role hex was rewritten by enforce:wcagAAA
        const textHex = state.roles['text']?.hex;
        const bgHex   = state.roles['background']?.hex;
        assert.ok(textHex !== undefined && bgHex !== undefined, 'both roles assigned');
        assert.ok(textHex !== bgHex, 'text hex differs from background after enforce');
      },
    },
    {
      'name':     'enforce:cvdSimulate — deep-red on white raises a deuteranopia warning',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      'input': {
        'colors': ['#990000', '#ffffff'],
        'roles':  CVD_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.cvd !== undefined,            'metadata.wcag.cvd written');
        assert.ok(Array.isArray(wcag.cvd.warnings),    'cvd.warnings is an array');
        const deuter = wcag.cvd.warnings.find((w) => w.cvdType === 'deuteranopia');
        assert.ok(deuter !== undefined,                'a deuteranopia warning is present');
        assert.strictEqual(deuter.foreground, 'text');
        assert.strictEqual(deuter.background, 'background');
        assert.ok(deuter.drop > 1.0, `drop ${deuter.drop} should exceed 1.0 advisory threshold`);
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      engine.pipeline(sc.pipeline);
      const state = await engine.run(sc.input);
      sc.assert(state);
    });
  }
});
