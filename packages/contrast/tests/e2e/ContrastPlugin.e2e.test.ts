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
  readonly 'foreground':                 string;
  readonly 'background':                 string;
  readonly 'cvdType':                    string;
  readonly 'originalLuminanceContrast':  number;
  readonly 'simulatedLuminanceContrast': number;
  readonly 'drop':                       number;
  readonly 'dropThreshold':              number;
  readonly 'minSimulatedContrast':       number;
}
interface WcagMetaShapeInterface {
  readonly 'apca'?: { readonly 'pairs': readonly ApcaPairInterface[] };
  readonly 'aa'?:   { readonly 'pairs': readonly WcagPairInterface[] };
  readonly 'aaa'?:  { readonly 'pairs': readonly WcagPairInterface[] };
  readonly 'cvd'?:  { readonly 'warnings': readonly CvdWarningInterface[] };
}
interface ContrastReportEntryShapeInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  string;
  readonly 'ratio':      number;
  readonly 'minRatio':   number;
  readonly 'passed':     boolean;
  readonly 'adjusted':   boolean;
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
    { 'name': 'background', 'required': true, 'intent': 'background', 'lightnessRange': [0.85, 1.00], 'chromaRange': [0.00, 0.05] },
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

const ENFORCE_CONTRAST_ADJUST_ROLES: RoleSchemaInterface = {
  'name':  'enforce-contrast-adjust',
  'roles': [
    // Range is wide so EnforceContrast can lighten foreground freely.
    { 'name': 'text',       'required': true, 'lightnessRange': [0.10, 0.95], 'chromaRange': [0.00, 0.05] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.85, 1.00], 'chromaRange': [0.00, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

/* CVD test roles split candidates by lightness AND hue. The hue offset
   sets the assigned colour's H exactly; the lightness band ensures the
   distance picker selects the right input. Each seed lies inside the
   declared lightness range so `clampToRange` leaves L untouched. */
const CVD_RED_ON_GREEN_ROLES: RoleSchemaInterface = {
  /* #d00000: L=0.539, H=29   |  #008000: L=0.520, H=142 */
  'name':  'cvd-red-on-green',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.40, 0.60], 'chromaRange': [0.10, 0.40], 'hueOffset': 29 },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.40, 0.60], 'chromaRange': [0.10, 0.40], 'hueOffset': 142 },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/* Blue/yellow pair — tritanopia confusion. Distinct lightness bands
   because the inputs sit at very different luminance levels
   (blue L=0.452, yellow L=0.968). */
const CVD_BLUE_ON_YELLOW_ROLES: RoleSchemaInterface = {
  'name':  'cvd-blue-on-yellow',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.30, 0.60], 'chromaRange': [0.10, 0.40], 'hueOffset': 264 },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.85, 1.00], 'chromaRange': [0.10, 0.40], 'hueOffset': 110 },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/* Iso-luminant red/green for achromatopsia.
   #ff0000: L=0.628, H=29  |  #00d800: L=0.764, H=142 */
const CVD_ISOLUM_ROLES: RoleSchemaInterface = {
  'name':  'cvd-isolum',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.55, 0.70], 'chromaRange': [0.20, 0.30], 'hueOffset': 29 },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.70, 0.85], 'chromaRange': [0.20, 0.30], 'hueOffset': 142 },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/* Black on white — the canonical maximum-contrast pair. All four CVD
   types must produce zero warnings against the published thresholds. */
const CVD_BLACK_ON_WHITE_ROLES: RoleSchemaInterface = {
  'name':  'cvd-black-on-white',
  'roles': [
    /* black: L 0, C 0; white: L 1, C 0 — discriminate by lightness. */
    { 'name': 'text',       'required': true, 'lightnessRange': [0.00, 0.20], 'chromaRange': [0.00, 0.05] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.90, 1.00], 'chromaRange': [0.00, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
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
        // EnforceApca picks Lc 75 / 60 / 45 from role hint intents. R1.1 propagates
        // the schema's role.intent ('text' on foreground, 'surface' on background)
        // onto the resolved record's hints.intent, so the text+surface pair selects
        // the body-text Lc 75 target. The black-on-white pair clears Lc 75 by a wide margin.
        assert.strictEqual(entry.requiredLc, 75,
          `requiredLc must be 75 for a text+surface pair (got ${entry.requiredLc}); R1.1 should propagate role.intent onto hints.intent`);
        assert.ok(entry.afterLc >= entry.requiredLc,
          `afterLc ${entry.afterLc} should meet requiredLc ${entry.requiredLc}`);
        assert.strictEqual(entry.pass, true, 'pair passes the body-text Lc 75 target');
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
      'name':     'enforce:contrast — low-contrast pair flips adjusted=true and rewrites the foreground role',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:contrast'],
      'input': {
        'colors': ['#bbbbbb', '#ffffff'],
        'roles':  ENFORCE_CONTRAST_ADJUST_ROLES,
      },
      assert(state): void {
        // EnforceContrast writes a single report array under metadata.contrastReport.
        const report = state.metadata['contrastReport'] as readonly ContrastReportEntryShapeInterface[] | undefined;
        assert.ok(report !== undefined,                'metadata.contrastReport written by enforce:contrast');
        assert.strictEqual(report.length, 1,            'exactly one contrast pair processed');
        const entry = report[0]!;
        assert.strictEqual(entry.foreground, 'text');
        assert.strictEqual(entry.background, 'background');
        assert.strictEqual(entry.algorithm,  'wcag21');
        assert.strictEqual(entry.minRatio,   4.5,       'minRatio surfaces the schema pair value');
        assert.strictEqual(entry.adjusted,   true,      'failing pair flipped adjusted=true (the branch under test)');
        assert.strictEqual(entry.passed,     true,      'pair passes after adjustment');
        assert.ok(entry.ratio >= 4.5,
          `post-adjustment ratio ${entry.ratio} should be ≥ 4.5`);

        // The text role hex was rewritten by enforce:contrast.
        const textHex = state.roles['text']?.hex;
        const bgHex   = state.roles['background']?.hex;
        assert.ok(textHex !== undefined && bgHex !== undefined, 'both roles resolved');
        // Pre-enforce intake hex for the text role was #bbbbbb; after adjustment the L axis
        // shifted the role into a darker (or lighter) variant — the hex must differ from the seed.
        assert.notStrictEqual(textHex.toLowerCase(), '#bbbbbb',
          `text hex ${textHex} must differ from the original low-contrast seed #bbbbbb`);
        assert.strictEqual(bgHex.toLowerCase(), '#ffffff',
          'background role unchanged by enforce:contrast (foreground is the one adjusted)');
      },
    },
    {
      'name':     'enforce:cvdSimulate — saturated red on green raises a deuteranopia warning at the grounded threshold',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      'input': {
        // Saturated red/green — the canonical [VBM99] deuteranopia
        // confusion pair. Trichromat WCAG contrast ~1.11; deuteranopia
        // simulation collapses the chromatic difference, leaving the
        // pair indistinguishable.
        'colors': ['#d00000', '#008000'],
        'roles':  CVD_RED_ON_GREEN_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.cvd !== undefined,            'metadata.wcag.cvd written');
        assert.ok(Array.isArray(wcag.cvd.warnings),    'cvd.warnings is an array');
        const deuter = wcag.cvd.warnings.find((w) => w.cvdType === 'deuteranopia');
        assert.ok(deuter !== undefined,                'a deuteranopia warning fires for the red/green pair');
        assert.strictEqual(deuter.foreground, 'text');
        assert.strictEqual(deuter.background, 'background');
        // dropThreshold from CVD_THRESHOLDS for deuteranopia
        assert.strictEqual(deuter.dropThreshold, 0.5,
          'deuteranopia dropThreshold is the published ΔE-derived 0.5');
        assert.strictEqual(deuter.minSimulatedContrast, 3.0,
          'deuteranopia minSimulatedContrast is the WCAG-21 SC-1.4.11 floor');
        // Trichromat contrast for red-on-green is already below 3:1 ([d00000]/[008000] ≈ 1.11),
        // so the simulated contrast will also be below 3:1, firing the floor signal — and the
        // dichromacy projection will perturb that low contrast further.
        assert.ok(deuter.simulatedLuminanceContrast < deuter.minSimulatedContrast,
          `sim contrast ${deuter.simulatedLuminanceContrast} should be below the 3:1 floor for the red/green pair`);
        assert.ok(deuter.originalLuminanceContrast > 1.0,
          `original contrast ${deuter.originalLuminanceContrast} should be above 1.0`);
      },
    },
    {
      'name':     'enforce:cvdSimulate — pure red/green pair flags protanopia + deuteranopia (red/green confusion family)',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      'input': {
        // [VBM99] cite pure red/green as the textbook protanopia
        // confusion pair. The L-cone-absent projection brings the
        // red foreground far closer to the green background in
        // luminance, triggering both the drop and floor signals.
        'colors': ['#ff0000', '#00cc00'],
        'roles':  CVD_RED_ON_GREEN_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.cvd !== undefined,            'metadata.wcag.cvd written');
        const prot = wcag.cvd.warnings.find((w) => w.cvdType === 'protanopia');
        assert.ok(prot !== undefined,                'a protanopia warning fires for pure red/green');
        assert.strictEqual(prot.foreground, 'text');
        assert.strictEqual(prot.background, 'background');
        // |drop| should exceed the 0.5 protanopia threshold for this pair — the
        // L-cone-absent projection radically reshuffles luminance for saturated red.
        assert.ok(Math.abs(prot.drop) > prot.dropThreshold,
          `|drop| ${Math.abs(prot.drop)} should exceed protanopia threshold ${prot.dropThreshold}`);
        // Red/green pair always also fires deuteranopia (same confusion family).
        const deut = wcag.cvd.warnings.find((w) => w.cvdType === 'deuteranopia');
        assert.ok(deut !== undefined, 'deuteranopia warning also fires (red/green confusion is shared with protanopia)');
      },
    },
    {
      'name':     'enforce:cvdSimulate — blue/yellow pair flags tritanopia ([BVM97] confusion line)',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      'input': {
        // Classic tritanopia confusion: pure blue on pure yellow.
        // Trichromat contrast ~8:1, but the S-cone-absent projection
        // pulls the blue toward green and shrinks the contrast.
        'colors': ['#0000ff', '#ffff00'],
        'roles':  CVD_BLUE_ON_YELLOW_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.cvd !== undefined,            'metadata.wcag.cvd written');
        const trit = wcag.cvd.warnings.find((w) => w.cvdType === 'tritanopia');
        assert.ok(trit !== undefined,                'a tritanopia warning fires for the blue/yellow pair');
        assert.strictEqual(trit.foreground, 'text');
        assert.strictEqual(trit.background, 'background');
        assert.strictEqual(trit.dropThreshold, 0.5,
          'tritanopia dropThreshold matches the published 0.5 perceptible-difference value');
        // |drop| should clear the 0.5 perceptible-difference threshold for this iconic pair.
        assert.ok(Math.abs(trit.drop) > trit.dropThreshold,
          `|drop| ${Math.abs(trit.drop)} should exceed tritanopia threshold ${trit.dropThreshold}`);
      },
    },
    {
      'name':     'enforce:cvdSimulate — iso-luminant red/green flags achromatopsia via the SC-1.4.11 floor',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      'input': {
        // Saturated red and green at near-equal BT.709 luminance —
        // distinguishable to trichromats by chroma, but reduce to a
        // sub-3:1 grayscale pair for rod-monochromacy viewers.
        'colors': ['#ff0000', '#00d800'],
        'roles':  CVD_ISOLUM_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.cvd !== undefined,            'metadata.wcag.cvd written');
        const achr = wcag.cvd.warnings.find((w) => w.cvdType === 'achromatopsia');
        assert.ok(achr !== undefined,                'achromatopsia warning fires for iso-luminant red/green');
        assert.strictEqual(achr.dropThreshold, 0,
          'achromatopsia dropThreshold is 0 — BT.709 projection preserves luminance');
        assert.strictEqual(achr.minSimulatedContrast, 3.0,
          'achromatopsia minSimulatedContrast is the WCAG-21 SC-1.4.11 floor');
        // BT.709 luminance projection preserves luminance contrast exactly,
        // so the drop is identically 0 for achromatopsia. The floor signal
        // is what fires: sim contrast < 3:1.
        assert.ok(Math.abs(achr.drop) < 0.001,
          `achromatopsia drop ${achr.drop} should be ~0 by BT.709 invariance`);
        assert.ok(achr.simulatedLuminanceContrast < achr.minSimulatedContrast,
          `sim contrast ${achr.simulatedLuminanceContrast} should be below the 3:1 floor`);
      },
    },
    {
      'name':     'enforce:cvdSimulate — black-on-white passes all four CVD checks without warnings (negative case)',
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      'input': {
        // Maximum-contrast pair. Every CVD type must produce zero
        // warnings — both signals (drop magnitude AND floor) must clear.
        'colors': ['#000000', '#ffffff'],
        'roles':  CVD_BLACK_ON_WHITE_ROLES,
      },
      assert(state): void {
        const wcag = state.metadata['wcag'] as WcagMetaShapeInterface | undefined;
        assert.ok(wcag?.cvd !== undefined,            'metadata.wcag.cvd written');
        assert.ok(Array.isArray(wcag.cvd.warnings),    'cvd.warnings is an array');
        assert.strictEqual(wcag.cvd.warnings.length, 0,
          `black-on-white must produce 0 CVD warnings; got ${wcag.cvd.warnings.length}`);
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
