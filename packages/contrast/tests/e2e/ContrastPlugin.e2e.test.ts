/**
 * ContrastPlugin — scenario-matrix e2e suite.
 *
 * Subject: `ContrastPlugin` and its four enforce tasks driven end-to-end
 * through a full Engine pipeline. Each cell covers one concern of the
 * plugin; scenarios within a cell exhaust the happy / edge / unhappy
 * matrix for that concern.
 *
 * Cells:
 *   1. plugin.shape     — singleton identity, version, and task registry
 *   2. enforce:wcagAA   — WCAG 2.1 AA ratio, pair results, no-pairs guard
 *   3. enforce:wcagAAA  — WCAG 2.1 AAA ratio, fail-then-adjust, no-pairs guard
 *   4. enforce:apca     — APCA Lc targets by role intent, no-pairs guard
 *   5. enforce:cvdSimulate — per-type warning signals: drop, floor, clean pass
 *   6. enforce:contrast (core) — adjusted=true branch, algorithm routing
 */

import type {
  ColorIntentType,
  ColorRecordInterfaceType,
  ContrastPairInterfaceType,
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterfaceType
} from '@studnicky/iridis';
import type { LoggerInterface } from '@studnicky/logger/interfaces';
import type { LogDataType } from '@studnicky/logger/types';

import { colorRecordFactory, contrastWcag21 } from '@studnicky/iridis';
import {
  ContrastPlugin,
  contrastPlugin,
  enforceCvdSimulate
} from '@studnicky/iridis-contrast';
import { Engine }    from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { TextForegroundIntent } from '../../src/data/TextForegroundIntent.ts';
import { wcagRequiredRatio } from '../../src/data/wcagRequiredRatio.ts';
import { getContrastMetadata } from '../../src/getContrastMetadata.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Builds a fresh Engine with coreTasks registered and the contrastPlugin
 * adopted. Each runner call gets its own engine instance so pipeline()
 * calls do not bleed between scenarios.
 */
class ContrastTestEngine {
  static create(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.adopt(contrastPlugin);
    return engine;
  }
}

/** Captures warning messages while direct task probes avoid console output. */
class RecordingLogger implements LoggerInterface {
  readonly warnings: string[] = [];

  child(): LoggerInterface { return this; }
  debug(): void {}
  error(): void {}
  info(): void {}
  trace(): void {}
  warn(data: LogDataType): void { this.warnings.push(data.message); }
}

class CvdTaskProbe {
  static run(
    roles: Readonly<Record<string, ColorRecordInterfaceType>>,
    contrastPairs: NonNullable<RoleSchemaInterfaceType['contrastPairs']>,
    cvdCorrect: boolean,
    logger: LoggerInterface = new RecordingLogger()
  ): PaletteStateInterface {
    const engine = ContrastTestEngine.create();
    const input: InputInterface = {
      'bypass': undefined,
      'colors': [],
      'contrast': { 'algorithm': undefined, 'cvdCorrect': cvdCorrect, 'extra': undefined, 'level': undefined },
      'emit': undefined,
      'maxColors': undefined,
      'metadata': undefined,
      'roles': {
        'contrastPairs': contrastPairs,
        'description': undefined,
        'name': 'cvd-direct-probe',
        'roles': []
      },
      'runtime': undefined
    };
    const state: PaletteStateInterface = {
      'colors': [],
      'input': input,
      'metadata': {},
      'outputs': {},
      'roles': { ...roles },
      'runtime': { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
      'variants': {}
    };
    enforceCvdSimulate.run(state, {
      'engine': engine,
      'logger': logger,
      'startedAt': Date.now(),
      'tasks': engine.tasks
    });
    return state;
  }
}

class HueDistance {
  static between(first: number, second: number): number {
    const distance = Math.abs(first - second) % 360;
    return Math.min(distance, 360 - distance);
  }
}

class CvdCandidateProbe {
  static run(foreground: ColorRecordInterfaceType, background: ColorRecordInterfaceType): PaletteStateInterface {
    const engine = ContrastTestEngine.create();
    engine.pipeline(['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']);
    return engine.run({
      'bypass': undefined,
      'colors': [foreground.oklch, background.oklch],
      'contrast': undefined,
      'emit': undefined,
      'maxColors': undefined,
      'metadata': undefined,
      'roles': {
        'contrastPairs': [
          { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1 }
        ],
        'description': undefined,
        'name': 'cvd-candidate-probe',
        'roles': [
          {
            'chromaRange': [Math.max(0, foreground.oklch.c - 0.01), Math.min(0.5, foreground.oklch.c + 0.01)],
            'derivedFrom': undefined,
            'description': undefined,
            'hue': undefined,
            'hueClamp': undefined,
            'hueOffset': foreground.oklch.h,
            'intent': undefined,
            'lightnessRange': [Math.max(0, foreground.oklch.l - 0.01), Math.min(1, foreground.oklch.l + 0.01)],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [Math.max(0, background.oklch.c - 0.01), Math.min(0.5, background.oklch.c + 0.01)],
            'derivedFrom': undefined,
            'description': undefined,
            'hue': undefined,
            'hueClamp': undefined,
            'hueOffset': background.oklch.h,
            'intent': undefined,
            'lightnessRange': [Math.max(0, background.oklch.l - 0.01), Math.min(1, background.oklch.l + 0.01)],
            'name': 'background',
            'required': true
          }
        ]
      },
      'runtime': undefined
    });
  }
}

/**
 * RoleSchema for WCAG AA 4.5:1 normal-text pairs.
 * Lightness bands pin role assignment: input seeds with L < 0.65 map to text,
 * seeds with L > 0.85 map to background. This avoids role-swap surprises when
 * resolve:roles runs its distance picker.
 */
class WcagAaRoleFixture {
  static create(
    foregroundName: string,
    backgroundName: string,
    minimumRatio = 4.5
  ): RoleSchemaInterfaceType {
    return {
      'contrastPairs': [
        { 'algorithm': 'wcag21', 'background': backgroundName, 'foreground': foregroundName, 'minRatio': minimumRatio }
      ],
      'description': undefined,
      'name':  'wcag-aa',
      'roles': [
        { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.30, 0.60], 'name': foregroundName, 'required': true },
        { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.90, 1.00], 'name': backgroundName, 'required': true }
      ]
    };
  }
}

/**
 * RoleSchema for WCAG AAA 7:1 pairs.
 * Lightness bands: dark seeds (L < 0.40) map to text; light seeds (L > 0.85)
 * map to background. Wide enough for both a passing near-black (#1a1a1a) and a
 * failing mid-gray (#777777) to land unambiguously in the text slot.
 */
class WcagAaaRoleFixture {
  static create(
    foregroundName: string,
    backgroundName: string
  ): RoleSchemaInterfaceType {
    return {
      'contrastPairs': [
        { 'algorithm': 'wcag21', 'background': backgroundName, 'foreground': foregroundName, 'minRatio': 7.0 }
      ],
      'description': undefined,
      'name':  'wcag-aaa',
      'roles': [
        { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.10, 0.55], 'name': foregroundName, 'required': true },
        { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.90, 1.00], 'name': backgroundName, 'required': true }
      ]
    };
  }
}

/** Direct records for inferred WCAG targets when a pair does not set minRatio. */
class WcagIntentRoleFixture {
  static pair(minimumRatio = 0): ContrastPairInterfaceType {
    return {
      'algorithm': 'wcag21',
      'background': 'background',
      'foreground': 'foreground',
      'minRatio': minimumRatio
    };
  }

  static roles(
    foregroundIntent: ColorIntentType | undefined,
    backgroundIntent: ColorIntentType | undefined
  ): Record<string, ColorRecordInterfaceType> {
    return {
      'background': colorRecordFactory.fromHex('#ffffff', {
        'hints': { 'intent': backgroundIntent, 'role': 'background', 'weight': undefined }
      }),
      'foreground': colorRecordFactory.fromHex('#000000', {
        'hints': { 'intent': foregroundIntent, 'role': 'foreground', 'weight': undefined }
      })
    };
  }
}

await test('wcagRequiredRatio recognizes every semantic foreground and preserves generic fallbacks', () => {
  const inferredPair = WcagIntentRoleFixture.pair();
  const configuredPair = WcagIntentRoleFixture.pair(5.5);
  const semanticIntents: readonly ColorIntentType[] = ['link', 'muted', 'onAccent', 'onButton', 'text'];
  for (const intent of semanticIntents) {
    const roles = WcagIntentRoleFixture.roles(intent, 'accent');
    assert.equal(wcagRequiredRatio.apply('aa', inferredPair, roles), 4.5, `${intent} AA`);
    assert.equal(wcagRequiredRatio.apply('aaa', inferredPair, roles), 7, `${intent} AAA`);
    assert.equal(wcagRequiredRatio.apply('aa', configuredPair, roles), 5.5, `${intent} configured`);
  }
  const genericIntents: readonly ColorIntentType[] = ['accent', 'background', 'button', 'critical', 'positive'];
  for (const intent of genericIntents) {
    const roles = WcagIntentRoleFixture.roles(intent, 'background');
    assert.equal(wcagRequiredRatio.apply('aa', inferredPair, roles), 3, `${intent} generic AA`);
    assert.equal(wcagRequiredRatio.apply('aaa', inferredPair, roles), 4.5, `${intent} generic AAA`);
    assert.equal(wcagRequiredRatio.apply('aa', configuredPair, roles), 5.5, `${intent} configured`);
  }
  const genericRoles = WcagIntentRoleFixture.roles(undefined, 'accent');
  assert.equal(wcagRequiredRatio.apply('aa', inferredPair, genericRoles), 3, 'generic AA');
  assert.equal(wcagRequiredRatio.apply('aaa', inferredPair, genericRoles), 4.5, 'generic AAA');
});

await test('TextForegroundIntent exhaustively classifies the canonical ColorIntent contract', () => {
  const actual: Readonly<Record<ColorIntentType, boolean>> = {
    'accent':     TextForegroundIntent.matches('accent'),
    'background': TextForegroundIntent.matches('background'),
    'button':     TextForegroundIntent.matches('button'),
    'critical':   TextForegroundIntent.matches('critical'),
    'link':       TextForegroundIntent.matches('link'),
    'muted':      TextForegroundIntent.matches('muted'),
    'onAccent':   TextForegroundIntent.matches('onAccent'),
    'onButton':   TextForegroundIntent.matches('onButton'),
    'positive':   TextForegroundIntent.matches('positive'),
    'text':       TextForegroundIntent.matches('text')
  };
  const expected: Readonly<Record<ColorIntentType, boolean>> = {
    'accent':     false,
    'background': false,
    'button':     false,
    'critical':   false,
    'link':       true,
    'muted':      true,
    'onAccent':   true,
    'onButton':   true,
    'positive':   false,
    'text':       true
  };
  assert.deepStrictEqual(actual, expected);
  assert.equal(TextForegroundIntent.matches(undefined), false, 'undefined intent remains generic');
});

/** RoleSchema with intent hints for APCA target selection. */
class ApcaRoleFixture {
  static create(foregroundIntent: ColorIntentType, backgroundIntent: ColorIntentType): RoleSchemaInterfaceType {
    return {
      'contrastPairs': [
        { 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minRatio': 1 }
      ],
      'description': undefined,
      'name':  'apca',
      'roles': [
        {
          'chromaRange': [0.00, 0.05], 'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined, 'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': foregroundIntent,
          'lightnessRange': [0.00, 0.30],
          'name': 'text',
          'required': true
        },
        {
          'chromaRange': [0.00, 0.05], 'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined, 'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': backgroundIntent,
          'lightnessRange': [0.85, 1.00],
          'name': 'background',
          'required': true
        }
      ]
    };
  }

  static createDerived(foregroundIntent: ColorIntentType | undefined): RoleSchemaInterfaceType {
    return {
      'contrastPairs': [
        { 'algorithm': 'apca', 'background': 'chrome', 'foreground': 'overlayGlyph', 'minRatio': 1 }
      ],
      'description': undefined,
      'name': 'apca-derived',
      'roles': [
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.00, 0.30], 'name': 'accentSeed', 'required': true },
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': 'accentSeed', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': foregroundIntent, 'lightnessRange': [0.00, 0.30], 'name': 'overlayGlyph', 'required': undefined },
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.85, 1.00], 'name': 'chrome', 'required': true }
      ]
    };
  }
}

await test('every canonical foreground intent selects Lc 60 through the APCA engine task', () => {
  const semanticIntents: readonly ColorIntentType[] = ['link', 'muted', 'onAccent', 'onButton', 'text'];
  for (const intent of semanticIntents) {
    const engine = ContrastTestEngine.create();
    engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:apca']);
    const state = engine.run({
      'bypass': undefined,
      'colors': ['#000000', '#ffffff'],
      'contrast': undefined,
      'emit': undefined,
      'maxColors': undefined,
      'metadata': undefined,
      'roles': ApcaRoleFixture.create(intent, 'accent'),
      'runtime': undefined
    });
    const pair = getContrastMetadata(state.metadata, 'contrast:apca')?.pairs.at(0);
    assert.ok(pair !== undefined, `${intent} APCA result present`);
    assert.equal(pair.requiredLc, 60, `${intent} APCA Lc`);
    assert.equal(pair.pass, true, `${intent} APCA pass`);
  }
});

await test('link intent preserves a configured WCAG target through the AA and AAA engine tasks', () => {
  const engine = ContrastTestEngine.create();
  engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:wcagAA', 'enforce:wcagAAA']);
  const state = engine.run({
    'bypass': undefined,
    'colors': ['#777777', '#ffffff'],
    'contrast': undefined,
    'emit': undefined,
    'maxColors': undefined,
    'metadata': undefined,
    'roles': {
      'contrastPairs': [
        { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'link', 'minRatio': 5.5 }
      ],
      'description': undefined,
      'name': 'wcag-link-intent',
      'roles': [
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'link', 'lightnessRange': [0.00, 0.70], 'name': 'link', 'required': true },
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.85, 1.00], 'name': 'background', 'required': true }
      ]
    },
    'runtime': undefined
  });
  const aaPair = getContrastMetadata(state.metadata, 'contrast:aa')?.pairs.at(0);
  const aaaPair = getContrastMetadata(state.metadata, 'contrast:aaa')?.pairs.at(0);
  assert.ok(aaPair !== undefined && aaaPair !== undefined, 'link WCAG results present');
  assert.equal(aaPair.required, 5.5, 'link configured AA target');
  assert.equal(aaaPair.required, 5.5, 'link configured AAA target');
  assert.equal(aaPair.pass, true, 'link AA pass');
  assert.equal(aaaPair.pass, true, 'link AAA pass');
});

// CVD role schemas — hue offsets and lightness bands pin the distance-picker.

/** Red foreground / green background (protanopia / deuteranopia family). */
const CVD_RED_GREEN_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name':  'cvd-red-green',
  'roles': [
    { 'chromaRange': [0.10, 0.40],       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 29, 'intent': undefined, 'lightnessRange': [0.40, 0.70], 'name': 'text', 'required': true  },
    { 'chromaRange': [0.10, 0.40], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 142, 'intent': undefined, 'lightnessRange': [0.40, 0.70], 'name': 'background', 'required': true }
  ]
};

/** Blue foreground / yellow background (tritanopia family). */
const CVD_BLUE_YELLOW_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name':  'cvd-blue-yellow',
  'roles': [
    { 'chromaRange': [0.10, 0.40],       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 264, 'intent': undefined, 'lightnessRange': [0.30, 0.60], 'name': 'text', 'required': true },
    { 'chromaRange': [0.10, 0.40], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 110, 'intent': undefined, 'lightnessRange': [0.85, 1.00], 'name': 'background', 'required': true }
  ]
};

/** Near-iso-luminant red/green (achromatopsia floor signal). */
const CVD_ISOLUM_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name':  'cvd-isolum',
  'roles': [
    { 'chromaRange': [0.20, 0.30],       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 29, 'intent': undefined, 'lightnessRange': [0.55, 0.70], 'name': 'text', 'required': true  },
    { 'chromaRange': [0.20, 0.30], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 142, 'intent': undefined, 'lightnessRange': [0.70, 0.85], 'name': 'background', 'required': true }
  ]
};

/** Black-on-white: canonical maximum-contrast pair (CVD negative case). */
const CVD_BLACK_WHITE_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name':  'cvd-black-white',
  'roles': [
    { 'chromaRange': [0.00, 0.05],       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.00, 0.20], 'name': 'text', 'required': true },
    { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.90, 1.00], 'name': 'background', 'required': true }
  ]
};

/** Reported dark-theme cyan accent on a near-black canvas. */
const CVD_DARK_ACCENT_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name':  'cvd-dark-accent',
  'roles': [
    { 'chromaRange': [0.10, 0.12], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'link', 'lightnessRange': [0.60, 0.75], 'name': 'text', 'required': true },
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.08, 0.20], 'name': 'background', 'required': true }
  ]
};

/** Reverse of the reported pair: near-black foreground on cyan. */
const CVD_DARK_ON_ACCENT_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name':  'cvd-dark-on-accent',
  'roles': [
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.08, 0.20], 'name': 'text', 'required': true },
    { 'chromaRange': [0.10, 0.12], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.60, 0.75], 'name': 'background', 'required': true }
  ]
};

/** One foreground constrained against two independently declared backgrounds. */
const CVD_SHARED_FOREGROUND_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'backgroundLow', 'foreground': 'text', 'minRatio': 1.0 },
    { 'algorithm': 'wcag21', 'background': 'backgroundHigh', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name': 'cvd-shared-foreground',
  'roles': [
    { 'chromaRange': [0.15, 0.30], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 29, 'intent': undefined, 'lightnessRange': [0.50, 0.56], 'name': 'text', 'required': true },
    { 'chromaRange': [0.12, 0.25], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 142, 'intent': undefined, 'lightnessRange': [0.48, 0.55], 'name': 'backgroundLow', 'required': true },
    { 'chromaRange': [0.15, 0.28], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 142, 'intent': undefined, 'lightnessRange': [0.58, 0.64], 'name': 'backgroundHigh', 'required': true }
  ]
};

/** Achromatic/near-achromatic pair used to prove the search reaches C=0. */
const CVD_ACHROMATIC_CORRECTION_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name': 'cvd-achromatic-correction',
  'roles': [
    { 'chromaRange': [0, 0.01], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.45, 0.55], 'name': 'text', 'required': true },
    { 'chromaRange': [0, 0.01], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.60, 0.70], 'name': 'background', 'required': true }
  ]
};

/** Peer-supplied extremum-collapse reproduction. */
const CVD_EXTREMUM_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name': 'cvd-extremum',
  'roles': [
    { 'chromaRange': [0.04, 0.08], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 19, 'intent': undefined, 'lightnessRange': [0.15, 0.23], 'name': 'text', 'required': true },
    { 'chromaRange': [0.05, 0.10], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 283, 'intent': undefined, 'lightnessRange': [0.43, 0.52], 'name': 'background', 'required': true }
  ]
};

/** Pair with a bounded correction that fixes two types while one remains. */
const CVD_PARTIAL_CORRECTION_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name': 'cvd-partial-correction',
  'roles': [
    { 'chromaRange': [0.13, 0.17], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 255.34034740179777, 'intent': undefined, 'lightnessRange': [0.65, 0.72], 'name': 'text', 'required': true },
    { 'chromaRange': [0.24, 0.28], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 45.69293302483857, 'intent': undefined, 'lightnessRange': [0.40, 0.48], 'name': 'background', 'required': true }
  ]
};

/**
 * Role schema for enforce:contrast (core task) tests.
 * Text range [0.40, 0.90] accepts both light grays (failing) and dark grays
 * (passing). Background range [0.90, 1.00] anchors white.
 *   - #aaaaaa (L≈0.70, in range) → before≈2.3:1, adjusted=true
 *   - #494949 (L≈0.41, in range) → before≈9:1, adjusted=false
 */
const ENFORCE_CONTRAST_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 4.5 }
  ],
  'description': undefined,
  'name':  'enforce-contrast-adj',
  'roles': [
    { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.40, 0.90], 'name': 'text', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.90, 1.00], 'name': 'background', 'required': true }
  ]
};

abstract class ContrastReportShape {
  abstract readonly 'adjusted': boolean;
  abstract readonly 'algorithm': string;
  abstract readonly 'background': string;
  abstract readonly 'foreground': string;
  abstract readonly 'minRatio': number;
  abstract readonly 'passed': boolean;
  abstract readonly 'ratio': number;

  static read(state: PaletteStateInterface): readonly ContrastReportShape[] | undefined {
    const report = state.metadata['core:contrastReport'];
    return Array.isArray(report) ? report as readonly ContrastReportShape[] : undefined;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin.shape
//
// ContrastPlugin must export a singleton `contrastPlugin` of class
// ContrastPlugin with:
//   - name    = 'contrast'
//   - version = '0.1.0'
//   - tasks() = exactly four enforce tasks in the canonical order
// The singleton is idempotent: multiple calls to tasks() return the same names.
// ---------------------------------------------------------------------------

abstract class PluginShapeInput {
  abstract readonly '_noop': true;
}
abstract class PluginShapeOutput {
  abstract readonly 'isInstance': boolean;
  abstract readonly 'name': string;
  abstract readonly 'taskNames': readonly string[];
  abstract readonly 'taskNamesB': readonly string[];
  abstract readonly 'version': string;
}

const pluginShapeScenarios: readonly ScenarioRunner.ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=identity] no throw');
      assert.strictEqual(output!.isInstance, true,    '[cell=1, scenario=identity] instanceof ContrastPlugin');
      assert.strictEqual(output!.name,       'contrast', '[cell=1, scenario=identity] name');
      assert.strictEqual(output!.version,    '0.1.0',    '[cell=1, scenario=identity] version');
    },
    'input': { '_noop': true },
    'kind': 'happy',
    'name': 'singleton is ContrastPlugin instance with correct name and version'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        ['enforce:apca', 'enforce:cvdSimulate', 'enforce:wcagAA', 'enforce:wcagAAA'],
        '[cell=1, scenario=task-names] exactly four enforce tasks'
      );
    },
    'input': { '_noop': true },
    'kind': 'happy',
    'name': 'tasks() returns exactly the four canonical enforce task names'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=idempotent] no throw');
      assert.deepStrictEqual(
        [...output!.taskNamesB].sort(),
        [...output!.taskNames].sort(),
        '[cell=1, scenario=idempotent] second tasks() call matches first'
      );
    },
    'input': { '_noop': true },
    'kind': 'edge',
    'name': 'tasks() is idempotent — two calls return the same names'
  }
];

await new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'ContrastPlugin :: cell-1 :: plugin.shape',
  (_input) => {
    return {
      'isInstance':  contrastPlugin instanceof ContrastPlugin,
      'name':        contrastPlugin.name,
      'taskNames':   contrastPlugin.tasks().map((t) => { const result = t.name; return result; }),
      'taskNamesB':  contrastPlugin.tasks().map((t) => { const result = t.name; return result; }),
      'version':     contrastPlugin.version
    };
  }
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — enforce:wcagAA
//
// enforce:wcagAA runs on all contrastPairs with algorithm='wcag21'. It:
//   - writes metadata.wcag.aa.pairs with foreground, background, algorithm,
//     required, before, after, pass fields
//   - uses pair.minRatio as the required ratio when > 0
//   - adjusts the foreground role so after >= required
//   - produces no output and skips silently when contrastPairs is empty
//   - ignores pairs whose algorithm is not 'wcag21'
// ---------------------------------------------------------------------------

interface WcagAaInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}
interface WcagAaOutputInterface {
  readonly 'state': PaletteStateInterface;
}

const wcagAaScenarios: readonly ScenarioRunner.ScenarioInterface<WcagAaInputInterface, WcagAaOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-passing] no throw');
      const aa = getContrastMetadata(output!.state.metadata, 'contrast:aa');
      assert.ok(aa !== undefined,        '[cell=2, scenario=aa-passing] metadata[\'contrast:aa\'] written');
      assert.ok(Array.isArray(aa.pairs),  '[cell=2, scenario=aa-passing] aa.pairs is array');
      assert.strictEqual(aa.pairs.length, 1, '[cell=2, scenario=aa-passing] one pair processed');
      const pair = aa.pairs.at(0)!;
      assert.strictEqual(pair.foreground, 'text',       '[cell=2, scenario=aa-passing] foreground name');
      assert.strictEqual(pair.background, 'background', '[cell=2, scenario=aa-passing] background name');
      assert.strictEqual(pair.algorithm,  'wcag21',     '[cell=2, scenario=aa-passing] algorithm field');
      assert.strictEqual(pair.required,   4.5,          '[cell=2, scenario=aa-passing] required from minRatio');
      assert.ok(pair.before >= pair.required, `[cell=2, scenario=aa-passing] before ${pair.before} already >= 4.5 (no adjustment)`);
      assert.ok(pair.after  >= pair.required, `[cell=2, scenario=aa-passing] after ${pair.after} >= required ${pair.required}`);
      assert.strictEqual(pair.pass, true, '[cell=2, scenario=aa-passing] pass=true');
    },
    'input': {
      'input': {
        'bypass': undefined,
        // #494949 (L≈0.41) maps to text range [0.30, 0.60]; white maps to background.
        // #494949 on white ≈ 9:1 — already passes AA without adjustment.
        'colors': ['#494949', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  WcagAaRoleFixture.create('text', 'background'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA']
    },
    'kind': 'happy',
    'name': 'dark gray on white already meets 4.5:1 — no adjustment'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-adjusted] no throw');
      const aa = getContrastMetadata(output!.state.metadata, 'contrast:aa');
      const pair = aa?.pairs.at(0)!;
      assert.ok(pair !== undefined,           '[cell=2, scenario=aa-adjusted] pair present');
      assert.ok(pair.before < pair.required,  `[cell=2, scenario=aa-adjusted] before ${pair.before} was below required ${pair.required}`);
      assert.ok(pair.after  >= pair.required, `[cell=2, scenario=aa-adjusted] after ${pair.after} meets required ${pair.required}`);
      assert.strictEqual(pair.pass, true,     '[cell=2, scenario=aa-adjusted] pass=true after adjustment');
      // Foreground role hex must differ from original seed after adjustment.
      const textHex = output!.state.roles.text?.hex;
      assert.ok(textHex !== undefined, '[cell=2, scenario=aa-adjusted] text role assigned');
      assert.notStrictEqual(
        textHex.toLowerCase(), '#aaaaaa',
        '[cell=2, scenario=aa-adjusted] text role was adjusted from low-contrast seed'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#aaaaaa', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  WcagAaRoleFixture.create('text', 'background'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA']
    },
    'kind': 'happy',
    'name': 'failing pair: low-contrast gray adjusted to meet 4.5:1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-boundary] no throw');
      const aa = getContrastMetadata(output!.state.metadata, 'contrast:aa');
      const pair = aa?.pairs.at(0)!;
      assert.ok(pair !== undefined,            '[cell=2, scenario=aa-boundary] pair present');
      assert.ok(pair.after >= pair.required,   `[cell=2, scenario=aa-boundary] after ${pair.after} >= required ${pair.required}`);
      assert.strictEqual(pair.pass, true,      '[cell=2, scenario=aa-boundary] pair passes at boundary');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#767676', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  WcagAaRoleFixture.create('text', 'background', 4.5),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA']
    },
    'kind': 'edge',
    'name': 'boundary: minRatio 3.0 large-text pair — just-passing accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-no-pairs] no throw');
      const aa = getContrastMetadata(output!.state.metadata, 'contrast:aa');
      assert.ok(aa === undefined, '[cell=2, scenario=aa-no-pairs] contrast:aa slot absent when no pairs');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': undefined,
          'description': undefined,
          'name':  'no-pairs',
          'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true }]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA']
    },
    'kind': 'edge',
    'name': 'no contrastPairs in schema: wcag.aa not written'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-skip-apca] no throw');
      const aa = getContrastMetadata(output!.state.metadata, 'contrast:aa');
      // Task still writes the aa slot when it iterates, but all apca pairs are skipped.
      // If contrast:aa is written, pairs must be empty.
      if (aa !== undefined) {
        assert.strictEqual(
          aa.pairs.length, 0,
          '[cell=2, scenario=aa-skip-apca] apca-only pair produces 0 contrast:aa entries'
        );
      }
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': [
            { 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minRatio': 1 }
          ],
          'description': undefined,
          'name':  'apca-only',
          'roles': [
            { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text', 'required': true },
            { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'background', 'required': true }
          ]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA']
    },
    'kind': 'edge',
    'name': 'apca-algorithm pair is skipped: wcag.aa pairs array is empty'
  }
];

await new ScenarioRunner<WcagAaInputInterface, WcagAaOutputInterface>(
  'ContrastPlugin :: cell-2 :: enforce:wcagAA',
  (input) => {
    const engine = ContrastTestEngine.create();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    return { 'state': state };
  }
).run(wcagAaScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — enforce:wcagAAA
//
// enforce:wcagAAA targets 7:1 for normal text and 4.5:1 for UI. It:
//   - writes metadata.wcag.aaa.pairs with before/after/pass fields
//   - adjusts the foreground role when before < 7.0
//   - produces no output when contrastPairs is empty
//   - coexists with enforce:wcagAA in a combined pipeline (each writes its own slot)
// ---------------------------------------------------------------------------

interface WcagAaaInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}
interface WcagAaaOutputInterface {
  readonly 'state': PaletteStateInterface;
}

const wcagAaaScenarios: readonly ScenarioRunner.ScenarioInterface<WcagAaaInputInterface, WcagAaaOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-passing] no throw');
      const aaa = getContrastMetadata(output!.state.metadata, 'contrast:aaa');
      assert.ok(aaa !== undefined,        '[cell=3, scenario=aaa-passing] metadata[\'contrast:aaa\'] written');
      assert.ok(Array.isArray(aaa.pairs),  '[cell=3, scenario=aaa-passing] aaa.pairs is array');
      const pair = aaa.pairs.at(0)!;
      assert.strictEqual(pair.required, 7, '[cell=3, scenario=aaa-passing] required=7 from minRatio');
      assert.ok(pair.after >= 7,           `[cell=3, scenario=aaa-passing] after ${pair.after} >= 7`);
      assert.strictEqual(pair.pass, true,  '[cell=3, scenario=aaa-passing] pass=true');
    },
    'input': {
      'input': {
        'bypass': undefined,
        // #000000 is clamped to L=0.10 minimum (lightnessRange [0.10, 0.55]);
        // the resulting dark gray on white is ≈21:1 — clears AAA with margin.
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  WcagAaaRoleFixture.create('text', 'background'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
    },
    'kind': 'happy',
    'name': 'near-black on white already meets 7:1 — pass with no adjustment'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-adjusted] no throw');
      const aaa = getContrastMetadata(output!.state.metadata, 'contrast:aaa');
      const pair = aaa?.pairs.at(0)!;
      assert.ok(pair !== undefined, '[cell=3, scenario=aaa-adjusted] pair present');
      assert.ok(pair.before < pair.required, `[cell=3, scenario=aaa-adjusted] before ${pair.before} was below 7`);
      assert.ok(pair.after  >= pair.required, `[cell=3, scenario=aaa-adjusted] after ${pair.after} meets 7 after enforce`);
      assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-adjusted] pass=true');
      const textHex = output!.state.roles.text?.hex;
      const bgHex   = output!.state.roles.background?.hex;
      assert.ok(textHex !== undefined && bgHex !== undefined, '[cell=3, scenario=aaa-adjusted] both roles assigned');
      assert.notStrictEqual(textHex, bgHex, '[cell=3, scenario=aaa-adjusted] text hex differs from bg after enforce');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#777777', '#aaaaaa'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  WcagAaaRoleFixture.create('text', 'background'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
    },
    'kind': 'happy',
    'name': 'low-contrast mid-gray pair adjusted to ≥7:1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-combined] no throw');
      const aa = getContrastMetadata(output!.state.metadata, 'contrast:aa');
      const aaa = getContrastMetadata(output!.state.metadata, 'contrast:aaa');
      assert.ok(aa  !== undefined, '[cell=3, scenario=aaa-combined] contrast:aa written');
      assert.ok(aaa !== undefined, '[cell=3, scenario=aaa-combined] contrast:aaa written');
      assert.strictEqual(aa.pairs.length,  1, '[cell=3, scenario=aaa-combined] one aa pair');
      assert.strictEqual(aaa.pairs.length, 1, '[cell=3, scenario=aaa-combined] one aaa pair');
      // AA uses the schema's 4.5 minRatio; AAA uses the schema's 4.5 too (wcagRequiredRatio
      // selects AAA-level minimum when minRatio > 0, it returns pair.minRatio directly).
      // Both tasks see the same 4.5 from the schema; verify each slot is independently written.
      assert.strictEqual(aa.pairs.at(0)!.required,  4.5, '[cell=3, scenario=aaa-combined] aa required=4.5');
      assert.strictEqual(aaa.pairs.at(0)!.required, 4.5, '[cell=3, scenario=aaa-combined] aaa required=4.5 (both tasks read same schema)');
      assert.strictEqual(aa.pairs.at(0)!.pass,  true, '[cell=3, scenario=aaa-combined] aa passes');
      assert.strictEqual(aaa.pairs.at(0)!.pass, true, '[cell=3, scenario=aaa-combined] aaa passes');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        // Use explicit minRatio on each schema so both tasks process the pair.
        // enforce:wcagAA picks up the 4.5 value; enforce:wcagAAA picks up the
        // 7.0 value from its own schema (contrastPairs are read independently).
        'roles': {
          'contrastPairs': [
            { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 4.5 }
          ],
          'description': undefined,
          'name':  'combined',
          'roles': [
            { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text', 'required': true },
            { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'background', 'required': true }
          ]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA', 'enforce:wcagAAA']
    },
    'kind': 'happy',
    'name': 'AA + AAA combined pipeline — both slots written independently'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-no-pairs] no throw');
      const aaa = getContrastMetadata(output!.state.metadata, 'contrast:aaa');
      assert.ok(aaa === undefined, '[cell=3, scenario=aaa-no-pairs] contrast:aaa slot absent when no pairs');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': undefined,
          'description': undefined,
          'name':  'no-pairs',
          'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true }]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
    },
    'kind': 'edge',
    'name': 'no contrastPairs in schema: wcag.aaa not written'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-at-boundary] no throw');
      const aaa = getContrastMetadata(output!.state.metadata, 'contrast:aaa');
      const pair = aaa?.pairs.at(0)!;
      assert.ok(pair !== undefined, '[cell=3, scenario=aaa-at-boundary] pair present');
      assert.ok(pair.before >= pair.required,
        `[cell=3, scenario=aaa-at-boundary] before ${pair.before} already >= required ${pair.required}`);
      assert.ok(pair.after >= pair.required, `[cell=3, scenario=aaa-at-boundary] after ${pair.after} >= 7`);
      assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-at-boundary] pass=true when already above AAA threshold');
    },
    'input': {
      'input': {
        'bypass': undefined,
        // #1a1a1a on white is ≈17:1 — clears AAA boundary with margin.
        // Lightness bands pin assignment: dark to text, light to background.
        'colors': ['#1a1a1a', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': [
            { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 7.0 }
          ],
          'description': undefined,
          'name':  'wcag-aaa-edge',
          'roles': [
            { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.00, 0.30], 'name': 'text', 'required': true },
            { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.90, 1.00], 'name': 'background', 'required': true }
          ]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
    },
    'kind': 'edge',
    'name': 'near-black on white: before already exceeds 7:1 — no adjustment needed'
  }
];

await new ScenarioRunner<WcagAaaInputInterface, WcagAaaOutputInterface>(
  'ContrastPlugin :: cell-3 :: enforce:wcagAAA',
  (input) => {
    const engine = ContrastTestEngine.create();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    return { 'state': state };
  }
).run(wcagAaaScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — enforce:apca
//
// enforce:apca filters pairs whose algorithm='apca' and selects the Lc target
// by role hint intents:
//   - text + background → Lc 75 (body text)
//   - text, link, muted, onAccent, or onButton foreground → Lc 60 (fluent/headline)
//   - generic foreground → Lc 45 (non-text UI)
// It writes metadata.wcag.apca.pairs. No-pairs → no output.
// ---------------------------------------------------------------------------

interface ApcaInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}
interface ApcaOutputInterface {
  readonly 'state': PaletteStateInterface;
}

const apcaScenarios: readonly ScenarioRunner.ScenarioInterface<ApcaInputInterface, ApcaOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-body-text] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      assert.ok(apca !== undefined,        '[cell=4, scenario=apca-body-text] metadata[\'contrast:apca\'] written');
      assert.ok(Array.isArray(apca.pairs),  '[cell=4, scenario=apca-body-text] apca.pairs is array');
      assert.strictEqual(apca.pairs.length, 1, '[cell=4, scenario=apca-body-text] one pair processed');
      const pair = apca.pairs.at(0)!;
      assert.strictEqual(pair.foreground, 'text',       '[cell=4, scenario=apca-body-text] foreground name');
      assert.strictEqual(pair.background, 'background', '[cell=4, scenario=apca-body-text] background name');
      assert.strictEqual(pair.algorithm,  'apca',       '[cell=4, scenario=apca-body-text] algorithm=apca');
      assert.strictEqual(pair.requiredLc, 75,
        `[cell=4, scenario=apca-body-text] requiredLc=75 for text+background intent (got ${pair.requiredLc})`);
      assert.ok(pair.afterLc >= pair.requiredLc,
        `[cell=4, scenario=apca-body-text] afterLc ${pair.afterLc} >= requiredLc 75`);
      assert.strictEqual(pair.pass, true, '[cell=4, scenario=apca-body-text] pass=true');
      assert.ok(Math.abs(pair.afterLc) >= 45,
        `[cell=4, scenario=apca-body-text] afterLc magnitude ${pair.afterLc} substantial for high-contrast pair`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  ApcaRoleFixture.create('text', 'background'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'happy',
    'name': 'text+background intent selects Lc 75 body-text target; black on white passes'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-fluent] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      const pair = apca?.pairs.at(0)!;
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-fluent] pair present');
      assert.strictEqual(pair.requiredLc, 60,
        `[cell=4, scenario=apca-fluent] requiredLc=60 for text+accent intent (got ${pair.requiredLc})`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#888888'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': [
            { 'algorithm': 'apca', 'background': 'card', 'foreground': 'heading', 'minRatio': 1 }
          ],
          'description': undefined,
          'name':  'apca-fluent',
          'roles': [
            // text intent on fg, accent on bg — triggers the isText-only branch (Lc 60).
            { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined,   'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.00, 0.30], 'name': 'heading', 'required': true },
            { 'chromaRange': [0.00, 0.05],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.40, 0.65], 'name': 'card', 'required': true }
          ]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'happy',
    'name': 'text intent without background selects Lc 60 fluent-text target'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-on-accent] no throw');
      const pair = getContrastMetadata(output!.state.metadata, 'contrast:apca')?.pairs.at(0);
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-on-accent] pair present');
      assert.strictEqual(pair.requiredLc, 60,
        '[cell=4, scenario=apca-on-accent] onAccent selects the fluent-text Lc target');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': ApcaRoleFixture.create('onAccent', 'accent'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'happy',
    'name': 'onAccent foreground selects the fluent-text APCA target'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-on-button] no throw');
      const pair = getContrastMetadata(output!.state.metadata, 'contrast:apca')?.pairs.at(0);
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-on-button] pair present');
      assert.strictEqual(pair.requiredLc, 60,
        '[cell=4, scenario=apca-on-button] onButton selects the fluent-text Lc target');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': ApcaRoleFixture.create('onButton', 'button'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'happy',
    'name': 'onButton foreground selects the fluent-text APCA target'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-ui] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      const pair = apca?.pairs.at(0)!;
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-ui] pair present');
      assert.strictEqual(pair.requiredLc, 45,
        `[cell=4, scenario=apca-ui] requiredLc=45 for no-intent UI pair (got ${pair.requiredLc})`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#888888', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': [
            { 'algorithm': 'apca', 'background': 'canvas', 'foreground': 'icon', 'minRatio': 1 }
          ],
          'description': undefined,
          'name':  'apca-ui',
          'roles': [
            { 'chromaRange': [0.00, 0.05],   'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.30, 0.60], 'name': 'icon', 'required': true },
            { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.85, 1.00], 'name': 'canvas', 'required': true }
          ]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'happy',
    'name': 'no intent on either role selects Lc 45 non-text-UI target'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-derived-intent] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      const pair = apca?.pairs.at(0)!;
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-derived-intent] pair present');
      assert.strictEqual(output!.state.roles.overlayGlyph?.hints?.intent, 'text',
        '[cell=4, scenario=apca-derived-intent] derived schema intent reaches canonical role state');
      assert.strictEqual(pair.requiredLc, 60,
        `[cell=4, scenario=apca-derived-intent] explicit derived text intent selects Lc 60 (got ${pair.requiredLc})`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': ApcaRoleFixture.createDerived('text'),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'expand:family', 'enforce:apca']
    },
    'kind': 'happy',
    'name': 'explicit intent on a derived role selects the fluent-text APCA target'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-derived-generic] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      const pair = apca?.pairs.at(0)!;
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-derived-generic] pair present');
      assert.strictEqual(output!.state.roles.overlayGlyph?.hints, undefined,
        '[cell=4, scenario=apca-derived-generic] unspecified derived intent does not inherit source intent');
      assert.strictEqual(pair.requiredLc, 45,
        `[cell=4, scenario=apca-derived-generic] unspecified derived intent retains Lc 45 generic fallback (got ${pair.requiredLc})`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': ApcaRoleFixture.createDerived(undefined),
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'expand:family', 'enforce:apca']
    },
    'kind': 'edge',
    'name': 'unspecified intent on a derived role retains the generic APCA target'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-no-pairs] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      assert.ok(apca === undefined, '[cell=4, scenario=apca-no-pairs] contrast:apca slot absent when no pairs');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': undefined,
          'description': undefined,
          'name':  'no-pairs',
          'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true }]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'edge',
    'name': 'no contrastPairs in schema: apca slot not written'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-ignore-wcag21] no throw');
      const apca = getContrastMetadata(output!.state.metadata, 'contrast:apca');
      // enforce:apca must skip wcag21 pairs — apca slot absent or empty.
      if (apca !== undefined) {
        assert.strictEqual(
          apca.pairs.length, 0,
          '[cell=4, scenario=apca-ignore-wcag21] wcag21 pair produces 0 contrast:apca entries'
        );
      }
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  WcagAaRoleFixture.create('text', 'background'),  // wcag21 algorithm
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:apca']
    },
    'kind': 'edge',
    'name': 'wcag21-algorithm pair in schema is ignored by enforce:apca'
  }
];

await new ScenarioRunner<ApcaInputInterface, ApcaOutputInterface>(
  'ContrastPlugin :: cell-4 :: enforce:apca',
  (input) => {
    const engine = ContrastTestEngine.create();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    return { 'state': state };
  }
).run(apcaScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — enforce:cvdSimulate
//
// enforce:cvdSimulate evaluates every contrastPair against all four CVD
// matrices and emits warnings on metadata['contrast:cvd'].warnings. Two signals:
//   - drop signal: |trichromat contrast − simulated contrast| > dropMagnitude
//   - floor signal: simulated contrast < minSimulatedContrast (3.0 SC-1.4.11)
// Achromatopsia uses BT.709 (luminance-invariant): drop is always ~0; only
// the floor signal fires. The task is advisory while cvdCorrect is disabled;
// correction mode may replace a foreground after joint constraint search.
// ---------------------------------------------------------------------------

interface CvdInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}
interface CvdOutputInterface {
  readonly 'state': PaletteStateInterface;
}

const cvdScenarios: readonly ScenarioRunner.ScenarioInterface<CvdInputInterface, CvdOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-deuter-floor] no throw');
      const cvd = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined,           '[cell=5, scenario=cvd-deuter-floor] metadata[\'contrast:cvd\'] written');
      assert.ok(Array.isArray(cvd.warnings),  '[cell=5, scenario=cvd-deuter-floor] cvd.warnings is array');
      const deuter = cvd.warnings.find((w) => {return w.cvdType === 'deuteranopia';});
      assert.ok(deuter !== undefined,              '[cell=5, scenario=cvd-deuter-floor] deuteranopia warning fires');
      assert.strictEqual(deuter.foreground, 'text',        '[cell=5, scenario=cvd-deuter-floor] foreground name');
      assert.strictEqual(deuter.background, 'background',  '[cell=5, scenario=cvd-deuter-floor] background name');
      assert.strictEqual(deuter.dropThreshold,       0.5,  '[cell=5, scenario=cvd-deuter-floor] dropThreshold=0.5');
      assert.strictEqual(deuter.minSimulatedContrast, 3.0, '[cell=5, scenario=cvd-deuter-floor] floor=3.0');
      assert.ok(
        deuter.simulatedLuminanceContrast < deuter.minSimulatedContrast,
        `[cell=5, scenario=cvd-deuter-floor] sim ${deuter.simulatedLuminanceContrast} below 3.0 floor`
      );
      assert.ok(deuter.originalLuminanceContrast > 1.0,
        `[cell=5, scenario=cvd-deuter-floor] original contrast ${deuter.originalLuminanceContrast} > 1`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#d00000', '#008000'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'saturated red on green raises deuteranopia warning (floor signal)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-prot-drop] no throw');
      const cvd = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-prot-drop] contrast:cvd written');
      const prot = cvd.warnings.find((w) => {return w.cvdType === 'protanopia';});
      assert.ok(prot !== undefined, '[cell=5, scenario=cvd-prot-drop] protanopia warning fires');
      assert.strictEqual(prot.foreground, 'text',       '[cell=5, scenario=cvd-prot-drop] foreground');
      assert.strictEqual(prot.background, 'background', '[cell=5, scenario=cvd-prot-drop] background');
      assert.ok(
        Math.abs(prot.drop) > prot.dropThreshold,
        `[cell=5, scenario=cvd-prot-drop] |drop| ${Math.abs(prot.drop)} > threshold ${prot.dropThreshold}`
      );
      const deut = cvd.warnings.find((w) => {return w.cvdType === 'deuteranopia';});
      assert.ok(deut !== undefined, '[cell=5, scenario=cvd-prot-drop] deuteranopia also fires (same confusion family)');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#ff0000', '#00cc00'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'pure red on green flags protanopia (drop signal) and deuteranopia'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-trit-drop] no throw');
      const cvdTrit = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvdTrit !== undefined, '[cell=5, scenario=cvd-trit-drop] cvd written');
      const trit = cvdTrit.warnings.find((w) => {return w.cvdType === 'tritanopia';});
      assert.ok(trit !== undefined, '[cell=5, scenario=cvd-trit-drop] tritanopia warning fires');
      assert.strictEqual(trit.foreground, 'text',       '[cell=5, scenario=cvd-trit-drop] foreground');
      assert.strictEqual(trit.background, 'background', '[cell=5, scenario=cvd-trit-drop] background');
      assert.strictEqual(trit.dropThreshold, 0.5, '[cell=5, scenario=cvd-trit-drop] dropThreshold=0.5');
      assert.ok(
        Math.abs(trit.drop) > trit.dropThreshold,
        `[cell=5, scenario=cvd-trit-drop] |drop| ${Math.abs(trit.drop)} > 0.5 for tritanopia`
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#0000ff', '#ffff00'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_BLUE_YELLOW_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'blue on yellow flags tritanopia (drop signal exceeds 0.5)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-achr-floor] no throw');
      const cvdAchr = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvdAchr !== undefined, '[cell=5, scenario=cvd-achr-floor] cvd written');
      const achr = cvdAchr.warnings.find((w) => {return w.cvdType === 'achromatopsia';});
      assert.ok(achr !== undefined, '[cell=5, scenario=cvd-achr-floor] achromatopsia warning fires');
      assert.strictEqual(achr.dropThreshold,        0,   '[cell=5, scenario=cvd-achr-floor] dropThreshold=0 by BT.709 invariance');
      assert.strictEqual(achr.minSimulatedContrast, 3.0, '[cell=5, scenario=cvd-achr-floor] floor=3.0 (SC-1.4.11)');
      assert.ok(
        Math.abs(achr.drop) < 0.001,
        `[cell=5, scenario=cvd-achr-floor] drop ${achr.drop} is ~0 for BT.709 luminance-preserving projection`
      );
      assert.ok(
        achr.simulatedLuminanceContrast < achr.minSimulatedContrast,
        `[cell=5, scenario=cvd-achr-floor] sim ${achr.simulatedLuminanceContrast} below 3.0 floor`
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#ff0000', '#00d800'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_ISOLUM_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'iso-luminant red/green flags achromatopsia via SC-1.4.11 floor (drop~0)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-clean-pass] no throw');
      const cvdClean = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvdClean !== undefined,               '[cell=5, scenario=cvd-clean-pass] cvd slot written');
      assert.ok(Array.isArray(cvdClean.warnings),     '[cell=5, scenario=cvd-clean-pass] warnings array present');
      assert.strictEqual(
        cvdClean.warnings.length, 0,
        `[cell=5, scenario=cvd-clean-pass] black-on-white must produce 0 CVD warnings; got ${cvdClean.warnings.length}`
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_BLACK_WHITE_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'black on white passes all four CVD checks — zero warnings (negative)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-no-pairs] no throw');
      const cvdNoPairs = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvdNoPairs === undefined, '[cell=5, scenario=cvd-no-pairs] cvd slot absent when no pairs');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': undefined,
          'description': undefined,
          'name':  'no-pairs',
          'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true }]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'no contrastPairs in schema: cvd slot not written'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-advisory-only] no throw');
      const textHex = output!.state.roles.text?.hex;
      const bgHex   = output!.state.roles.background?.hex;
      assert.ok(textHex !== undefined, '[cell=5, scenario=cvd-advisory-only] text role assigned');
      assert.ok(bgHex   !== undefined, '[cell=5, scenario=cvd-advisory-only] background role assigned');
      // Roles must not be mutated by the advisory task (no hex adjustment).
      // The text role should be derived from the red seed (#d00000) — not darkened/lightened.
      assert.ok(
        textHex.toLowerCase() !== bgHex.toLowerCase(),
        '[cell=5, scenario=cvd-advisory-only] roles remain distinct (no auto-fix applied)'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#d00000', '#008000'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'cvdSimulate is advisory only — roles not mutated'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-improves] no throw');
      const textHex = output!.state.roles.text?.hex;
      assert.ok(textHex !== undefined, '[cell=5, scenario=cvd-correct-improves] text role assigned');

      // Baseline: same fixture, resolve:roles only (pre-correction hex),
      // so the comparison isolates enforce:cvdSimulate's own mutation.
      const baselineEngine = ContrastTestEngine.create();
      baselineEngine.pipeline(['intake:hex', 'resolve:roles']);
      const baselineState = baselineEngine.run({
        'bypass': undefined,
        'colors': ['#d00000', '#008000'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      });
      const correctedRecord = output!.state.roles.text;
      const correctedBackground = output!.state.roles.background;
      const baselineRecord = baselineState.roles.text;
      const baselineBackground = baselineState.roles.background;
      assert.ok(correctedRecord !== undefined, '[cell=5, scenario=cvd-correct-improves] corrected foreground present');
      assert.ok(correctedBackground !== undefined, '[cell=5, scenario=cvd-correct-improves] corrected background present');
      assert.ok(baselineRecord !== undefined, '[cell=5, scenario=cvd-correct-improves] baseline foreground present');
      assert.ok(baselineBackground !== undefined, '[cell=5, scenario=cvd-correct-improves] baseline background present');
      assert.ok(
        textHex.toLowerCase() !== baselineRecord.hex.toLowerCase(),
        `[cell=5, scenario=cvd-correct-improves] text role hex ${textHex} differs from pre-correction hex ${baselineRecord.hex}`
      );
      assert.ok(correctedRecord.oklch.l < baselineRecord.oklch.l, '[cell=5, scenario=cvd-correct-improves] minimum valid darker candidate selected');
      assert.ok(correctedRecord.oklch.l > 0, '[cell=5, scenario=cvd-correct-improves] darker correction does not collapse to black');
      assert.ok(correctedRecord.oklch.c > 0, '[cell=5, scenario=cvd-correct-improves] darker correction retains chroma');
      assert.ok(
        HueDistance.between(correctedRecord.oklch.h, baselineRecord.oklch.h) < 1,
        '[cell=5, scenario=cvd-correct-improves] emitted sRGB correction preserves hue within one degree'
      );
      assert.ok(
        contrastWcag21.apply(correctedRecord, correctedBackground) + 1e-12 >= contrastWcag21.apply(baselineRecord, baselineBackground),
        '[cell=5, scenario=cvd-correct-improves] darker correction preserves trichromat baseline'
      );

      const cvd = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-improves] cvd slot written');
      const deuterStillWarns = cvd.warnings.some((w) => {return w.cvdType === 'deuteranopia';});
      const correction = (cvd.corrections ?? []).find((c) => {return c.foreground === 'text';});
      const deuterFixed = correction?.cvdTypesFixed.includes('deuteranopia') ?? false;
      assert.ok(
        !deuterStillWarns || deuterFixed,
        '[cell=5, scenario=cvd-correct-improves] deuteranopia is either resolved (absent from warnings) or reported fixed in corrections'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#d00000', '#008000'],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'cvdCorrect=true improves a deliberately-bad pair and mutates the foreground role'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-dark-accent] no throw');
      assert.ok(output !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] output present');
      const corrected = output.state.roles.text;
      const background = output.state.roles.background;
      assert.ok(corrected !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] corrected foreground present');
      assert.ok(background !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] background present');

      const baselineEngine = ContrastTestEngine.create();
      baselineEngine.pipeline(['intake:oklch', 'resolve:roles']);
      const baselineState = baselineEngine.run({
        'bypass': undefined,
        'colors': [
          { 'c': 0.11, 'h': 206.1, 'l': 0.665 },
          { 'c': 0.015276054573075558, 'h': 252.51270656713, 'l': 0.12004924674202846 }
        ],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_DARK_ACCENT_ROLES,
        'runtime': undefined
      });
      const original = baselineState.roles.text;
      const baselineBackground = baselineState.roles.background;
      assert.ok(original !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] baseline foreground present');
      assert.ok(baselineBackground !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] baseline background present');

      assert.strictEqual(original.hex, '#18a6b5', '[cell=5, scenario=cvd-correct-dark-accent] report foreground reproduced');
      assert.notStrictEqual(corrected.hex, '#ffffff', '[cell=5, scenario=cvd-correct-dark-accent] correction does not blow out to white');
      assert.notStrictEqual(corrected.hex, '#000000', '[cell=5, scenario=cvd-correct-dark-accent] correction does not collapse to black');
      assert.ok(corrected.oklch.l > original.oklch.l, '[cell=5, scenario=cvd-correct-dark-accent] minimum valid lighter candidate selected');
      assert.ok(corrected.oklch.l - original.oklch.l <= 0.05, '[cell=5, scenario=cvd-correct-dark-accent] lightness correction remains local');
      assert.ok(corrected.oklch.c >= 0.05, '[cell=5, scenario=cvd-correct-dark-accent] usable chroma remains');
      assert.ok(
        HueDistance.between(corrected.oklch.h, original.oklch.h) < 1,
        '[cell=5, scenario=cvd-correct-dark-accent] emitted sRGB correction preserves hue within one degree'
      );
      assert.ok(
        Math.hypot(corrected.oklch.l - original.oklch.l, corrected.oklch.c - original.oklch.c)
          < Math.hypot(1 - original.oklch.l, original.oklch.c),
        '[cell=5, scenario=cvd-correct-dark-accent] correction is closer than white in OKLCH'
      );
      assert.ok(
        contrastWcag21.apply(corrected, background) + 1e-12 >= contrastWcag21.apply(original, baselineBackground),
        '[cell=5, scenario=cvd-correct-dark-accent] trichromat baseline preserved'
      );

      const cvd = getContrastMetadata(output.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] cvd metadata present');
      assert.strictEqual(cvd.warnings.length, 0, '[cell=5, scenario=cvd-correct-dark-accent] all CVD failures cleared');
      const correction = (cvd.corrections ?? []).find((entry) => {return entry.foreground === 'text';});
      assert.ok(correction !== undefined, '[cell=5, scenario=cvd-correct-dark-accent] correction recorded');
      assert.ok(correction.cvdTypesFixed.includes('protanopia'), '[cell=5, scenario=cvd-correct-dark-accent] reported protanopia failure fixed');

      const repeated = CvdTaskProbe.run({
        'background': baselineBackground,
        'text': original
      }, [
        { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1 }
      ], true);
      assert.strictEqual(
        repeated.roles.text?.hex,
        corrected.hex,
        '[cell=5, scenario=cvd-correct-dark-accent] bounded emitted-color search remains deterministic'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': [
          { 'c': 0.11, 'h': 206.1, 'l': 0.665 },
          { 'c': 0.015276054573075558, 'h': 252.51270656713, 'l': 0.12004924674202846 }
        ],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_DARK_ACCENT_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'reported cyan-on-near-black correction clears CVD without white blowout'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-baseline-boundary] no throw');
      assert.ok(output !== undefined, '[cell=5, scenario=cvd-correct-baseline-boundary] output present');
      const corrected = output.state.roles.text;
      assert.ok(corrected !== undefined, '[cell=5, scenario=cvd-correct-baseline-boundary] foreground present');
      assert.strictEqual(corrected.hex, '#03060b', '[cell=5, scenario=cvd-correct-baseline-boundary] no valid candidate leaves foreground unchanged');
      assert.ok(corrected.oklch.l > 0, '[cell=5, scenario=cvd-correct-baseline-boundary] unchanged foreground does not collapse to black');

      const cvd = getContrastMetadata(output.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-baseline-boundary] cvd metadata present');
      assert.strictEqual((cvd.corrections ?? []).length, 0, '[cell=5, scenario=cvd-correct-baseline-boundary] no invalid correction recorded');
      assert.ok(
        cvd.warnings.some((warning) => {return warning.cvdType === 'protanopia';}),
        '[cell=5, scenario=cvd-correct-baseline-boundary] unresolved failure remains advisory'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': [
          { 'c': 0.015276054573075558, 'h': 252.51270656713, 'l': 0.12004924674202846 },
          { 'c': 0.11, 'h': 206.1, 'l': 0.665 }
        ],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_DARK_ON_ACCENT_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'baseline boundary keeps the original when neither direction has a valid correction'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-shared-foreground] no throw');
      assert.ok(output !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] output present');
      const foreground = output.state.roles.text;
      const backgroundLow = output.state.roles.backgroundLow;
      const backgroundHigh = output.state.roles.backgroundHigh;
      assert.ok(foreground !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] shared foreground present');
      assert.ok(backgroundLow !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] low background present');
      assert.ok(backgroundHigh !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] high background present');
      assert.notStrictEqual(foreground.hex, '#d00000', '[cell=5, scenario=cvd-correct-shared-foreground] foreground corrected once for joint constraints');

      const cvd = getContrastMetadata(output.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] cvd metadata present');
      assert.strictEqual(cvd.warnings.length, 0, '[cell=5, scenario=cvd-correct-shared-foreground] terminal palette clears both pairs');
      assert.strictEqual((cvd.corrections ?? []).length, 2, '[cell=5, scenario=cvd-correct-shared-foreground] both pair corrections recorded after final audit');
      const correctedBackgrounds = new Set<string>();
      const correctionEntries = cvd.corrections ?? [];
      const correctionEntryCount = correctionEntries.length;
      for (let correctionIndex = 0; correctionIndex < correctionEntryCount; correctionIndex++) {
        const correctionEntry = correctionEntries.at(correctionIndex);
        if (correctionEntry !== undefined) {
          correctedBackgrounds.add(correctionEntry.background);
        }
      }
      assert.deepStrictEqual(correctedBackgrounds, new Set(['backgroundHigh', 'backgroundLow']), '[cell=5, scenario=cvd-correct-shared-foreground] metadata covers both declared backgrounds');

      const backgrounds = [backgroundLow, backgroundHigh];
      const backgroundCount = backgrounds.length;
      for (let backgroundIndex = 0; backgroundIndex < backgroundCount; backgroundIndex++) {
        const background = backgrounds.at(backgroundIndex);
        assert.ok(background !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] terminal background present');
        const probeState = CvdCandidateProbe.run(foreground, background);
        const probeCvd = getContrastMetadata(probeState.metadata, 'contrast:cvd');
        assert.ok(probeCvd !== undefined, '[cell=5, scenario=cvd-correct-shared-foreground] terminal probe metadata present');
        assert.strictEqual(probeCvd.warnings.length, 0, '[cell=5, scenario=cvd-correct-shared-foreground] independently audited final pair is valid');
      }
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#d00000', '#008000', '#00a000'],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_SHARED_FOREGROUND_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'shared foreground is optimized jointly and audited against both final backgrounds'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-zero-chroma] no throw');
      assert.ok(output !== undefined, '[cell=5, scenario=cvd-correct-zero-chroma] output present');
      const foreground = output.state.roles.text;
      assert.ok(foreground !== undefined, '[cell=5, scenario=cvd-correct-zero-chroma] foreground present');
      assert.ok(foreground.oklch.c < 0.0000001, '[cell=5, scenario=cvd-correct-zero-chroma] emitted neutral remains numerically achromatic');
      assert.notStrictEqual(foreground.hex, '#000000', '[cell=5, scenario=cvd-correct-zero-chroma] correction does not require black');
      assert.notStrictEqual(foreground.hex, '#ffffff', '[cell=5, scenario=cvd-correct-zero-chroma] correction does not require white');
      const cvd = getContrastMetadata(output.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-zero-chroma] cvd metadata present');
      assert.strictEqual(cvd.warnings.length, 0, '[cell=5, scenario=cvd-correct-zero-chroma] zero-chroma correction clears all CVD types');
      assert.strictEqual((cvd.corrections ?? []).length, 1, '[cell=5, scenario=cvd-correct-zero-chroma] correction recorded');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': [{ 'c': 0, 'h': 0, 'l': 0.5 }, { 'c': 0, 'h': 0, 'l': 0.65 }],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_ACHROMATIC_CORRECTION_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'zero-chroma foreground reaches a valid interior lightness candidate'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-near-zero-chroma] no throw');
      assert.ok(output !== undefined, '[cell=5, scenario=cvd-correct-near-zero-chroma] output present');
      const foreground = output.state.roles.text;
      assert.ok(foreground !== undefined, '[cell=5, scenario=cvd-correct-near-zero-chroma] foreground present');
      assert.ok(foreground.oklch.c > 0 && foreground.oklch.c < 0.000001, '[cell=5, scenario=cvd-correct-near-zero-chroma] near-zero chroma remains finite and searchable');
      assert.notStrictEqual(foreground.hex, '#000000', '[cell=5, scenario=cvd-correct-near-zero-chroma] correction does not require black');
      assert.notStrictEqual(foreground.hex, '#ffffff', '[cell=5, scenario=cvd-correct-near-zero-chroma] correction does not require white');
      const cvd = getContrastMetadata(output.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-near-zero-chroma] cvd metadata present');
      assert.strictEqual(cvd.warnings.length, 0, '[cell=5, scenario=cvd-correct-near-zero-chroma] near-zero correction clears all CVD types');
      assert.strictEqual((cvd.corrections ?? []).length, 1, '[cell=5, scenario=cvd-correct-near-zero-chroma] correction recorded');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': [{ 'c': 0.00000001, 'h': 123, 'l': 0.5 }, { 'c': 0.00000001, 'h': 300, 'l': 0.65 }],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_ACHROMATIC_CORRECTION_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'near-zero-chroma foreground is corrected without a multiplicative-search stall'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-extremum] no throw');
      assert.ok(output !== undefined, '[cell=5, scenario=cvd-correct-extremum] output present');
      const foreground = output.state.roles.text;
      assert.ok(foreground !== undefined, '[cell=5, scenario=cvd-correct-extremum] foreground present');
      assert.notStrictEqual(foreground.hex, '#000000', '[cell=5, scenario=cvd-correct-extremum] #270407 does not collapse to black');
      assert.notStrictEqual(foreground.hex, '#ffffff', '[cell=5, scenario=cvd-correct-extremum] #270407 does not collapse to white');
      assert.ok(foreground.oklch.l > 0 && foreground.oklch.l < 1, '[cell=5, scenario=cvd-correct-extremum] correction remains inside the lightness boundaries');
      const cvd = getContrastMetadata(output.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-extremum] cvd metadata present');
      assert.strictEqual(cvd.warnings.length, 0, '[cell=5, scenario=cvd-correct-extremum] #270407/#565684 clears all CVD types');
      assert.strictEqual((cvd.corrections ?? []).length, 1, '[cell=5, scenario=cvd-correct-extremum] correction recorded');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#270407', '#565684'],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_EXTREMUM_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'peer #270407/#565684 repro selects a valid non-extreme correction'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-no-regress] no throw');
      const cvd = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-no-regress] cvd slot written');
      assert.strictEqual(
        cvd.warnings.length, 0,
        `[cell=5, scenario=cvd-correct-no-regress] black-on-white must still produce 0 warnings under cvdCorrect; got ${cvd.warnings.length}`
      );
      assert.ok(
        (cvd.corrections ?? []).length === 0,
        '[cell=5, scenario=cvd-correct-no-regress] no corrections recorded — nothing needed fixing'
      );
      const textHex = output!.state.roles.text?.hex;
      assert.strictEqual(
        textHex, '#000000',
        '[cell=5, scenario=cvd-correct-no-regress] text role untouched — no correction was applied'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_BLACK_WHITE_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'happy',
    'name': 'cvdCorrect=true does not regress an already-passing pair'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-partial] no throw');
      const cvd = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-partial] cvd slot written');
      const correction = (cvd.corrections ?? []).find((entry) => { return entry.foreground === 'text'; });
      assert.ok(correction !== undefined, '[cell=5, scenario=cvd-correct-partial] improving partial correction is recorded');
      const warningTypeSet = new Set(cvd.warnings.map((warning) => { const result = warning.cvdType; return result; }));
      assert.ok(warningTypeSet.size > 0, '[cell=5, scenario=cvd-correct-partial] partial report contains unresolved CVD types');
      assert.ok(warningTypeSet.has('protanopia'), '[cell=5, scenario=cvd-correct-partial] exact unresolved protanopia failure is reported');
      assert.deepStrictEqual(new Set(correction.cvdTypesRemaining), warningTypeSet, '[cell=5, scenario=cvd-correct-partial] remaining types exactly match terminal warnings');
      assert.deepStrictEqual(new Set(correction.cvdTypesFixed), new Set(['achromatopsia', 'deuteranopia']), '[cell=5, scenario=cvd-correct-partial] fixed-type report is nonempty and exact');
      assert.strictEqual(output!.state.roles.text?.hex, '#70adfd', '[cell=5, scenario=cvd-correct-partial] closest fewer-failure candidate is selected');
      assert.notStrictEqual(output!.state.roles.text?.hex, '#ffffff', '[cell=5, scenario=cvd-correct-partial] partial correction avoids white collapse');
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': [
          { 'c': 0.1514103825194761, 'h': 255.34034740179777, 'l': 0.6787660075817258 },
          { 'c': 0.2611666344795376, 'h': 45.69293302483857, 'l': 0.441858619148843 }
        ],
        'contrast': { 'algorithm': undefined, 'cvdCorrect': true, 'extra': undefined, 'level': undefined },
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': CVD_PARTIAL_CORRECTION_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'cvdCorrect=true reports a genuinely nonempty unresolved CVD set'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-correct-gated-off] no throw');
      const textHex = output!.state.roles.text?.hex;

      // Baseline: resolve:roles alone, with no enforce task in the pipeline —
      // proves enforce:cvdSimulate wrote nothing to roles when cvdCorrect is unset.
      const baselineEngine = ContrastTestEngine.create();
      baselineEngine.pipeline(['intake:hex', 'resolve:roles']);
      const baselineState = baselineEngine.run({
        'bypass': undefined,
        'colors': ['#d00000', '#008000'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      });
      assert.strictEqual(
        textHex, baselineState.roles.text?.hex,
        '[cell=5, scenario=cvd-correct-gated-off] roles NOT mutated when cvdCorrect is unset'
      );

      const cvd = getContrastMetadata(output!.state.metadata, 'contrast:cvd');
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-correct-gated-off] cvd slot written');
      assert.ok(
        cvd.warnings.some((w) => {return w.cvdType === 'deuteranopia';}),
        '[cell=5, scenario=cvd-correct-gated-off] deuteranopia warning still fires without correction'
      );
      assert.strictEqual(
        cvd.corrections, undefined,
        '[cell=5, scenario=cvd-correct-gated-off] corrections key absent when cvdCorrect is unset'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#d00000', '#008000'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  CVD_RED_GREEN_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']
    },
    'kind': 'edge',
    'name': 'simulate-only mode (cvdCorrect unset) leaves the same deliberately-bad pair untouched'
  }
];

await new ScenarioRunner<CvdInputInterface, CvdOutputInterface>(
  'ContrastPlugin :: cell-5 :: enforce:cvdSimulate',
  (input) => {
    const engine = ContrastTestEngine.create();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    return { 'state': state };
  }
).run(cvdScenarios);

await test('enforce:cvdSimulate validates and stores the exact emitted hex colors', () => {
  const originalRoles = {
    'background': colorRecordFactory.fromOklch(
      0.26959387329407036,
      0.31296409130096436,
      348.3163001295179
    ),
    'text': colorRecordFactory.fromOklch(
      0.32885180693119764,
      0.09280003987252712,
      249.64939070865512
    )
  };
  assert.strictEqual(originalRoles.text.hex, '#0b375d', '[cvd-emitted-hex] exact foreground repro');
  assert.strictEqual(originalRoles.background.hex, '#46092e', '[cvd-emitted-hex] exact background repro');

  const pairs: NonNullable<RoleSchemaInterfaceType['contrastPairs']> = [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1 }
  ];
  const correctedState = CvdTaskProbe.run(originalRoles, pairs, true);
  const correctedForeground = correctedState.roles.text;
  const terminalBackground = correctedState.roles.background;
  const correctedCvd = getContrastMetadata(correctedState.metadata, 'contrast:cvd');
  assert.ok(correctedForeground !== undefined && terminalBackground !== undefined, '[cvd-emitted-hex] terminal roles present');
  assert.ok(correctedCvd !== undefined, '[cvd-emitted-hex] correction metadata present');
  assert.strictEqual(correctedCvd.warnings.length, 0, '[cvd-emitted-hex] correction reports no terminal failures');
  assert.strictEqual((correctedCvd.corrections ?? []).length, 1, '[cvd-emitted-hex] correction recorded');

  const emittedForeground = colorRecordFactory.fromHex(correctedForeground.hex);
  const emittedBackground = colorRecordFactory.fromHex(terminalBackground.hex);
  assert.deepStrictEqual(correctedForeground.rgb, emittedForeground.rgb, '[cvd-emitted-hex] stored RGB exactly matches emitted foreground hex');

  const emittedState = CvdTaskProbe.run({
    'background': emittedBackground,
    'text': emittedForeground
  }, pairs, false);
  const emittedCvd = getContrastMetadata(emittedState.metadata, 'contrast:cvd');
  assert.ok(emittedCvd !== undefined, '[cvd-emitted-hex] reparsed advisory metadata present');
  assert.strictEqual(emittedCvd.warnings.length, 0, '[cvd-emitted-hex] emitted and reparsed pair remains terminal-safe');
});

await test('enforce:cvdSimulate resolves dependency chains against terminal backgrounds', () => {
  const originalRoles = {
    'A': colorRecordFactory.fromOklch(0.18034453747794033, 0.18045909696491436, 161.84522487223148),
    'B': colorRecordFactory.fromOklch(0.7984681497793644, 0.12265136721078307, 289.4738715235144),
    'C': colorRecordFactory.fromOklch(0.8756250120326876, 0.1959079781617038, 232.3679086379707),
    'D': colorRecordFactory.fromHex('#d00000'),
    'E': colorRecordFactory.fromHex('#008000')
  };
  const state = CvdTaskProbe.run(originalRoles, [
    { 'algorithm': 'wcag21', 'background': 'B', 'foreground': 'A', 'minRatio': 1 },
    { 'algorithm': 'wcag21', 'background': 'C', 'foreground': 'B', 'minRatio': 1 },
    { 'algorithm': 'wcag21', 'background': 'E', 'foreground': 'D', 'minRatio': 1 }
  ], true);
  const foreground = state.roles.A;
  const terminalBackground = state.roles.B;
  assert.ok(foreground !== undefined && terminalBackground !== undefined, '[cvd-dependency-rollback] terminal roles present');
  assert.ok(
    contrastWcag21.apply(foreground, terminalBackground) + 1e-12
      >= contrastWcag21.apply(originalRoles.A, originalRoles.B),
    '[cvd-dependency-rollback] A→B preserves its original baseline against terminal B'
  );
  assert.strictEqual(foreground.hex, '#03160d', '[cvd-dependency-rollback] graph audit restores A when the downstream correction invalidates its baseline');
  assert.strictEqual(terminalBackground.hex, '#bbb2fe', '[cvd-dependency-rollback] graph audit restores dependent B atomically');
  assert.notStrictEqual(state.roles.D?.hex, originalRoles.D.hex, '[cvd-dependency-rollback] graph-local rollback preserves an independent valid correction');
  const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
  assert.ok(cvd !== undefined && cvd.warnings.length > 0, '[cvd-dependency-rollback] restored unresolved B→C failures remain truthful');
});

await test('enforce:cvdSimulate finds a jointly valid dependency-chain correction', () => {
  const originalRoles = {
    'A': colorRecordFactory.fromOklch(0.8063462371006608, 0.2377493067085743, 107.108104666695),
    'B': colorRecordFactory.fromOklch(0.8175662238150835, 0.2222650540433824, 338.6068118736148),
    'C': colorRecordFactory.fromOklch(0.8744853308424354, 0.24525246489793062, 218.68581217713654)
  };
  const state = CvdTaskProbe.run(originalRoles, [
    { 'algorithm': 'wcag21', 'background': 'B', 'foreground': 'A', 'minRatio': 1 },
    { 'algorithm': 'wcag21', 'background': 'C', 'foreground': 'B', 'minRatio': 1 }
  ], true);
  const foregroundA = state.roles.A;
  const foregroundB = state.roles.B;
  const backgroundC = state.roles.C;
  assert.ok(foregroundA !== undefined && foregroundB !== undefined && backgroundC !== undefined, '[cvd-dependency-joint] terminal roles present');
  assert.notStrictEqual(foregroundA.hex, originalRoles.A.hex, '[cvd-dependency-joint] upstream A is solved against corrected terminal B');
  assert.notStrictEqual(foregroundB.hex, originalRoles.B.hex, '[cvd-dependency-joint] downstream B is corrected before A');
  assert.ok(
    contrastWcag21.apply(foregroundA, foregroundB) + 1e-12
      >= contrastWcag21.apply(originalRoles.A, originalRoles.B),
    '[cvd-dependency-joint] terminal A→B contrast preserves its original baseline'
  );
  assert.ok(
    contrastWcag21.apply(foregroundB, backgroundC) + 1e-12
      >= contrastWcag21.apply(originalRoles.B, originalRoles.C),
    '[cvd-dependency-joint] terminal B→C contrast preserves its original baseline'
  );
  const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
  assert.ok(cvd !== undefined, '[cvd-dependency-joint] metadata present');
  assert.strictEqual(cvd.warnings.length, 0, '[cvd-dependency-joint] both terminal pairs clear all four CVD simulations');
});

await test('enforce:cvdSimulate never swaps original pair failures for new CVD types', () => {
  const originalRoles = {
    'A': colorRecordFactory.fromOklch(0.6819713479839266, 0.1302844616235234, 78.28219106420875),
    'B': colorRecordFactory.fromOklch(0.1058935693046078, 0.13603481529280542, 240.2218773867935),
    'C': colorRecordFactory.fromOklch(0.4619867202918976, 0.31928108286811036, 233.57296999543905)
  };
  const pairs: NonNullable<RoleSchemaInterfaceType['contrastPairs']> = [
    { 'algorithm': 'wcag21', 'background': 'B', 'foreground': 'A', 'minRatio': 1 },
    { 'algorithm': 'wcag21', 'background': 'C', 'foreground': 'B', 'minRatio': 1 }
  ];
  const originalState = CvdTaskProbe.run(originalRoles, pairs, false);
  const terminalState = CvdTaskProbe.run(originalRoles, pairs, true);
  const originalCvd = getContrastMetadata(originalState.metadata, 'contrast:cvd');
  const terminalCvd = getContrastMetadata(terminalState.metadata, 'contrast:cvd');
  assert.ok(originalCvd !== undefined && terminalCvd !== undefined, '[cvd-dependency-failure-set] metadata present');

  const originalTypes = new Set<string>();
  const originalWarningCount = originalCvd.warnings.length;
  for (let warningIndex = 0; warningIndex < originalWarningCount; warningIndex++) {
    const warning = originalCvd.warnings.at(warningIndex);
    if (warning?.foreground === 'A' && warning.background === 'B') {
      originalTypes.add(warning.cvdType);
    }
  }
  const terminalTypes = new Set<string>();
  const terminalWarningCount = terminalCvd.warnings.length;
  for (let warningIndex = 0; warningIndex < terminalWarningCount; warningIndex++) {
    const warning = terminalCvd.warnings.at(warningIndex);
    if (warning?.foreground === 'A' && warning.background === 'B') {
      terminalTypes.add(warning.cvdType);
    }
  }

  assert.deepStrictEqual(originalTypes, new Set(['protanopia']), '[cvd-dependency-failure-set] exact original A→B failure reproduced');
  for (const terminalType of terminalTypes) {
    assert.ok(originalTypes.has(terminalType), `[cvd-dependency-failure-set] terminal ${terminalType} belongs to the original A→B failure set`);
  }
  assert.ok(!terminalTypes.has('deuteranopia'), '[cvd-dependency-failure-set] terminal A→B does not gain deuteranopia');
  assert.ok(!terminalTypes.has('tritanopia'), '[cvd-dependency-failure-set] terminal A→B does not gain tritanopia');
  const terminalA = terminalState.roles.A;
  const terminalB = terminalState.roles.B;
  assert.ok(terminalA !== undefined && terminalB !== undefined, '[cvd-dependency-failure-set] terminal dependency roles present');
  const emittedOriginalA = colorRecordFactory.fromHex(originalRoles.A.hex);
  const emittedOriginalB = colorRecordFactory.fromHex(originalRoles.B.hex);
  assert.ok(
    contrastWcag21.apply(terminalA, terminalB) + 1e-12 >= contrastWcag21.apply(emittedOriginalA, emittedOriginalB),
    '[cvd-dependency-failure-set] terminal A→B preserves its emitted trichromat baseline'
  );
  const correction = (terminalCvd.corrections ?? []).find((entry) => {
    return entry.foreground === 'A' && entry.background === 'B';
  });
  if (terminalA.hex !== emittedOriginalA.hex) {
    assert.ok(correction !== undefined, '[cvd-dependency-failure-set] accepted A→B correction has metadata');
  }
  for (const fixedType of correction?.cvdTypesFixed ?? []) {
    assert.ok(originalTypes.has(fixedType), `[cvd-dependency-failure-set] fixed ${fixedType} belongs to the original A→B failure set`);
  }
});

await test('enforce:cvdSimulate records only pairs with an actually fixed CVD type', () => {
  const state = CvdTaskProbe.run({
    'bad': colorRecordFactory.fromHex('#03060b'),
    'clean': colorRecordFactory.fromHex('#333333'),
    'text': colorRecordFactory.fromHex('#18a6b5')
  }, [
    { 'algorithm': 'wcag21', 'background': 'bad', 'foreground': 'text', 'minRatio': 1 },
    { 'algorithm': 'wcag21', 'background': 'clean', 'foreground': 'text', 'minRatio': 1 }
  ], true);
  const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
  assert.ok(cvd !== undefined, '[cvd-correction-metadata] metadata present');
  assert.strictEqual(cvd.warnings.length, 0, '[cvd-correction-metadata] terminal shared-foreground pairs are clear');
  assert.strictEqual((cvd.corrections ?? []).length, 1, '[cvd-correction-metadata] the already-clean pair does not receive an empty correction record');
  assert.strictEqual(cvd.corrections?.at(0)?.background, 'bad', '[cvd-correction-metadata] only the failing pair is recorded');
  assert.deepStrictEqual(
    cvd.corrections?.at(0)?.cvdTypesFixed,
    ['protanopia'],
    '[cvd-correction-metadata] the emitted pair records its exact fixed type'
  );
});

await test('enforce:cvdSimulate resolves cyclic role constraints deterministically', () => {
  const originalRoles = {
    'A': colorRecordFactory.fromHex('#d00000'),
    'B': colorRecordFactory.fromHex('#008000')
  };
  const pairs: NonNullable<RoleSchemaInterfaceType['contrastPairs']> = [
    { 'algorithm': 'wcag21', 'background': 'B', 'foreground': 'A', 'minRatio': 1 },
    { 'algorithm': 'wcag21', 'background': 'A', 'foreground': 'B', 'minRatio': 1 }
  ];
  const first = CvdTaskProbe.run(originalRoles, pairs, true);
  const second = CvdTaskProbe.run(originalRoles, pairs, true);
  assert.strictEqual(first.roles.A?.hex, second.roles.A?.hex, '[cvd-cycle] repeated runs select the same A');
  assert.strictEqual(first.roles.B?.hex, second.roles.B?.hex, '[cvd-cycle] repeated runs select the same B');
  const terminalA = first.roles.A;
  const terminalB = first.roles.B;
  assert.ok(terminalA !== undefined && terminalB !== undefined, '[cvd-cycle] terminal roles present');
  assert.ok(
    contrastWcag21.apply(terminalA, terminalB) + 1e-12
      >= contrastWcag21.apply(originalRoles.A, originalRoles.B),
    '[cvd-cycle] bounded SCC result preserves the original shared baseline'
  );
  assert.strictEqual(terminalA.hex, originalRoles.A.hex, '[cvd-cycle] final audit restores A when the bounded cycle has no joint improvement');
  assert.strictEqual(terminalB.hex, originalRoles.B.hex, '[cvd-cycle] final audit restores B when the bounded cycle has no joint improvement');
  const cvd = getContrastMetadata(first.metadata, 'contrast:cvd');
  assert.ok(cvd !== undefined, '[cvd-cycle] metadata present');
  assert.strictEqual(cvd.warnings.length, 8, '[cvd-cycle] terminal audit reports all unresolved pair/type combinations');
  assert.strictEqual((cvd.corrections ?? []).length, 0, '[cvd-cycle] rolled-back cycle does not report phantom corrections');
});

await test('enforce:cvdSimulate advisory mode does not claim correction failure', () => {
  const logger = new RecordingLogger();
  CvdTaskProbe.run({
    'background': colorRecordFactory.fromHex('#008000'),
    'text': colorRecordFactory.fromHex('#d00000')
  }, [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minRatio': 1 }
  ], false, logger);
  assert.ok(
    logger.warnings.includes('CVD advisory: pair fails perceptual-stability threshold'),
    '[cvd-advisory-log] advisory diagnostics remain present'
  );
  assert.ok(
    !logger.warnings.includes('CVD correction could not clear every failing type'),
    '[cvd-advisory-log] disabled correction cannot be reported as failed correction'
  );
});

await test('enforce:cvdSimulate keeps a realistic 32-pair correction budget', () => {
  const roles: Record<string, ColorRecordInterfaceType> = {
    'background': colorRecordFactory.fromHex('#008000')
  };
  const pairs: NonNullable<RoleSchemaInterfaceType['contrastPairs']>[number][] = [];
  for (let pairIndex = 0; pairIndex < 32; pairIndex++) {
    const foreground = `text${pairIndex}`;
    roles[foreground] = colorRecordFactory.fromHex('#d00000');
    pairs.push({ 'algorithm': 'wcag21', 'background': 'background', 'foreground': foreground, 'minRatio': 1 });
  }

  const startedAt = performance.now();
  const first = CvdTaskProbe.run(roles, pairs, true);
  const elapsedMs = performance.now() - startedAt;
  const second = CvdTaskProbe.run(roles, pairs, true);
  const firstCvd = getContrastMetadata(first.metadata, 'contrast:cvd');
  const secondCvd = getContrastMetadata(second.metadata, 'contrast:cvd');
  assert.ok(firstCvd !== undefined && secondCvd !== undefined, '[cvd-performance] metadata present in both runs');
  assert.strictEqual(firstCvd.warnings.length, 0, '[cvd-performance] all 32 terminal pairs clear every CVD type');
  assert.strictEqual((firstCvd.corrections ?? []).length, 32, '[cvd-performance] all 32 corrections are recorded');
  assert.strictEqual(secondCvd.warnings.length, 0, '[cvd-performance] repeated run remains clear');
  assert.strictEqual((secondCvd.corrections ?? []).length, 32, '[cvd-performance] repeated run records the same correction count');

  const firstSignature: string[] = [];
  const secondSignature: string[] = [];
  for (let pairIndex = 0; pairIndex < 32; pairIndex++) {
    const foreground = `text${pairIndex}`;
    const original = roles[foreground];
    const firstRole = first.roles[foreground];
    const secondRole = second.roles[foreground];
    assert.ok(original !== undefined && firstRole !== undefined && secondRole !== undefined, `[cvd-performance] ${foreground} present in every state`);
    assert.notStrictEqual(firstRole.hex, original.hex, `[cvd-performance] ${foreground} is actually corrected`);
    firstSignature.push(firstRole.hex);
    secondSignature.push(secondRole.hex);
  }
  assert.deepStrictEqual(secondSignature, firstSignature, '[cvd-performance] all 32 corrected role values are deterministic');
  // The 750 ms ceiling leaves CI headroom while catching an unbounded or
  // exhaustive candidate-search regression.
  assert.ok(elapsedMs <= 750, `[cvd-performance] 32 pairs completed in ${elapsedMs.toFixed(2)} ms (budget 750 ms)`);
});

// ---------------------------------------------------------------------------
// Cell 6 — enforce:contrast (core task)
//
// enforce:contrast (from @studnicky/iridis/tasks) applies per-pair minRatio
// enforcement via ensureContrast. It writes metadata.contrastReport. This
// cell tests the contrast plugin's integration with the core task via shared
// pipeline, verifying:
//   - adjusted=true when foreground is nudged
//   - adjusted=false when pair already passes
//   - algorithm field echoed from pair schema
//   - no contrastPairs → contrastReport absent (no-op)
// ---------------------------------------------------------------------------

interface EnforceContrastInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}
interface EnforceContrastOutputInterface {
  readonly 'state': PaletteStateInterface;
}

const enforceContrastScenarios: readonly ScenarioRunner.ScenarioInterface<EnforceContrastInputInterface, EnforceContrastOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-adjusted] no throw');
      const report = ContrastReportShape.read(output!.state);
      assert.ok(report !== undefined,           '[cell=6, scenario=ec-adjusted] contrastReport written');
      assert.strictEqual(report.length, 1,       '[cell=6, scenario=ec-adjusted] one pair processed');
      const entry = report.at(0)!;
      assert.strictEqual(entry.foreground, 'text',       '[cell=6, scenario=ec-adjusted] foreground name');
      assert.strictEqual(entry.background, 'background', '[cell=6, scenario=ec-adjusted] background name');
      assert.strictEqual(entry.algorithm,  'wcag21',     '[cell=6, scenario=ec-adjusted] algorithm=wcag21');
      assert.strictEqual(entry.minRatio,   4.5,          '[cell=6, scenario=ec-adjusted] minRatio from schema');
      assert.strictEqual(entry.adjusted,   true,         '[cell=6, scenario=ec-adjusted] adjusted=true for failing pair');
      assert.strictEqual(entry.passed,     true,         '[cell=6, scenario=ec-adjusted] passed=true after adjustment');
      assert.ok(entry.ratio >= 4.5,
        `[cell=6, scenario=ec-adjusted] ratio ${entry.ratio} >= 4.5 after enforce`);
      // Text role hex must differ from original seed after adjustment (foreground darkened).
      const textHex = output!.state.roles.text?.hex;
      assert.ok(textHex !== undefined, '[cell=6, scenario=ec-adjusted] text role present');
      const bgHex = output!.state.roles.background?.hex;
      assert.strictEqual(
        bgHex?.toLowerCase(), '#ffffff',
        '[cell=6, scenario=ec-adjusted] background role unchanged (only fg adjusted)'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        // #aaaaaa (L≈0.70) falls in text range [0.40, 0.90] and yields ≈2.3:1 on
        // white — well below 4.5:1, triggering the adjusted=true enforcement branch.
        'colors': ['#aaaaaa', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  ENFORCE_CONTRAST_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:contrast']
    },
    'kind': 'happy',
    'name': 'failing pair triggers adjusted=true and rewrites the foreground role'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-passing] no throw');
      const report = ContrastReportShape.read(output!.state);
      const entry = report?.at(0)!;
      assert.ok(entry !== undefined,            '[cell=6, scenario=ec-passing] pair present');
      assert.strictEqual(entry.adjusted, false, '[cell=6, scenario=ec-passing] adjusted=false when already passing');
      assert.strictEqual(entry.passed,   true,  '[cell=6, scenario=ec-passing] passed=true');
      assert.ok(entry.ratio >= 4.5,
        `[cell=6, scenario=ec-passing] ratio ${entry.ratio} >= 4.5`);
    },
    'input': {
      'input': {
        'bypass': undefined,
        // #494949 (L≈0.41) maps to text range [0.40, 0.90] and yields ≈9:1 on
        // white — already above 4.5:1, so no adjustment is applied.
        'colors': ['#494949', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  ENFORCE_CONTRAST_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:contrast']
    },
    'kind': 'happy',
    'name': 'passing pair: adjusted=false, ratio preserved'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-no-pairs] no throw');
      const report = ContrastReportShape.read(output!.state);
      assert.ok(
        report === undefined || report.length === 0,
        '[cell=6, scenario=ec-no-pairs] contrastReport absent or empty when no pairs'
      );
    },
    'input': {
      'input': {
        'bypass': undefined,
        'colors': ['#000000', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles': {
          'contrastPairs': undefined,
          'description': undefined,
          'name':  'no-pairs',
          'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true }]
        },
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:contrast']
    },
    'kind': 'edge',
    'name': 'no contrastPairs in schema: contrastReport not written'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-boundary] no throw');
      const report = ContrastReportShape.read(output!.state);
      const entry = report?.at(0)!;
      assert.ok(entry !== undefined, '[cell=6, scenario=ec-boundary] pair present');
      assert.ok(entry.ratio >= 4.5,
        `[cell=6, scenario=ec-boundary] ratio ${entry.ratio} >= 4.5 at boundary`);
      assert.strictEqual(entry.passed, true, '[cell=6, scenario=ec-boundary] passed=true');
    },
    'input': {
      'input': {
        'bypass': undefined,
        // #767676 on white ≈ 4.54:1 — just above the 4.5 boundary.
        // Lightness bands: gray (L≈0.48) maps to text [0.00, 0.50]; white to background.
        'colors': ['#767676', '#ffffff'],
        'contrast': undefined,
        'emit': undefined,
        'maxColors': undefined,
        'metadata': undefined,
        'roles':  ENFORCE_CONTRAST_ROLES,
        'runtime': undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'enforce:contrast']
    },
    'kind': 'edge',
    'name': 'dark-gray on white: ratio near 4.5:1 boundary passes'
  }
];

await new ScenarioRunner<EnforceContrastInputInterface, EnforceContrastOutputInterface>(
  'ContrastPlugin :: cell-6 :: enforce:contrast',
  (input) => {
    const engine = ContrastTestEngine.create();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    return { 'state': state };
  }
).run(enforceContrastScenarios);
