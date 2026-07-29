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

import type {
  ColorIntentType,
  ColorRecordInterfaceType,
  EngineInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  TaskRegistryInterface
} from '@studnicky/iridis';
import type {
  CapacitorThemeOutputInterfaceType,
  SplashScreenOutputInterfaceType,
  StatusBarOutputInterfaceType
} from '@studnicky/iridis-capacitor/types';
import type { LoggerInterface } from '@studnicky/logger/interfaces';
import type { LogDataType } from '@studnicky/logger/types';

import {
  capacitorPlugin,
  CapacitorPlugin,
  emitAndroidThemeXml,
  emitCapacitorSplashScreen,
  emitCapacitorStatusBar,
  emitCapacitorTheme
} from '@studnicky/iridis-capacitor';
import { Engine }     from '@studnicky/iridis/engine';
import { colorRecordFactory } from '@studnicky/iridis/math';
import { coreTasks }  from '@studnicky/iridis/tasks';
import assert          from 'node:assert/strict';
import { test }       from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Captures `warn` calls; all other log levels are no-ops. */
class RecordingLogger implements LoggerInterface {
  private readonly warnings: string[];

  constructor(warnings: string[]) {
    this.warnings = warnings;
  }

  child(): LoggerInterface { return this; }
  debug(): void {}
  error(): void {}
  info(): void {}
  trace(): void {}
  warn(data: LogDataType): void { this.warnings.push(data.message); }
}

/** Reads `state.outputs['capacitor:*']` slots without computed access inside object literals. */
class CapacitorOutputs {
  static statusBar(state: PaletteStateInterface): StatusBarOutputInterfaceType | undefined {
    const result = state.outputs['capacitor:statusBar'] as StatusBarOutputInterfaceType | undefined;
    return result;
  }

  static theme(state: PaletteStateInterface): CapacitorThemeOutputInterfaceType | undefined {
    const result = state.outputs['capacitor:theme'] as CapacitorThemeOutputInterfaceType | undefined;
    return result;
  }

  static splashScreen(state: PaletteStateInterface): SplashScreenOutputInterfaceType | undefined {
    const result = state.outputs['capacitor:splashScreen'] as SplashScreenOutputInterfaceType | undefined;
    return result;
  }

  static androidThemeXml(state: PaletteStateInterface): string | undefined {
    const result = state.outputs['capacitor:androidThemeXml'] as string | undefined;
    return result;
  }
}

class TestFixture {
  /** Build a minimal PipelineContextInterface that captures warn calls. */
  static context(warnings: string[] = []): PipelineContextInterface {
    // Engine and tasks are not exercised by unit-level task calls; cast to satisfy
    // the interface without a full engine setup.
    return {
      'engine':    {} as EngineInterface,
      'logger':    new RecordingLogger(warnings),
      'startedAt': 0,
      'tasks':     {} as TaskRegistryInterface
    };
  }

  /** Build a minimal PaletteStateInterface with the given roles pre-populated. */
  static state(options?: {
    readonly 'metadata'?: PaletteStateInterface['metadata'];
    readonly 'roles'?:    Record<string, ColorRecordInterfaceType>;
    readonly 'variants'?: Record<string, Record<string, ColorRecordInterfaceType>>;
  }): PaletteStateInterface {
    return {
      'colors':   [],
      'input':    {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     undefined,
        'runtime':   undefined
      },
      'metadata': options?.metadata ?? {},
      'outputs':  {},
      'roles':    options?.roles ?? {},
      'runtime':  {
        'colorSpace': undefined,
        'extra':      undefined,
        'framing':    undefined
      },
      'variants': options?.variants ?? {}
    };
  }

  /** Build a color record from a hex string (sRGB only, no displayP3). */
  static colorFromHex(colorHex: string, intent?: ColorIntentType): ColorRecordInterfaceType {
    const result = colorRecordFactory.fromHex(colorHex, {
      'hints':        intent !== undefined ? {
        'intent': intent,
        'role':   undefined,
        'weight': undefined
      } : undefined,
      'sourceFormat': 'hex'
    });
    return result;
  }

  /** Canonical full-pipeline engine. */
  static engine(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.adopt(capacitorPlugin);
    return engine;
  }
}

const FULL_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name':          'full',
  'roles': [
    { 'chromaRange': undefined,    'derivedFrom': undefined,  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': undefined, 'name': 'primary', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined,  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': undefined, 'name': 'background', 'required': true },
    { 'chromaRange': undefined,     'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': undefined, 'name': 'accent', 'required': false }
  ]
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

abstract class Cell1Input {
  abstract readonly 'call': 'singleton' | 'tasks';
}
type Cell1Output = {
  readonly 'isInstance':  boolean;
  readonly 'name':        string;
  readonly 'taskNames':   readonly string[];
  readonly 'version':     string;
};

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.ok(output!.isInstance, '[cell=1, scenario=singleton] instanceof CapacitorPlugin');
      assert.strictEqual(output!.name,    'capacitor', '[cell=1, scenario=singleton] name is capacitor');
      assert.strictEqual(output!.version, '0.1.0',     '[cell=1, scenario=singleton] version is 0.1.0');
    },
    'input': { 'call': 'singleton' },
    'kind': 'happy',
    'name': 'singleton is an instance of CapacitorPlugin'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        [
          'emit:androidThemeXml',
          'emit:capacitorSplashScreen',
          'emit:capacitorStatusBar',
          'emit:capacitorTheme'
        ],
        '[cell=1, scenario=task-names] four canonical emit task names'
      );
    },
    'input': { 'call': 'tasks' },
    'kind': 'happy',
    'name': 'tasks() returns exactly the four emit task names in canonical order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-count-edge] no throw');
      assert.strictEqual(output!.taskNames.length, 4, '[cell=1, scenario=task-count-edge] exactly 4 tasks');
    },
    'input': { 'call': 'tasks' },
    'kind': 'edge',
    'name': 'tasks() returns a non-empty array (edge: not zero, not > 4)'
  }
];

await new ScenarioRunner<Cell1Input, Cell1Output>(
  'CapacitorPlugin :: cell-1 :: plugin-shape',
  (_input) => {return {
    'isInstance': capacitorPlugin instanceof CapacitorPlugin,
    'name':       capacitorPlugin.name,
    'taskNames':  capacitorPlugin.tasks().map((t) => { const result = t.name; return result; }),
    'version':    capacitorPlugin.version
  };}
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

interface Cell2InputInterface {
  readonly 'metadata': PaletteStateInterface['metadata'];
  readonly 'roles':    Record<string, ColorRecordInterfaceType>;
}
type Cell2Output = {
  readonly 'statusBar': StatusBarOutputInterfaceType | undefined;
  readonly 'warnings':  readonly string[];
};

const cell2Scenarios: readonly ScenarioInterface<Cell2InputInterface, Cell2Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=dark-bar] no throw');
      assert.ok(output!.statusBar !== undefined, '[cell=2, scenario=dark-bar] statusBar written');
      assert.strictEqual(output!.statusBar.style, 'LIGHT', '[cell=2, scenario=dark-bar] LIGHT style for dark bar');
      assert.match(output!.statusBar.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=2, scenario=dark-bar] backgroundColor is hex');
      assert.strictEqual(output!.statusBar.overlay, false, '[cell=2, scenario=dark-bar] overlay defaults false');
    },
    'input': {
      'metadata': {},
      'roles':    { 'surface': TestFixture.colorFromHex('#1a1a2e') }
    },
    'kind': 'happy',
    'name': 'dark bar color produces LIGHT style (light icons on dark bar)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=light-bar] no throw');
      assert.strictEqual(output!.statusBar!.style, 'DARK', '[cell=2, scenario=light-bar] DARK style for light bar');
    },
    'input': {
      'metadata': {},
      'roles':    { 'surface': TestFixture.colorFromHex('#ffffff') }
    },
    'kind': 'happy',
    'name': 'light bar color produces DARK style (dark icons on light bar)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=topbar-pref] no throw');
      assert.strictEqual(output!.statusBar!.backgroundColor, '#000000', '[cell=2, scenario=topbar-pref] topBar hex used');
    },
    'input': {
      'metadata': {},
      'roles': {
        'surface': TestFixture.colorFromHex('#ffffff'),
        'topBar':  TestFixture.colorFromHex('#000000')
      }
    },
    'kind': 'happy',
    'name': 'topBar role takes precedence over surface'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=text-style] no throw');
      // f0f0f0 is a near-white; luminance > 0.18 → DARK
      assert.strictEqual(output!.statusBar!.style, 'DARK', '[cell=2, scenario=text-style] light text → DARK style');
    },
    'input': {
      'metadata': {},
      // light text on dark bar → DARK style (text luminance > 0.18 → DARK)
      'roles': {
        'surface': TestFixture.colorFromHex('#1a1a2e'),
        'text':    TestFixture.colorFromHex('#f0f0f0')
      }
    },
    'kind': 'happy',
    'name': 'text role drives style derivation when present'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=dark-text] no throw');
      // 111111 luminance < 0.18 → LIGHT
      assert.strictEqual(output!.statusBar!.style, 'LIGHT', '[cell=2, scenario=dark-text] dark text → LIGHT style');
    },
    'input': {
      'metadata': {},
      'roles': {
        'surface': TestFixture.colorFromHex('#f5f5f5'),
        'text':    TestFixture.colorFromHex('#111111')
      }
    },
    'kind': 'happy',
    'name': 'dark text role on light bar produces LIGHT style'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=overlay-true] no throw');
      assert.strictEqual(output!.statusBar!.overlay, true, '[cell=2, scenario=overlay-true] overlay is true');
    },
    'input': {
      'metadata': { 'capacitor': { 'statusBarOverlay': true } },
      'roles':    { 'surface': TestFixture.colorFromHex('#1a1a2e') }
    },
    'kind': 'edge',
    'name': 'overlay flag read from metadata.capacitor.statusBarOverlay'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=base-fallback] no throw');
      assert.ok(output!.statusBar !== undefined, '[cell=2, scenario=base-fallback] statusBar written');
      assert.strictEqual(output!.statusBar.backgroundColor, '#333344', '[cell=2, scenario=base-fallback] base hex used');
    },
    'input': {
      'metadata': {},
      'roles':    { 'base': TestFixture.colorFromHex('#333344') }
    },
    'kind': 'edge',
    'name': 'base role used when topBar and surface absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=first-role-fallback] no throw');
      assert.ok(output!.statusBar !== undefined, '[cell=2, scenario=first-role-fallback] statusBar written');
      assert.strictEqual(output!.statusBar.backgroundColor, '#8b5cf6', '[cell=2, scenario=first-role-fallback] first role hex used');
    },
    'input': {
      'metadata': {},
      'roles':    { 'primary': TestFixture.colorFromHex('#8b5cf6') }
    },
    'kind': 'edge',
    'name': 'first role used when topBar/surface/base all absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=boundary-red] no throw');
      assert.match(output!.statusBar!.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=2, scenario=boundary-red] canonical hex');
    },
    'input': {
      'metadata': {},
      'roles':    { 'surface': TestFixture.colorFromHex('#ff0000') }
    },
    'kind': 'edge',
    'name': 'wide-gamut sRGB boundary color (#ff0000) is accepted and produces valid hex'
  },
  {
    'assert': function(output, error) {
      // Task does not throw; it warns and returns early. This is the documented
      // graceful-degradation path (source: EmitCapacitorStatusBar.ts line 43–45).
      assert.strictEqual(error, undefined, '[cell=2, scenario=no-roles] task must not throw');
      assert.strictEqual(output!.statusBar, undefined, '[cell=2, scenario=no-roles] statusBar not written');
      assert.strictEqual(output!.warnings.length, 1, '[cell=2, scenario=no-roles] one warning emitted');
      const firstWarning = output!.warnings.at(0) ?? '';
      assert.match(firstWarning, /No suitable role/, '[cell=2, scenario=no-roles] warning mentions role absence');
    },
    'input': { 'metadata': {}, 'roles': {} },
    'kind': 'unhappy',
    'name': 'empty roles — no suitable role — skips write and emits warning'
  }
];

await new ScenarioRunner<Cell2InputInterface, Cell2Output>(
  'CapacitorPlugin :: cell-2 :: emit:capacitorStatusBar',
  (input) => {
    const warnings: string[] = [];
    const state = TestFixture.state({ 'metadata': input.metadata, 'roles': input.roles });
    emitCapacitorStatusBar.run(state, TestFixture.context(warnings));
    const statusBar = CapacitorOutputs.statusBar(state);
    return {
      'statusBar': statusBar,
      'warnings': warnings
    };
  }
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

type Cell3Input = {
  readonly 'roles':    Record<string, ColorRecordInterfaceType>;
  readonly 'variants': Record<string, Record<string, ColorRecordInterfaceType>>;
};
abstract class Cell3Output {
  abstract readonly 'theme': CapacitorThemeOutputInterfaceType | undefined;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=all-slots] no throw');
      assert.ok(output!.theme !== undefined, '[cell=3, scenario=all-slots] theme written');
      const theme = output!.theme;
      const hexPattern = /^#[0-9a-f]{6}$/i;
      for (const [key, value] of Object.entries(theme)) {
        assert.match(value, hexPattern, `[cell=3, scenario=all-slots] ${key} is canonical hex`);
      }
      assert.strictEqual(Object.keys(theme).length, 13, '[cell=3, scenario=all-slots] exactly 13 slots');
    },
    'input': {
      'roles': {
        'accent':     TestFixture.colorFromHex('#ec4899', 'accent'),
        'background': TestFixture.colorFromHex('#ffffff', 'background'),
        'error':      TestFixture.colorFromHex('#ef4444', 'critical'),
        'info':       TestFixture.colorFromHex('#3b82f6', 'accent'),
        'primary':    TestFixture.colorFromHex('#8b5cf6', 'background'),
        'success':    TestFixture.colorFromHex('#10b981', 'positive'),
        'surface':    TestFixture.colorFromHex('#f9fafb', 'background'),
        'text':       TestFixture.colorFromHex('#1f2937', 'text'),
        'warning':    TestFixture.colorFromHex('#f59e0b', 'muted')
      },
      'variants': {}
    },
    'kind': 'happy',
    'name': 'all 13 slots are populated and are canonical hex strings'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=primary-prop] no throw');
      assert.strictEqual(output!.theme!.primary, '#8b5cf6', '[cell=3, scenario=primary-prop] primary matches role hex');
    },
    'input': {
      'roles':    { 'primary': TestFixture.colorFromHex('#8b5cf6') },
      'variants': {}
    },
    'kind': 'happy',
    'name': 'primary role hex propagates into primary slot'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=variants] no throw');
      assert.strictEqual(output!.theme!.primaryDark,  '#6d28d9', '[cell=3, scenario=variants] primaryDark from variants.primary.dark');
      assert.strictEqual(output!.theme!.primaryLight, '#c4b5fd', '[cell=3, scenario=variants] primaryLight from variants.primary.light');
    },
    'input': {
      'roles': { 'primary': TestFixture.colorFromHex('#8b5cf6') },
      'variants': {
        'primary': {
          'dark':  TestFixture.colorFromHex('#6d28d9'),
          'light': TestFixture.colorFromHex('#c4b5fd')
        }
      }
    },
    'kind': 'happy',
    'name': 'variant dark/light slots resolved from variants map'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=variant-fallback] no throw');
      assert.strictEqual(output!.theme!.primaryDark,  '#8b5cf6', '[cell=3, scenario=variant-fallback] primaryDark falls back to primary');
      assert.strictEqual(output!.theme!.primaryLight, '#8b5cf6', '[cell=3, scenario=variant-fallback] primaryLight falls back to primary');
    },
    'input': {
      'roles':    { 'primary': TestFixture.colorFromHex('#8b5cf6') },
      'variants': {}
    },
    'kind': 'edge',
    'name': 'variant absent — primaryDark/Light fall back to primary role hex'
  },
  {
    'assert': function(output, error) {
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
    'input': { 'roles': {}, 'variants': {} },
    'kind': 'edge',
    'name': 'empty roles — all 13 slots hit ultimate fallback strings'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=intent-map] no throw');
      // primary → roles['primary'] undefined → intentMap['background'] = '#3b3b5c'
      assert.strictEqual(output!.theme!.primary, '#3b3b5c', '[cell=3, scenario=intent-map] primary resolved via intent map');
    },
    'input': {
      // no 'primary' role key but 'bg' carries intent='background'
      'roles':    { 'bg': TestFixture.colorFromHex('#3b3b5c', 'background') },
      'variants': {}
    },
    'kind': 'edge',
    'name': 'intent map — background intent used as fallback for primary when role absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=surface-bg-fallback] no throw');
      // surface → roles['surface'] undefined → intentMap['background'] = '#f0f0f0'
      assert.strictEqual(output!.theme!.surface, '#f0f0f0', '[cell=3, scenario=surface-bg-fallback] surface matches background role');
    },
    'input': {
      'roles':    { 'background': TestFixture.colorFromHex('#f0f0f0') },
      'variants': {}
    },
    'kind': 'edge',
    'name': 'surface slot falls back to background when surface role absent'
  }
];

await new ScenarioRunner<Cell3Input, Cell3Output>(
  'CapacitorPlugin :: cell-3 :: emit:capacitorTheme',
  (input) => {
    const state = TestFixture.state({ 'roles': input.roles, 'variants': input.variants });
    emitCapacitorTheme.run(state, TestFixture.context());
    const theme = CapacitorOutputs.theme(state);
    return { 'theme': theme };
  }
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

interface Cell4InputInterface {
  readonly 'metadata': PaletteStateInterface['metadata'];
  readonly 'roles':    Record<string, ColorRecordInterfaceType>;
}
type Cell4Output = {
  readonly 'splashScreen': SplashScreenOutputInterfaceType | undefined;
  readonly 'warnings':     readonly string[];
};

const cell4Scenarios: readonly ScenarioInterface<Cell4InputInterface, Cell4Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=surface-default] no throw');
      assert.ok(output!.splashScreen !== undefined, '[cell=4, scenario=surface-default] splashScreen written');
      assert.strictEqual(output!.splashScreen.backgroundColor, '#f9fafb', '[cell=4, scenario=surface-default] surface hex used');
      assert.strictEqual(output!.splashScreen.androidSplashResourceName, undefined, '[cell=4, scenario=surface-default] no androidSplashResourceName');
    },
    'input': {
      'metadata': {},
      'roles':    { 'surface': TestFixture.colorFromHex('#f9fafb') }
    },
    'kind': 'happy',
    'name': 'surface role used for splash background by default'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=bg-fallback] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#ffffff', '[cell=4, scenario=bg-fallback] background hex used');
    },
    'input': {
      'metadata': {},
      'roles':    { 'background': TestFixture.colorFromHex('#ffffff') }
    },
    'kind': 'happy',
    'name': 'background role fallback when surface absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=splash-role-override] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#8b5cf6', '[cell=4, scenario=splash-role-override] branded splash hex used');
    },
    'input': {
      'metadata': { 'capacitor': { 'splashRole': 'brandSplash' } },
      'roles': {
        'brandSplash': TestFixture.colorFromHex('#8b5cf6'),
        'surface':   TestFixture.colorFromHex('#f9fafb')
      }
    },
    'kind': 'happy',
    'name': 'explicit splashRole in metadata overrides default resolution'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=android-resource] no throw');
      assert.strictEqual(output!.splashScreen!.androidSplashResourceName, 'splash_screen', '[cell=4, scenario=android-resource] androidSplashResourceName present');
    },
    'input': {
      'metadata': { 'capacitor': { 'androidSplashResourceName': 'splash_screen' } },
      'roles':    { 'surface': TestFixture.colorFromHex('#f9fafb') }
    },
    'kind': 'happy',
    'name': 'androidSplashResourceName included when set in metadata'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=base-fallback] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#2d2d3d', '[cell=4, scenario=base-fallback] base hex used');
    },
    'input': {
      'metadata': {},
      'roles':    { 'base': TestFixture.colorFromHex('#2d2d3d') }
    },
    'kind': 'edge',
    'name': 'base role fallback when surface and background absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=first-role-splash] no throw');
      assert.strictEqual(output!.splashScreen!.backgroundColor, '#6d28d9', '[cell=4, scenario=first-role-splash] first role hex used');
    },
    'input': {
      'metadata': {},
      'roles':    { 'primary': TestFixture.colorFromHex('#6d28d9') }
    },
    'kind': 'edge',
    'name': 'first role used when surface/background/base all absent'
  },
  {
    'assert': function(output, error) {
      // resolveSplashColor returns undefined when explicit splashRole is set but
      // the role key is missing; the task warns and skips writing.
      assert.strictEqual(error, undefined, '[cell=4, scenario=missing-splash-role] task must not throw');
      assert.strictEqual(output!.splashScreen, undefined, '[cell=4, scenario=missing-splash-role] splashScreen not written');
      assert.strictEqual(output!.warnings.length, 1, '[cell=4, scenario=missing-splash-role] warning emitted');
    },
    'input': {
      'metadata': { 'capacitor': { 'splashRole': 'nonexistent' } },
      'roles':    { 'surface': TestFixture.colorFromHex('#f9fafb') }
    },
    'kind': 'edge',
    'name': 'splashRole pointing to non-existent role skips (no role found)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=no-roles] task must not throw');
      assert.strictEqual(output!.splashScreen, undefined, '[cell=4, scenario=no-roles] splashScreen not written');
      assert.strictEqual(output!.warnings.length, 1, '[cell=4, scenario=no-roles] warning emitted');
      const firstWarning = output!.warnings.at(0) ?? '';
      assert.match(firstWarning, /No suitable role/, '[cell=4, scenario=no-roles] warning text');
    },
    'input': { 'metadata': {}, 'roles': {} },
    'kind': 'unhappy',
    'name': 'empty roles emits warning and skips writing'
  }
];

await new ScenarioRunner<Cell4InputInterface, Cell4Output>(
  'CapacitorPlugin :: cell-4 :: emit:capacitorSplashScreen',
  (input) => {
    const warnings: string[] = [];
    const state = TestFixture.state({ 'metadata': input.metadata, 'roles': input.roles });
    emitCapacitorSplashScreen.run(state, TestFixture.context(warnings));
    const splashScreen = CapacitorOutputs.splashScreen(state);
    return {
      'splashScreen': splashScreen,
      'warnings': warnings
    };
  }
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

type Cell5Input = {
  readonly 'priorSplashScreen'?: string;  // pre-seeded into outputs.capacitor.splashScreen
  readonly 'priorStatusBar'?:    string;   // pre-seeded into outputs.capacitor.statusBar
  readonly 'roles':         Record<string, ColorRecordInterfaceType>;
};
abstract class Cell5Output {
  abstract readonly 'statusBarColor': string | undefined;
  abstract readonly 'xml':            string | undefined;
}

const cell5Scenarios: readonly ScenarioInterface<Cell5Input, Cell5Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=structure] no throw');
      assert.ok(output!.xml !== undefined, '[cell=5, scenario=structure] xml written');
      const xml = output!.xml;
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
    'input': {
      'roles': {
        'background': TestFixture.colorFromHex('#ffffff'),
        'primary':    TestFixture.colorFromHex('#8b5cf6'),
        'surface':    TestFixture.colorFromHex('#f9fafb'),
        'text':       TestFixture.colorFromHex('#1f2937')
      }
    },
    'kind': 'happy',
    'name': 'XML contains all required structural elements'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=statusbar-match] no throw');
      const xml = output!.xml!;
      assert.ok(
        xml.includes('<item name="android:statusBarColor">#1a1a2e</item>'),
        '[cell=5, scenario=statusbar-match] statusBarColor references prior statusBar output'
      );
    },
    'input': {
      'priorStatusBar': '#1a1a2e',
      'roles': { 'surface': TestFixture.colorFromHex('#1a1a2e') }
    },
    'kind': 'happy',
    'name': 'statusBarColor in XML matches prior emit:capacitorStatusBar output'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=splash-match] no throw');
      const xml = output!.xml!;
      assert.ok(
        xml.includes('<item name="android:windowBackground">#f9fafb</item>'),
        '[cell=5, scenario=splash-match] windowBackground references prior splashScreen output'
      );
    },
    'input': {
      'priorSplashScreen': '#f9fafb',
      'roles': { 'surface': TestFixture.colorFromHex('#f9fafb') }
    },
    'kind': 'happy',
    'name': 'windowBackground matches prior emit:capacitorSplashScreen output'
  },
  {
    'assert': function(output, error) {
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
    'input': { 'roles': {} },
    'kind': 'edge',
    'name': 'empty roles — all items fall through to #000000 fallback'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=prior-beats-role] no throw');
      const xml = output!.xml!;
      assert.ok(
        xml.includes('<item name="android:statusBarColor">#ff0000</item>'),
        '[cell=5, scenario=prior-beats-role] prior statusBar output wins over role'
      );
      assert.ok(
        !xml.includes('<item name="android:statusBarColor">#aabbcc</item>'),
        '[cell=5, scenario=prior-beats-role] topBar role NOT used for statusBarColor when prior output present'
      );
    },
    'input': {
      'priorStatusBar': '#ff0000',
      // role has a different color — prior output must win
      'roles':          { 'topBar': TestFixture.colorFromHex('#aabbcc') }
    },
    'kind': 'edge',
    'name': 'prior statusBar output takes precedence over role resolution for statusBarColor'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=primary-dark-matches-status] no throw');
      const xml = output!.xml!;
      // colorPrimaryDark and statusBarColor use the same resolved statusBarColor
      assert.ok(
        xml.includes('<item name="android:colorPrimaryDark">#6d28d9</item>'),
        '[cell=5, scenario=primary-dark-matches-status] colorPrimaryDark matches statusBarColor'
      );
    },
    'input': {
      'roles': { 'topBar': TestFixture.colorFromHex('#6d28d9') }
    },
    'kind': 'edge',
    'name': 'colorPrimaryDark uses statusBarColor value (same derivation)'
  }
];

await new ScenarioRunner<Cell5Input, Cell5Output>(
  'CapacitorPlugin :: cell-5 :: emit:androidThemeXml',
  (input) => {
    const state = TestFixture.state({ 'roles': input.roles });
    // Pre-seed prior emitter outputs when the scenario requires them
    if (input.priorStatusBar !== undefined) {
      state.outputs['capacitor:statusBar'] = { 'backgroundColor': input.priorStatusBar, 'overlay': false, 'style': 'DARK' as const };
    }
    if (input.priorSplashScreen !== undefined) {
      state.outputs['capacitor:splashScreen'] = { 'backgroundColor': input.priorSplashScreen };
    }
    emitAndroidThemeXml.run(state, TestFixture.context());
    const xml = state.outputs['capacitor:androidThemeXml'] as string | undefined;
    const statusBarColor = input.priorStatusBar;
    return { 'statusBarColor': statusBarColor, 'xml': xml };
  }
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

interface Cell6InputInterface {
  readonly 'engineInput': InputInterface;
  readonly 'pipeline':    readonly string[];
}
interface Cell6OutputInterface {
  readonly 'state': PaletteStateInterface;
}

const STANDARD_PIPELINE: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'derive:variant',
  'emit:capacitorStatusBar',
  'emit:capacitorTheme',
  'emit:capacitorSplashScreen',
  'emit:androidThemeXml'
];

const cell6Scenarios: readonly ScenarioInterface<Cell6InputInterface, Cell6OutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=full-pipeline] no throw');

      const statusBar = CapacitorOutputs.statusBar(output!.state);
      assert.ok(statusBar !== undefined, '[cell=6, scenario=full-pipeline] statusBar present');
      assert.match(statusBar.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=6, scenario=full-pipeline] statusBar.backgroundColor is hex');
      assert.ok(statusBar.style === 'DARK' || statusBar.style === 'LIGHT', '[cell=6, scenario=full-pipeline] statusBar.style is DARK or LIGHT');
      assert.strictEqual(typeof statusBar.overlay, 'boolean', '[cell=6, scenario=full-pipeline] statusBar.overlay is boolean');

      const theme = CapacitorOutputs.theme(output!.state);
      assert.ok(theme !== undefined, '[cell=6, scenario=full-pipeline] theme present');
      assert.strictEqual(Object.keys(theme).length, 13, '[cell=6, scenario=full-pipeline] theme has 13 slots');

      const splash = CapacitorOutputs.splashScreen(output!.state);
      assert.ok(splash !== undefined, '[cell=6, scenario=full-pipeline] splashScreen present');
      assert.match(splash.backgroundColor, /^#[0-9a-f]{6}$/i, '[cell=6, scenario=full-pipeline] splash.backgroundColor is hex');

      const xml = CapacitorOutputs.androidThemeXml(output!.state);
      assert.ok(xml !== undefined, '[cell=6, scenario=full-pipeline] androidThemeXml present');
      assert.ok(xml.includes('<resources>'), '[cell=6, scenario=full-pipeline] XML has <resources>');
      assert.ok(xml.includes('AppTheme.NoActionBarLaunch'), '[cell=6, scenario=full-pipeline] XML has splash theme style');

      // Cross-task ordering invariant: androidThemeXml statusBarColor must
      // reference the same value emit:capacitorStatusBar wrote.
      assert.ok(
        xml.includes(`<item name="android:statusBarColor">${statusBar.backgroundColor}</item>`),
        '[cell=6, scenario=full-pipeline] androidThemeXml statusBarColor matches statusBar.backgroundColor'
      );
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6', '#ffffff', '#ec4899'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     FULL_ROLES,
        'runtime':   undefined
      },
      'pipeline': STANDARD_PIPELINE
    },
    'kind': 'happy',
    'name': 'full pipeline writes every output slot with correct shapes'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=single-color] no throw');
      const statusBar = CapacitorOutputs.statusBar(output!.state);
      assert.ok(statusBar !== undefined, '[cell=6, scenario=single-color] capacitor:statusBar present');
      assert.ok(statusBar.backgroundColor.length > 0, '[cell=6, scenario=single-color] statusBar backgroundColor present');
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#000000'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     FULL_ROLES,
        'runtime':   undefined
      },
      'pipeline': STANDARD_PIPELINE
    },
    'kind': 'edge',
    'name': 'single-color input (boundary: exactly one source color)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=all-white] no throw');
      const statusBar = CapacitorOutputs.statusBar(output!.state);
      assert.ok(statusBar !== undefined, '[cell=6, scenario=all-white] statusBar present');
      assert.strictEqual(statusBar.style, 'DARK', '[cell=6, scenario=all-white] white bar → DARK style');
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#ffffff', '#ffffff', '#ffffff'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     FULL_ROLES,
        'runtime':   undefined
      },
      'pipeline': STANDARD_PIPELINE
    },
    'kind': 'edge',
    'name': 'pure-white palette — all roles resolve to white (#ffffff)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=all-black] no throw');
      const statusBar = CapacitorOutputs.statusBar(output!.state);
      assert.ok(statusBar !== undefined, '[cell=6, scenario=all-black] statusBar present');
      assert.strictEqual(statusBar.style, 'LIGHT', '[cell=6, scenario=all-black] black bar → LIGHT style');
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#000000', '#000000', '#000000'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     FULL_ROLES,
        'runtime':   undefined
      },
      'pipeline': STANDARD_PIPELINE
    },
    'kind': 'edge',
    'name': 'pure-black palette — statusBar style is LIGHT'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=overlay-metadata] no throw');
      const statusBar = CapacitorOutputs.statusBar(output!.state);
      assert.ok(statusBar !== undefined, '[cell=6, scenario=overlay-metadata] statusBar present');
      assert.strictEqual(statusBar.overlay, true, '[cell=6, scenario=overlay-metadata] overlay propagated from metadata');
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6', '#ffffff', '#ec4899'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'capacitor': { 'statusBarOverlay': true } },
        'roles':     FULL_ROLES,
        'runtime':   undefined
      },
      'pipeline': STANDARD_PIPELINE
    },
    'kind': 'edge',
    'name': 'statusBarOverlay metadata flows through the full pipeline'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=android-splash-resource] no throw');
      const splash = CapacitorOutputs.splashScreen(output!.state);
      assert.ok(splash !== undefined, '[cell=6, scenario=android-splash-resource] splashScreen present');
      assert.strictEqual(splash.androidSplashResourceName, 'custom_splash', '[cell=6, scenario=android-splash-resource] androidSplashResourceName propagated');
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6', '#ffffff', '#ec4899'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'capacitor': { 'androidSplashResourceName': 'custom_splash' } },
        'roles':     FULL_ROLES,
        'runtime':   undefined
      },
      'pipeline': STANDARD_PIPELINE
    },
    'kind': 'edge',
    'name': 'androidSplashResourceName metadata flows through the full pipeline'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=missing-colors] expected throw');
      assert.match((error).message, /input invalid/, '[cell=6, scenario=missing-colors] message names context');
    },
    'input': {
      'engineInput': {} as InputInterface,
      'pipeline':    STANDARD_PIPELINE
    },
    'kind': 'unhappy',
    'name': 'missing colors array in input throws with validation message'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=unknown-task] expected throw');
      assert.match((error).message, /not registered/, '[cell=6, scenario=unknown-task] message explains failure');
    },
    'input': {
      'engineInput': {
        'bypass':    undefined,
        'colors':    ['#ff0000'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     undefined,
        'runtime':   undefined
      },
      'pipeline':    ['intake:hex', 'emit:nonexistent']
    },
    'kind': 'unhappy',
    'name': 'unknown task name in pipeline throws before run'
  }
];

await new ScenarioRunner<Cell6InputInterface, Cell6OutputInterface>(
  'CapacitorPlugin :: cell-6 :: pipeline',
  (input) => {
    const engine = TestFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.engineInput);
    return { 'state': state };
  }
).run(cell6Scenarios);

// --- Golden fixtures ---

await test('CapacitorPlugin :: golden :: androidThemeXml exact structure', () => {
  // Locks the XML template shape. Any structural change (indent, attribute order,
  // style parent name) will break this test deliberately — it is a golden fixture.
  const state = TestFixture.state({
    'roles': {
      'background': TestFixture.colorFromHex('#0f0f1a'),
      'primary':   TestFixture.colorFromHex('#8b5cf6'),
      'surface':   TestFixture.colorFromHex('#1a1a2e'),
      'text':      TestFixture.colorFromHex('#e2e8f0'),
      'topBar':    TestFixture.colorFromHex('#1a1a2e')
    }
  });
  // Seed prior statusBar and splashScreen outputs as flat colon-keyed slots
  state.outputs['capacitor:statusBar']   = { 'backgroundColor': '#1a1a2e', 'overlay': false, 'style': 'LIGHT' };
  state.outputs['capacitor:splashScreen'] = { 'backgroundColor': '#1a1a2e' };
  emitAndroidThemeXml.run(state, TestFixture.context());
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
    '</resources>'
  ].join('\n');

  assert.strictEqual(xml, expected, '[golden :: androidThemeXml] exact XML structure matches template');
});
