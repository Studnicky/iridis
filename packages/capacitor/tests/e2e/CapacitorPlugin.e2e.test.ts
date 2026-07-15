/**
 * CapacitorPlugin — scenario-matrix suite.
 *
 * Subject: `CapacitorPlugin` and its four emit tasks.
 * Each cell covers one logical concern; scenarios within a cell exhaust
 * the happy / edge / unhappy matrix for that concern.
 *
 * Cells:
 *   1. plugin-shape     — singleton identity and task registration
 *   2. statusBar        — role resolution, style derivation, overlay flag
 *   3. theme            — 13-slot hex map, intent fallbacks, variant variants
 *   4. splashScreen     — backgroundColor, splashRole, androidSplashResourceName
 *   5. androidThemeXml  — XML structure, item values, statusBar cross-reference
 *   6. pipeline         — full integration: intake → resolve → all four emitters
 */

import { test }       from 'node:test';
import { Engine }     from '@studnicky/iridis/engine';
import { coreTasks }  from '@studnicky/iridis/tasks';
import { colorRecordFactory } from '@studnicky/iridis/math';
import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  TaskRegistryInterface,
  EngineInterface,
} from '@studnicky/iridis';
import type { LoggerInterface } from '@studnicky/logger/interfaces';
import type { LogDataType } from '@studnicky/logger/types';
import {
  capacitorPlugin,
  CapacitorPlugin,
} from '@studnicky/iridis-capacitor';
import {
  emitCapacitorStatusBar,
  emitCapacitorTheme,
  emitCapacitorSplashScreen,
  emitAndroidThemeXml,
} from '@studnicky/iridis-capacitor';
import type {
  StatusBarOutputInterfaceType,
  CapacitorThemeOutputInterfaceType,
  SplashScreenOutputInterfaceType,
} from '@studnicky/iridis-capacitor/types';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a minimal PipelineContextInterface that captures warn calls. */
function makeCtx(warnings: string[] = []): PipelineContextInterface {
  const logger: LoggerInterface = {
    trace() {},
    debug() {},
    info()  {},
    warn(data: LogDataType) { warnings.push(data.message); },
    error() {},
    child() { return logger; },
  };
  // Engine and tasks are not exercised by unit-level task calls; cast to satisfy
  // the interface without a full engine setup.
  return {
    engine:    {} as EngineInterface,
    tasks:     {} as TaskRegistryInterface,
    logger,
    startedAt: 0,
  };
}

/** Build a minimal PaletteStateInterface with the given roles pre-populated. */
function makeState(
  roles: Record<string, ColorRecordInterfaceType> = {},
  variants: Record<string, Record<string, ColorRecordInterfaceType>> = {},
  metadata: Record<string, unknown> = {},
): PaletteStateInterface {
  return {
    input:    { colors: [] },
    runtime:  {},
    colors:   [],
    roles,
    variants,
    outputs:  {},
    metadata,
  };
}

/** Build a color record from a hex string (sRGB only, no displayP3). */
function hex(h: string, intent?: string): ColorRecordInterfaceType {
  return colorRecordFactory.fromHex(h, {
    'hints':        intent !== undefined ? { intent: intent as import('@studnicky/iridis').ColorIntentType } : undefined,
    'sourceFormat': 'hex',
  });
}

/** Canonical full-pipeline engine. */
function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(capacitorPlugin);
  return engine;
}

const FULL_ROLES: RoleSchemaInterfaceType = {
  'name': 'full',
  'roles': [
    { 'name': 'primary',    'required': true,  'intent': 'background', 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'lightnessRange': undefined },
    { 'name': 'background', 'required': true,  'intent': 'background', 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'lightnessRange': undefined },
    { 'name': 'accent',     'required': false, 'intent': 'accent', 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'lightnessRange': undefined },
  ],
};

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// CapacitorPlugin is a named plugin that registers exactly four emit tasks.
// The singleton `capacitorPlugin` is an instance of CapacitorPlugin with a
// fixed name and version. The task name list is stable and sorted.
// Unhappy: structurally impossible for this cell — CapacitorPlugin exposes
// no invalid-input path; adopt() validation is covered in Engine tests.
// ---------------------------------------------------------------------------

interface Cell1Input  { readonly call: 'singleton' | 'tasks'; }
interface Cell1Output {
  readonly isInstance:  boolean;
  readonly name:        string;
  readonly version:     string;
  readonly taskNames:   readonly string[];
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'singleton is an instance of CapacitorPlugin',
    kind: 'happy',
    input: { call: 'singleton' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.ok(output!.isInstance, '[cell=1, scenario=singleton] instanceof CapacitorPlugin');
      assert.strictEqual(output!.name,    'capacitor', '[cell=1, scenario=singleton] name is capacitor');
      assert.strictEqual(output!.version, '0.1.0',     '[cell=1, scenario=singleton] version is 0.1.0');
    },
  },
  {
    name: 'tasks() returns exactly the four emit task names in canonical order',
    kind: 'happy',
    input: { call: 'tasks' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        [
          'emit:androidThemeXml',
          'emit:capacitorSplashScreen',
          'emit:capacitorStatusBar',
          'emit:capacitorTheme',
        ],
        '[cell=1, scenario=task-names] four canonical emit task names',
      );
    },
  },
  {
    name: 'tasks() returns a non-empty array (edge: not zero, not > 4)',
    kind: 'edge',
    input: { call: 'tasks' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-count-edge] no throw');
      assert.strictEqual(output!.taskNames.length, 4, '[cell=1, scenario=task-count-edge] exactly 4 tasks');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'CapacitorPlugin :: cell-1 :: plugin-shape',
  (_input) => ({
    isInstance: capacitorPlugin instanceof CapacitorPlugin,
    name:       capacitorPlugin.name,
    version:    capacitorPlugin.version,
    taskNames:  capacitorPlugin.tasks().map((t) => t.name),
  }),
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — emit:capacitorStatusBar
//
// The task reads state.roles to pick a bar colour in preference order:
//   topBar > surface > base > first role
// Style derivation logic:
//   - when a 'text' role exists: luminance(text) > 0.18 → DARK, else LIGHT
//   - when no text role:         luminance(bar) < 0.18 → LIGHT, else DARK
// The overlay flag is taken from metadata.capacitor.statusBarOverlay.
// When no suitable role exists the task emits a warning and skips writing;
// the outputs.capacitor namespace remains absent. There is no throw path —
// the skip is intentional graceful degradation documented in the source.
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly roles:    Record<string, ColorRecordInterfaceType>;
  readonly metadata: Record<string, unknown>;
}
interface Cell2Output {
  readonly statusBar: StatusBarOutputInterfaceType | undefined;
  readonly warnings:  readonly string[];
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'dark bar color produces LIGHT style (light icons on dark bar)',
    kind: 'happy',
    input: {
      roles:    { 'surface': hex('#1a1a2e') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=dark-bar] no throw');
      assert.ok(output!.statusBar, '[cell=2, scenario=dark-bar] statusBar written');
      assert.strictEqual(output!.statusBar!.style, 'LIGHT', '[cell=2, scenario=dark-bar] LIGHT style for dark bar');
      assert.match(output!.statusBar!.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=2, scenario=dark-bar] backgroundColor is hex');
      assert.strictEqual(output!.statusBar!.overlay, false, '[cell=2, scenario=dark-bar] overlay defaults false');
    },
  },
  {
    name: 'light bar color produces DARK style (dark icons on light bar)',
    kind: 'happy',
    input: {
      roles:    { 'surface': hex('#ffffff') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=light-bar] no throw');
      assert.strictEqual(output!.statusBar!.style, 'DARK', '[cell=2, scenario=light-bar] DARK style for light bar');
    },
  },
  {
    name: 'topBar role takes precedence over surface',
    kind: 'happy',
    input: {
      roles: {
        'surface': hex('#ffffff'),
        'topBar':  hex('#000000'),
      },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=topbar-pref] no throw');
      assert.strictEqual(output!.statusBar!.backgroundColor, '#000000', '[cell=2, scenario=topbar-pref] topBar hex used');
    },
  },
  {
    name: 'text role drives style derivation when present',
    kind: 'happy',
    input: {
      // light text on dark bar → DARK style (text luminance > 0.18 → DARK)
      roles: {
        'surface': hex('#1a1a2e'),
        'text':    hex('#f0f0f0'),
      },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=text-style] no throw');
      // f0f0f0 is a near-white; luminance > 0.18 → DARK
      assert.strictEqual(output!.statusBar!.style, 'DARK', '[cell=2, scenario=text-style] light text → DARK style');
    },
  },
  {
    name: 'dark text role on light bar produces LIGHT style',
    kind: 'happy',
    input: {
      roles: {
        'surface': hex('#f5f5f5'),
        'text':    hex('#111111'),
      },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=dark-text] no throw');
      // 111111 luminance < 0.18 → LIGHT
      assert.strictEqual(output!.statusBar!.style, 'LIGHT', '[cell=2, scenario=dark-text] dark text → LIGHT style');
    },
  },
  {
    name: 'overlay flag read from metadata.capacitor.statusBarOverlay',
    kind: 'edge',
    input: {
      roles:    { 'surface': hex('#1a1a2e') },
      metadata: { 'capacitor': { 'statusBarOverlay': true } },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=overlay-true] no throw');
      assert.strictEqual(output!.statusBar!.overlay, true, '[cell=2, scenario=overlay-true] overlay is true');
    },
  },
  {
    name: 'base role used when topBar and surface absent',
    kind: 'edge',
    input: {
      roles:    { 'base': hex('#333344') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=base-fallback] no throw');
      assert.ok(output!.statusBar, '[cell=2, scenario=base-fallback] statusBar written');
      assert.strictEqual(output!.statusBar!.backgroundColor, '#333344', '[cell=2, scenario=base-fallback] base hex used');
    },
  },
  {
    name: 'first role used when topBar/surface/base all absent',
    kind: 'edge',
    input: {
      roles:    { 'primary': hex('#8b5cf6') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=first-role-fallback] no throw');
      assert.ok(output!.statusBar, '[cell=2, scenario=first-role-fallback] statusBar written');
      assert.strictEqual(output!.statusBar!.backgroundColor, '#8b5cf6', '[cell=2, scenario=first-role-fallback] first role hex used');
    },
  },
  {
    name: 'wide-gamut sRGB boundary color (#ff0000) is accepted and produces valid hex',
    kind: 'edge',
    input: {
      roles:    { 'surface': hex('#ff0000') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=boundary-red] no throw');
      assert.match(output!.statusBar!.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=2, scenario=boundary-red] canonical hex');
    },
  },
  {
    name: 'empty roles — no suitable role — skips write and emits warning',
    kind: 'unhappy',
    input: { roles: {}, metadata: {} },
    assert(output, error) {
      // Task does not throw; it warns and returns early. This is the documented
      // graceful-degradation path (source: EmitCapacitorStatusBar.ts line 43–45).
      assert.strictEqual(error, undefined, '[cell=2, scenario=no-roles] task must not throw');
      assert.strictEqual(output!.statusBar, undefined, '[cell=2, scenario=no-roles] statusBar not written');
      assert.strictEqual(output!.warnings.length, 1, '[cell=2, scenario=no-roles] one warning emitted');
      assert.match(output!.warnings[0] ?? '', /No suitable role/, '[cell=2, scenario=no-roles] warning mentions role absence');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'CapacitorPlugin :: cell-2 :: emit:capacitorStatusBar',
  (input) => {
    const warnings: string[] = [];
    const state = makeState(input.roles, {}, input.metadata);
    emitCapacitorStatusBar.run(state, makeCtx(warnings));
    return {
      statusBar: state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType | undefined,
      warnings,
    };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — emit:capacitorTheme
//
// Emits a flat 13-slot hex map. Resolution order per slot:
//   roles[primaryName] → intentMap[fallbackIntent] → ultimateFallback
// Variant slots (primaryDark, primaryLight) prefer
//   variants[roleName][variantName] → roles[roleName] → fallback.
// When roles is empty all 13 slots must fall through to ultimateFallback.
// Unhappy: structurally impossible — no throw path; task is pure derivation
// with total fallback coverage.
// ---------------------------------------------------------------------------

interface Cell3Input {
  readonly roles:    Record<string, ColorRecordInterfaceType>;
  readonly variants: Record<string, Record<string, ColorRecordInterfaceType>>;
}
interface Cell3Output {
  readonly theme: CapacitorThemeOutputInterfaceType | undefined;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'all 13 slots are populated and are canonical hex strings',
    kind: 'happy',
    input: {
      roles: {
        'primary':    hex('#8b5cf6', 'background'),
        'background': hex('#ffffff', 'background'),
        'accent':     hex('#ec4899', 'accent'),
        'surface':    hex('#f9fafb', 'background'),
        'error':      hex('#ef4444', 'critical'),
        'warning':    hex('#f59e0b', 'muted'),
        'success':    hex('#10b981', 'positive'),
        'info':       hex('#3b82f6', 'accent'),
        'text':       hex('#1f2937', 'text'),
      },
      variants: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=all-slots] no throw');
      assert.ok(output!.theme, '[cell=3, scenario=all-slots] theme written');
      const t = output!.theme!;
      const hexRe = /^#[0-9a-f]{6}$/i;
      for (const [key, val] of Object.entries(t)) {
        assert.match(val, hexRe, `[cell=3, scenario=all-slots] ${key} is canonical hex`);
      }
      assert.strictEqual(Object.keys(t).length, 13, '[cell=3, scenario=all-slots] exactly 13 slots');
    },
  },
  {
    name: 'primary role hex propagates into primary slot',
    kind: 'happy',
    input: {
      roles:    { 'primary': hex('#8b5cf6') },
      variants: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=primary-prop] no throw');
      assert.strictEqual(output!.theme!.primary, '#8b5cf6', '[cell=3, scenario=primary-prop] primary matches role hex');
    },
  },
  {
    name: 'variant dark/light slots resolved from variants map',
    kind: 'happy',
    input: {
      roles: { 'primary': hex('#8b5cf6') },
      variants: {
        'primary': {
          'dark':  hex('#6d28d9'),
          'light': hex('#c4b5fd'),
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=variants] no throw');
      assert.strictEqual(output!.theme!.primaryDark,  '#6d28d9', '[cell=3, scenario=variants] primaryDark from variants.primary.dark');
      assert.strictEqual(output!.theme!.primaryLight, '#c4b5fd', '[cell=3, scenario=variants] primaryLight from variants.primary.light');
    },
  },
  {
    name: 'variant absent — primaryDark/Light fall back to primary role hex',
    kind: 'edge',
    input: {
      roles:    { 'primary': hex('#8b5cf6') },
      variants: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=variant-fallback] no throw');
      assert.strictEqual(output!.theme!.primaryDark,  '#8b5cf6', '[cell=3, scenario=variant-fallback] primaryDark falls back to primary');
      assert.strictEqual(output!.theme!.primaryLight, '#8b5cf6', '[cell=3, scenario=variant-fallback] primaryLight falls back to primary');
    },
  },
  {
    name: 'empty roles — all 13 slots hit ultimate fallback strings',
    kind: 'edge',
    input: { roles: {}, variants: {} },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=empty-roles] no throw');
      const t = output!.theme!;
      // Ultimate fallbacks defined in EmitCapacitorTheme.ts
      assert.strictEqual(t.primary,       '#000000', '[cell=3, scenario=empty-roles] primary fallback');
      assert.strictEqual(t.primaryDark,   '#000000', '[cell=3, scenario=empty-roles] primaryDark fallback');
      assert.strictEqual(t.primaryLight,  '#000000', '[cell=3, scenario=empty-roles] primaryLight fallback');
      assert.strictEqual(t.accent,        '#000000', '[cell=3, scenario=empty-roles] accent fallback (same as primary)');
      assert.strictEqual(t.background,    '#ffffff', '[cell=3, scenario=empty-roles] background fallback');
      assert.strictEqual(t.error,         '#b00020', '[cell=3, scenario=empty-roles] error fallback');
      assert.strictEqual(t.warning,       '#f59e0b', '[cell=3, scenario=empty-roles] warning fallback');
      assert.strictEqual(t.success,       '#10b981', '[cell=3, scenario=empty-roles] success fallback');
      assert.strictEqual(t.info,          '#3b82f6', '[cell=3, scenario=empty-roles] info fallback');
      assert.strictEqual(t.text,          '#1f2937', '[cell=3, scenario=empty-roles] text fallback');
      assert.strictEqual(t.textOnPrimary, '#ffffff', '[cell=3, scenario=empty-roles] textOnPrimary fallback');
      assert.strictEqual(t.textOnAccent,  '#ffffff', '[cell=3, scenario=empty-roles] textOnAccent fallback');
    },
  },
  {
    name: 'intent map — background intent used as fallback for primary when role absent',
    kind: 'edge',
    input: {
      // no 'primary' role key but 'bg' carries intent='background'
      roles:    { 'bg': hex('#3b3b5c', 'background') },
      variants: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=intent-map] no throw');
      // primary → roles['primary'] undefined → intentMap['background'] = '#3b3b5c'
      assert.strictEqual(output!.theme!.primary, '#3b3b5c', '[cell=3, scenario=intent-map] primary resolved via intent map');
    },
  },
  {
    name: 'surface slot falls back to background when surface role absent',
    kind: 'edge',
    input: {
      roles:    { 'background': hex('#f0f0f0') },
      variants: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=surface-bg-fallback] no throw');
      // surface → roles['surface'] undefined → intentMap['background'] = '#f0f0f0'
      assert.strictEqual(output!.theme!.surface, '#f0f0f0', '[cell=3, scenario=surface-bg-fallback] surface matches background role');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'CapacitorPlugin :: cell-3 :: emit:capacitorTheme',
  (input) => {
    const state = makeState(input.roles, input.variants);
    emitCapacitorTheme.run(state, makeCtx());
    return { theme: state.outputs['capacitor:theme'] as CapacitorThemeOutputInterfaceType | undefined };
  },
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — emit:capacitorSplashScreen
//
// Resolves the splash background colour from:
//   metadata.capacitor.splashRole (explicit name) → surface → background →
//   base → first role
// When androidSplashResourceName is set in metadata it is included in the
// output object; when absent the optional field is not present.
// When no suitable role exists the task warns and skips writing (same
// graceful-degradation pattern as statusBar).
// ---------------------------------------------------------------------------

interface Cell4Input {
  readonly roles:    Record<string, ColorRecordInterfaceType>;
  readonly metadata: Record<string, unknown>;
}
interface Cell4Output {
  readonly splashScreen: SplashScreenOutputInterfaceType | undefined;
  readonly warnings:     readonly string[];
}

const cell4Scenarios: readonly ScenarioInterface<Cell4Input, Cell4Output>[] = [
  {
    name: 'surface role used for splash background by default',
    kind: 'happy',
    input: {
      roles:    { 'surface': hex('#f9fafb') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=surface-default] no throw');
      assert.ok(output!.splashScreen, '[cell=4, scenario=surface-default] splashScreen written');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#f9fafb', '[cell=4, scenario=surface-default] surface hex used');
      assert.strictEqual(output!.splashScreen!.androidSplashResourceName, undefined, '[cell=4, scenario=surface-default] no androidSplashResourceName');
    },
  },
  {
    name: 'background role fallback when surface absent',
    kind: 'happy',
    input: {
      roles:    { 'background': hex('#ffffff') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=bg-fallback] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#ffffff', '[cell=4, scenario=bg-fallback] background hex used');
    },
  },
  {
    name: 'explicit splashRole in metadata overrides default resolution',
    kind: 'happy',
    input: {
      roles: {
        'surface':   hex('#f9fafb'),
        'brandSplash': hex('#8b5cf6'),
      },
      metadata: { 'capacitor': { 'splashRole': 'brandSplash' } },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=splash-role-override] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#8b5cf6', '[cell=4, scenario=splash-role-override] branded splash hex used');
    },
  },
  {
    name: 'androidSplashResourceName included when set in metadata',
    kind: 'happy',
    input: {
      roles:    { 'surface': hex('#f9fafb') },
      metadata: { 'capacitor': { 'androidSplashResourceName': 'splash_screen' } },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=android-resource] no throw');
      assert.strictEqual(output!.splashScreen!.androidSplashResourceName, 'splash_screen', '[cell=4, scenario=android-resource] androidSplashResourceName present');
    },
  },
  {
    name: 'base role fallback when surface and background absent',
    kind: 'edge',
    input: {
      roles:    { 'base': hex('#2d2d3d') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=base-fallback] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#2d2d3d', '[cell=4, scenario=base-fallback] base hex used');
    },
  },
  {
    name: 'first role used when surface/background/base all absent',
    kind: 'edge',
    input: {
      roles:    { 'primary': hex('#6d28d9') },
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=first-role-splash] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#6d28d9', '[cell=4, scenario=first-role-splash] first role hex used');
    },
  },
  {
    name: 'splashRole pointing to non-existent role skips (no role found)',
    kind: 'edge',
    input: {
      roles:    { 'surface': hex('#f9fafb') },
      metadata: { 'capacitor': { 'splashRole': 'nonexistent' } },
    },
    assert(output, error) {
      // resolveSplashColor returns undefined when explicit splashRole is set but
      // the role key is missing; the task warns and skips writing.
      assert.strictEqual(error, undefined, '[cell=4, scenario=missing-splash-role] task must not throw');
      assert.strictEqual(output!.splashScreen, undefined, '[cell=4, scenario=missing-splash-role] splashScreen not written');
      assert.strictEqual(output!.warnings.length, 1, '[cell=4, scenario=missing-splash-role] warning emitted');
    },
  },
  {
    name: 'empty roles emits warning and skips writing',
    kind: 'unhappy',
    input: { roles: {}, metadata: {} },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=no-roles] task must not throw');
      assert.strictEqual(output!.splashScreen, undefined, '[cell=4, scenario=no-roles] splashScreen not written');
      assert.strictEqual(output!.warnings.length, 1, '[cell=4, scenario=no-roles] warning emitted');
      assert.match(output!.warnings[0] ?? '', /No suitable role/, '[cell=4, scenario=no-roles] warning text');
    },
  },
];

new ScenarioRunner<Cell4Input, Cell4Output>(
  'CapacitorPlugin :: cell-4 :: emit:capacitorSplashScreen',
  (input) => {
    const warnings: string[] = [];
    const state = makeState(input.roles, {}, input.metadata);
    emitCapacitorSplashScreen.run(state, makeCtx(warnings));
    return {
      splashScreen: state.outputs['capacitor:splashScreen'] as SplashScreenOutputInterfaceType | undefined,
      warnings,
    };
  },
).run(cell4Scenarios);

// ---------------------------------------------------------------------------
// Cell 5 — emit:androidThemeXml
//
// Generates a themes.xml string containing an AppTheme.NoActionBarLaunch
// style with Android resource items. The task reads:
//   - outputs.capacitor.statusBar.backgroundColor (if already emitted)
//   - outputs.capacitor.splashScreen.backgroundColor (if already emitted)
//   - roles for remaining slots (navigationBar, background, primary, text)
// Fallback chain when prior output is absent: resolveHexRole(roles, ...names)
// returning '#000000' when all named roles are missing.
// Unhappy: structurally impossible — no throw path; total fallback coverage.
// ---------------------------------------------------------------------------

interface Cell5Input {
  readonly roles:         Record<string, ColorRecordInterfaceType>;
  readonly priorStatusBar?:    string;   // pre-seeded into outputs.capacitor.statusBar
  readonly priorSplashScreen?: string;  // pre-seeded into outputs.capacitor.splashScreen
}
interface Cell5Output {
  readonly xml:            string | undefined;
  readonly statusBarColor: string | undefined;
}

const cell5Scenarios: readonly ScenarioInterface<Cell5Input, Cell5Output>[] = [
  {
    name: 'XML contains all required structural elements',
    kind: 'happy',
    input: {
      roles: {
        'primary':    hex('#8b5cf6'),
        'surface':    hex('#f9fafb'),
        'background': hex('#ffffff'),
        'text':       hex('#1f2937'),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=structure] no throw');
      assert.ok(output!.xml, '[cell=5, scenario=structure] xml written');
      const xml = output!.xml!;
      assert.ok(xml.includes('<resources>'),                '[cell=5, scenario=structure] <resources> root');
      assert.ok(xml.includes('</resources>'),               '[cell=5, scenario=structure] </resources> close');
      assert.ok(xml.includes('AppTheme.NoActionBarLaunch'), '[cell=5, scenario=structure] splash theme style name');
      assert.ok(xml.includes('Theme.SplashScreen'),         '[cell=5, scenario=structure] parent theme');
      assert.ok(xml.includes('android:statusBarColor'),     '[cell=5, scenario=structure] statusBarColor item');
      assert.ok(xml.includes('android:navigationBarColor'), '[cell=5, scenario=structure] navigationBarColor item');
      assert.ok(xml.includes('android:windowBackground'),   '[cell=5, scenario=structure] windowBackground item');
      assert.ok(xml.includes('android:colorPrimary'),       '[cell=5, scenario=structure] colorPrimary item');
      assert.ok(xml.includes('android:colorPrimaryDark'),   '[cell=5, scenario=structure] colorPrimaryDark item');
      assert.ok(xml.includes('android:colorBackground'),    '[cell=5, scenario=structure] colorBackground item');
      assert.ok(xml.includes('android:textColorPrimary'),   '[cell=5, scenario=structure] textColorPrimary item');
      assert.ok(xml.includes('postSplashScreenTheme'),      '[cell=5, scenario=structure] postSplashScreenTheme item');
      assert.ok(xml.includes('@style/AppTheme'),            '[cell=5, scenario=structure] postSplashScreenTheme value');
    },
  },
  {
    name: 'statusBarColor in XML matches prior emit:capacitorStatusBar output',
    kind: 'happy',
    input: {
      roles: { 'surface': hex('#1a1a2e') },
      priorStatusBar: '#1a1a2e',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=statusbar-match] no throw');
      const xml = output!.xml!;
      assert.ok(
        xml.includes(`<item name="android:statusBarColor">#1a1a2e</item>`),
        '[cell=5, scenario=statusbar-match] statusBarColor references prior statusBar output',
      );
    },
  },
  {
    name: 'windowBackground matches prior emit:capacitorSplashScreen output',
    kind: 'happy',
    input: {
      roles: { 'surface': hex('#f9fafb') },
      priorSplashScreen: '#f9fafb',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=splash-match] no throw');
      const xml = output!.xml!;
      assert.ok(
        xml.includes(`<item name="android:windowBackground">#f9fafb</item>`),
        '[cell=5, scenario=splash-match] windowBackground references prior splashScreen output',
      );
    },
  },
  {
    name: 'empty roles — all items fall through to #000000 fallback',
    kind: 'edge',
    input: { roles: {} },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=empty-roles] no throw');
      const xml = output!.xml!;
      // All resolveHexRole calls return '#000000' when roles is empty
      assert.ok(xml.includes('<item name="android:statusBarColor">#000000</item>'),     '[cell=5, scenario=empty-roles] statusBarColor fallback');
      assert.ok(xml.includes('<item name="android:navigationBarColor">#000000</item>'), '[cell=5, scenario=empty-roles] navigationBarColor fallback');
      assert.ok(xml.includes('<item name="android:windowBackground">#000000</item>'),   '[cell=5, scenario=empty-roles] windowBackground fallback');
      assert.ok(xml.includes('<item name="android:colorPrimary">#000000</item>'),       '[cell=5, scenario=empty-roles] colorPrimary fallback');
      assert.ok(xml.includes('<item name="android:colorBackground">#000000</item>'),    '[cell=5, scenario=empty-roles] colorBackground fallback');
      assert.ok(xml.includes('<item name="android:textColorPrimary">#000000</item>'),   '[cell=5, scenario=empty-roles] textColorPrimary fallback');
    },
  },
  {
    name: 'prior statusBar output takes precedence over role resolution for statusBarColor',
    kind: 'edge',
    input: {
      // role has a different color — prior output must win
      roles:          { 'topBar': hex('#aabbcc') },
      priorStatusBar: '#ff0000',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=prior-beats-role] no throw');
      const xml = output!.xml!;
      assert.ok(
        xml.includes(`<item name="android:statusBarColor">#ff0000</item>`),
        '[cell=5, scenario=prior-beats-role] prior statusBar output wins over role',
      );
      assert.ok(
        !xml.includes(`<item name="android:statusBarColor">#aabbcc</item>`),
        '[cell=5, scenario=prior-beats-role] topBar role NOT used for statusBarColor when prior output present',
      );
    },
  },
  {
    name: 'colorPrimaryDark uses statusBarColor value (same derivation)',
    kind: 'edge',
    input: {
      roles: { 'topBar': hex('#6d28d9') },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=primary-dark-matches-status] no throw');
      const xml = output!.xml!;
      // colorPrimaryDark and statusBarColor use the same resolved statusBarColor
      assert.ok(
        xml.includes(`<item name="android:colorPrimaryDark">#6d28d9</item>`),
        '[cell=5, scenario=primary-dark-matches-status] colorPrimaryDark matches statusBarColor',
      );
    },
  },
];

new ScenarioRunner<Cell5Input, Cell5Output>(
  'CapacitorPlugin :: cell-5 :: emit:androidThemeXml',
  (input) => {
    const state = makeState(input.roles);
    // Pre-seed prior emitter outputs when the scenario requires them
    if (input.priorStatusBar !== undefined) {
      state.outputs['capacitor:statusBar'] = { backgroundColor: input.priorStatusBar, style: 'DARK' as const, overlay: false };
    }
    if (input.priorSplashScreen !== undefined) {
      state.outputs['capacitor:splashScreen'] = { backgroundColor: input.priorSplashScreen };
    }
    emitAndroidThemeXml.run(state, makeCtx());
    const xml = state.outputs['capacitor:androidThemeXml'] as string | undefined;
    const statusBarColor = input.priorStatusBar;
    return { xml, statusBarColor };
  },
).run(cell5Scenarios);

// ---------------------------------------------------------------------------
// Cell 6 — full pipeline integration
//
// Drives the complete intake → resolve → derive → all four capacitor emit
// tasks through a real Engine instance. Each scenario asserts that every
// output slot is present and correctly shaped; the cross-plugin invariant
// (androidThemeXml statusBarColor == statusBar.backgroundColor) is verified
// as an ordering invariant.
// ---------------------------------------------------------------------------

interface Cell6Input {
  readonly engineInput: InputInterface;
  readonly pipeline:    readonly string[];
}
interface Cell6Output {
  readonly state: PaletteStateInterface;
}

const STANDARD_PIPELINE: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'derive:variant',
  'emit:capacitorStatusBar',
  'emit:capacitorTheme',
  'emit:capacitorSplashScreen',
  'emit:androidThemeXml',
];

const cell6Scenarios: readonly ScenarioInterface<Cell6Input, Cell6Output>[] = [
  {
    name: 'full pipeline writes every output slot with correct shapes',
    kind: 'happy',
    input: {
      engineInput: {
        colors: ['#8b5cf6', '#ffffff', '#ec4899'],
        roles:  FULL_ROLES,
      },
      pipeline: STANDARD_PIPELINE,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=full-pipeline] no throw');

      const statusBar = output!.state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType | undefined;
      assert.ok(statusBar, '[cell=6, scenario=full-pipeline] statusBar present');
      assert.match(statusBar!.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=6, scenario=full-pipeline] statusBar.backgroundColor is hex');
      assert.ok(['DARK', 'LIGHT'].includes(statusBar!.style), '[cell=6, scenario=full-pipeline] statusBar.style is DARK or LIGHT');
      assert.strictEqual(typeof statusBar!.overlay, 'boolean', '[cell=6, scenario=full-pipeline] statusBar.overlay is boolean');

      const theme = output!.state.outputs['capacitor:theme'] as CapacitorThemeOutputInterfaceType | undefined;
      assert.ok(theme, '[cell=6, scenario=full-pipeline] theme present');
      assert.strictEqual(Object.keys(theme!).length, 13, '[cell=6, scenario=full-pipeline] theme has 13 slots');

      const splash = output!.state.outputs['capacitor:splashScreen'] as SplashScreenOutputInterfaceType | undefined;
      assert.ok(splash, '[cell=6, scenario=full-pipeline] splashScreen present');
      assert.match(splash!.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=6, scenario=full-pipeline] splash.backgroundColor is hex');

      const xml = output!.state.outputs['capacitor:androidThemeXml'] as string | undefined;
      assert.ok(xml, '[cell=6, scenario=full-pipeline] androidThemeXml present');
      assert.ok(xml!.includes('<resources>'), '[cell=6, scenario=full-pipeline] XML has <resources>');
      assert.ok(xml!.includes('AppTheme.NoActionBarLaunch'), '[cell=6, scenario=full-pipeline] XML has splash theme style');

      // Cross-task ordering invariant: androidThemeXml statusBarColor must
      // reference the same value emit:capacitorStatusBar wrote.
      assert.ok(
        xml!.includes(`<item name="android:statusBarColor">${statusBar!.backgroundColor}</item>`),
        '[cell=6, scenario=full-pipeline] androidThemeXml statusBarColor matches statusBar.backgroundColor',
      );
    },
  },
  {
    name: 'single-color input (boundary: exactly one source color)',
    kind: 'edge',
    input: {
      engineInput: {
        colors: ['#000000'],
        roles:  FULL_ROLES,
      },
      pipeline: STANDARD_PIPELINE,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=single-color] no throw');
      const statusBar = output!.state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType | undefined;
      assert.ok(statusBar, '[cell=6, scenario=single-color] capacitor:statusBar present');
      assert.ok(statusBar?.backgroundColor, '[cell=6, scenario=single-color] statusBar backgroundColor present');
    },
  },
  {
    name: 'pure-white palette — all roles resolve to white (#ffffff)',
    kind: 'edge',
    input: {
      engineInput: {
        colors: ['#ffffff', '#ffffff', '#ffffff'],
        roles:  FULL_ROLES,
      },
      pipeline: STANDARD_PIPELINE,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=all-white] no throw');
      const statusBar = output!.state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType;
      assert.strictEqual(statusBar.style, 'DARK', '[cell=6, scenario=all-white] white bar → DARK style');
    },
  },
  {
    name: 'pure-black palette — statusBar style is LIGHT',
    kind: 'edge',
    input: {
      engineInput: {
        colors: ['#000000', '#000000', '#000000'],
        roles:  FULL_ROLES,
      },
      pipeline: STANDARD_PIPELINE,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=all-black] no throw');
      const statusBar = output!.state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType;
      assert.strictEqual(statusBar.style, 'LIGHT', '[cell=6, scenario=all-black] black bar → LIGHT style');
    },
  },
  {
    name: 'statusBarOverlay metadata flows through the full pipeline',
    kind: 'edge',
    input: {
      engineInput: {
        colors:   ['#8b5cf6', '#ffffff', '#ec4899'],
        roles:    FULL_ROLES,
        metadata: { 'capacitor': { 'statusBarOverlay': true } },
      },
      pipeline: STANDARD_PIPELINE,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=overlay-metadata] no throw');
      const statusBar = output!.state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType;
      assert.strictEqual(statusBar.overlay, true, '[cell=6, scenario=overlay-metadata] overlay propagated from metadata');
    },
  },
  {
    name: 'androidSplashResourceName metadata flows through the full pipeline',
    kind: 'edge',
    input: {
      engineInput: {
        colors:   ['#8b5cf6', '#ffffff', '#ec4899'],
        roles:    FULL_ROLES,
        metadata: { 'capacitor': { 'androidSplashResourceName': 'custom_splash' } },
      },
      pipeline: STANDARD_PIPELINE,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=android-splash-resource] no throw');
      const splash = output!.state.outputs['capacitor:splashScreen'] as SplashScreenOutputInterfaceType;
      assert.strictEqual(splash.androidSplashResourceName, 'custom_splash', '[cell=6, scenario=android-splash-resource] androidSplashResourceName propagated');
    },
  },
  {
    name: 'missing colors array in input throws with validation message',
    kind: 'unhappy',
    input: {
      engineInput: {} as InputInterface,
      pipeline:    STANDARD_PIPELINE,
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=missing-colors] expected throw');
      assert.match((error as Error).message, /input invalid/, '[cell=6, scenario=missing-colors] message names context');
    },
  },
  {
    name: 'unknown task name in pipeline throws before run',
    kind: 'unhappy',
    input: {
      engineInput: { colors: ['#ff0000'] },
      pipeline:    ['intake:hex', 'emit:nonexistent'],
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=unknown-task] expected throw');
      assert.match((error as Error).message, /not registered/, '[cell=6, scenario=unknown-task] message explains failure');
    },
  },
];

new ScenarioRunner<Cell6Input, Cell6Output>(
  'CapacitorPlugin :: cell-6 :: pipeline',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.engineInput);
    return { state };
  },
).run(cell6Scenarios);

// --- Golden fixtures ---

test('CapacitorPlugin :: golden :: androidThemeXml exact structure', () => {
  // Locks the XML template shape. Any structural change (indent, attribute order,
  // style parent name) will break this test deliberately — it is a golden fixture.
  const state = makeState({
    'topBar':    hex('#1a1a2e'),
    'surface':   hex('#1a1a2e'),
    'background': hex('#0f0f1a'),
    'primary':   hex('#8b5cf6'),
    'text':      hex('#e2e8f0'),
  });
  // Seed prior statusBar and splashScreen outputs as flat colon-keyed slots
  state.outputs['capacitor:statusBar']   = { backgroundColor: '#1a1a2e', style: 'LIGHT', overlay: false };
  state.outputs['capacitor:splashScreen'] = { backgroundColor: '#1a1a2e' };
  emitAndroidThemeXml.run(state, makeCtx());
  const xml = state.outputs['capacitor:androidThemeXml'] as string;

  const expected = [
    '<resources>',
    '    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">',
    '        <item name="android:statusBarColor">#1a1a2e</item>',
    '        <item name="android:navigationBarColor">#1a1a2e</item>',
    '        <item name="android:windowBackground">#1a1a2e</item>',
    '        <item name="android:colorPrimary">#8b5cf6</item>',
    '        <item name="android:colorPrimaryDark">#1a1a2e</item>',
    '        <item name="android:colorBackground">#0f0f1a</item>',
    '        <item name="android:textColorPrimary">#e2e8f0</item>',
    '        <item name="postSplashScreenTheme">@style/AppTheme</item>',
    '    </style>',
    '</resources>',
  ].join('\n');

  assert.strictEqual(xml, expected, '[golden :: androidThemeXml] exact XML structure matches template');
});
