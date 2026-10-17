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
  ColorHintsInterfaceTypeEntity,
  ColorRecordInterfaceTypeEntity
} from '@studnicky/iridis';

import { colorRecordFactory, ContrastPairInterfaceTypeEntity, InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TextForegroundIntent } from '../../src/data/TextForegroundIntent.ts';
import { wcagRequiredRatio } from '../../src/data/wcagRequiredRatio.ts';
import { ContrastMetadataAssertionPort } from './contrast-plugin/ContrastMetadataAssertionPort.ts';
import { PluginShapeScenarioSuite } from './contrast-plugin/PluginShapeScenarioSuite.ts';
import { ApcaScenarioSuite } from './fixtures/ApcaScenarioSuite.ts';
import { CvdProbeScenarioSuite } from './fixtures/cvd/CvdProbeScenarioSuite.ts';
import { CvdScenarioSuite } from './fixtures/CvdScenarioSuite.ts';
import { EnforceContrastScenarioSuite } from './fixtures/EnforceContrastScenarioSuite.ts';
import { WcagAaaScenarioSuite } from './fixtures/WcagAaaScenarioSuite.ts';
import { WcagAaScenarioSuite } from './fixtures/WcagAaScenarioSuite.ts';

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
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(contrastPlugin);
    return engine;
  }
}

/** Direct records for inferred WCAG targets when a pair does not set minimumContrastRatio. */
class WcagIntentRoleFixture {
  static readonly configuredPair = ContrastPairInterfaceTypeEntity.intake({
    'algorithm': 'wcag21',
    'background': 'background',
    'foreground': 'foreground',
    'minimumContrastRatio': 5.5
  });

  static readonly inferredPair = ContrastPairInterfaceTypeEntity.intake({
    'algorithm': 'wcag21',
    'background': 'background',
    'foreground': 'foreground'
  });

  static readonly genericCases = Object.freeze([
    WcagIntentRoleFixture.roleCase('accent', { 'intent': 'accent', 'role': 'foreground' }, { 'intent': 'background', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('background', { 'intent': 'background', 'role': 'foreground' }, { 'intent': 'background', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('button', { 'intent': 'button', 'role': 'foreground' }, { 'intent': 'background', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('critical', { 'intent': 'critical', 'role': 'foreground' }, { 'intent': 'background', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('positive', { 'intent': 'positive', 'role': 'foreground' }, { 'intent': 'background', 'role': 'background' })
  ]);

  static readonly genericFallback = WcagIntentRoleFixture.roles({
    'background': { 'intent': 'accent', 'role': 'background' },
    'foreground': { 'role': 'foreground' }
  });

  static readonly semanticCases = Object.freeze([
    WcagIntentRoleFixture.roleCase('link', { 'intent': 'link', 'role': 'foreground' }, { 'intent': 'accent', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('muted', { 'intent': 'muted', 'role': 'foreground' }, { 'intent': 'accent', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('onAccent', { 'intent': 'onAccent', 'role': 'foreground' }, { 'intent': 'accent', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('onButton', { 'intent': 'onButton', 'role': 'foreground' }, { 'intent': 'accent', 'role': 'background' }),
    WcagIntentRoleFixture.roleCase('text', { 'intent': 'text', 'role': 'foreground' }, { 'intent': 'accent', 'role': 'background' })
  ]);

  private static roleCase(label: string, foreground: ColorHintsInterfaceTypeEntity.Type, background: ColorHintsInterfaceTypeEntity.Type): { readonly 'label': string; readonly 'roles': Record<string, ColorRecordInterfaceTypeEntity.Type>; } {
    const roles = WcagIntentRoleFixture.roles({ 'background': background, 'foreground': foreground });
    const result = { 'label': label, 'roles': roles };
    return result;
  }

  private static roles(hints: { readonly 'background': ColorHintsInterfaceTypeEntity.Type; readonly 'foreground': ColorHintsInterfaceTypeEntity.Type; }): Record<string, ColorRecordInterfaceTypeEntity.Type> {
    const result = {
      'background': colorRecordFactory.fromHex('#ffffff', { 'hints': hints.background }),
      'foreground': colorRecordFactory.fromHex('#000000', { 'hints': hints.foreground })
    };
    return result;
  }
}

await test('wcagRequiredRatio recognizes every semantic foreground and preserves generic fallbacks', () => {
  for (let index = 0; index < WcagIntentRoleFixture.semanticCases.length; index += 1) {
    const roleCase = WcagIntentRoleFixture.semanticCases.at(index);
    if (roleCase !== undefined) {
      assert.equal(wcagRequiredRatio.forAa(WcagIntentRoleFixture.inferredPair, roleCase.roles), 4.5, `${roleCase.label} AA`);
      assert.equal(wcagRequiredRatio.forAaa(WcagIntentRoleFixture.inferredPair, roleCase.roles), 7, `${roleCase.label} AAA`);
      assert.equal(wcagRequiredRatio.forAa(WcagIntentRoleFixture.configuredPair, roleCase.roles), 5.5, `${roleCase.label} configured`);
    }
  }
  for (let index = 0; index < WcagIntentRoleFixture.genericCases.length; index += 1) {
    const roleCase = WcagIntentRoleFixture.genericCases.at(index);
    if (roleCase !== undefined) {
      assert.equal(wcagRequiredRatio.forAa(WcagIntentRoleFixture.inferredPair, roleCase.roles), 3, `${roleCase.label} generic AA`);
      assert.equal(wcagRequiredRatio.forAaa(WcagIntentRoleFixture.inferredPair, roleCase.roles), 4.5, `${roleCase.label} generic AAA`);
      assert.equal(wcagRequiredRatio.forAa(WcagIntentRoleFixture.configuredPair, roleCase.roles), 5.5, `${roleCase.label} configured`);
    }
  }
  assert.equal(wcagRequiredRatio.forAa(WcagIntentRoleFixture.inferredPair, WcagIntentRoleFixture.genericFallback), 3, 'generic AA');
  assert.equal(wcagRequiredRatio.forAaa(WcagIntentRoleFixture.inferredPair, WcagIntentRoleFixture.genericFallback), 4.5, 'generic AAA');
});

await test('TextForegroundIntent exhaustively classifies the canonical ColorIntent contract', () => {
  const actual: Readonly<Record<NonNullable<ColorHintsInterfaceTypeEntity.Type['intent']>, boolean>> = {
    'accent':     TextForegroundIntent.matches({ 'intent': 'accent' }),
    'background': TextForegroundIntent.matches({ 'intent': 'background' }),
    'button':     TextForegroundIntent.matches({ 'intent': 'button' }),
    'critical':   TextForegroundIntent.matches({ 'intent': 'critical' }),
    'link':       TextForegroundIntent.matches({ 'intent': 'link' }),
    'muted':      TextForegroundIntent.matches({ 'intent': 'muted' }),
    'onAccent':   TextForegroundIntent.matches({ 'intent': 'onAccent' }),
    'onButton':   TextForegroundIntent.matches({ 'intent': 'onButton' }),
    'positive':   TextForegroundIntent.matches({ 'intent': 'positive' }),
    'text':       TextForegroundIntent.matches({ 'intent': 'text' })
  };
  const expected: Readonly<Record<NonNullable<ColorHintsInterfaceTypeEntity.Type['intent']>, boolean>> = {
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

/** Role-schema fixtures for APCA semantic target selection. */
class ApcaRoleFixture {
  private static readonly linkRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'apca-link',
    'roles': [
      { 'chromaRange': [0, 0.05], 'intent': 'link', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
    ]
  });

  private static readonly mutedRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'apca-muted',
    'roles': [
      { 'chromaRange': [0, 0.05], 'intent': 'muted', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
    ]
  });

  private static readonly onAccentRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'apca-on-accent',
    'roles': [
      { 'chromaRange': [0, 0.05], 'intent': 'onAccent', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
    ]
  });

  private static readonly onButtonRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'apca-on-button',
    'roles': [
      { 'chromaRange': [0, 0.05], 'intent': 'onButton', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
    ]
  });

  private static readonly textRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'apca-text',
    'roles': [
      { 'chromaRange': [0, 0.05], 'intent': 'text', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
    ]
  });

  static readonly semanticCases = Object.freeze([
    { 'label': 'link', 'roles': ApcaRoleFixture.linkRoles },
    { 'label': 'muted', 'roles': ApcaRoleFixture.mutedRoles },
    { 'label': 'onAccent', 'roles': ApcaRoleFixture.onAccentRoles },
    { 'label': 'onButton', 'roles': ApcaRoleFixture.onButtonRoles },
    { 'label': 'text', 'roles': ApcaRoleFixture.textRoles }
  ]);
}

await test('every canonical foreground intent selects Lc 60 through the APCA engine task', () => {
  for (let index = 0; index < ApcaRoleFixture.semanticCases.length; index += 1) {
    const roleCase = ApcaRoleFixture.semanticCases.at(index);
    if (roleCase !== undefined) {
      const engine = ContrastTestEngine.create();
      engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:apca']);
      const state = engine.run(InputInterfaceTypeEntity.intake({
        'colors': ['#000000', '#ffffff'],
        'roles': roleCase.roles
      }));
      const pair = ContrastMetadataAssertionPort.apca(state)?.pairs.at(0);
      assert.ok(pair !== undefined, `${roleCase.label} APCA result present`);
      assert.equal(pair.requiredLc, 60, `${roleCase.label} APCA Lc`);
      assert.equal(pair.pass, true, `${roleCase.label} APCA pass`);
    }
  }
});

await test('link intent preserves a configured WCAG target through the AA and AAA engine tasks', () => {
  const engine = ContrastTestEngine.create();
  engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:wcagAA', 'enforce:wcagAAA']);
  const state = engine.run(InputInterfaceTypeEntity.intake({
    'colors': ['#777777', '#ffffff'],
    'roles': {
      'contrastPairs': [
        { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'link', 'minimumContrastRatio': 5.5 }
      ],
      'name': 'wcag-link-intent',
      'roles': [
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'link', 'lightnessRange': [0.00, 0.70], 'name': 'link', 'required': true },
        { 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.85, 1.00], 'name': 'background', 'required': true }
      ]
    }
  }));
  const aaPair = ContrastMetadataAssertionPort.aa(state)?.pairs.at(0);
  const aaaPair = ContrastMetadataAssertionPort.aaa(state)?.pairs.at(0);
  assert.ok(aaPair !== undefined && aaaPair !== undefined, 'link WCAG results present');
  assert.equal(aaPair.required, 5.5, 'link configured AA target');
  assert.equal(aaaPair.required, 5.5, 'link configured AAA target');
  assert.equal(aaPair.pass, true, 'link AA pass');
  assert.equal(aaaPair.pass, true, 'link AAA pass');
});

await PluginShapeScenarioSuite.run();
await WcagAaScenarioSuite.run();
await WcagAaaScenarioSuite.run();
await ApcaScenarioSuite.run();
await CvdScenarioSuite.run();
await CvdProbeScenarioSuite.run();
await EnforceContrastScenarioSuite.run();
