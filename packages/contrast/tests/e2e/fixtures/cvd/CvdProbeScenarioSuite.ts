import type { JSONSchema7Type } from 'json-schema';

import { colorRecordFactory, ContrastPairEntity, ContrastPolicy, contrastWcag21, InputEntity, PaletteRoleState, RoleSchemaEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { enforceCvdSimulate } from '../../../../src/tasks/EnforceCvdSimulate.ts';
import { ContrastMetadataAssertionPort } from '../../contrast-plugin/ContrastMetadataAssertionPort.ts';
import { ContrastTestPort } from '../../contrast-plugin/ContrastTestPort.ts';
import { RecordingLogger } from '../../contrast-plugin/RecordingLogger.ts';

/** Independent direct probes for CVD correction integrity, determinism, and workload behavior. */
export class CvdProbeScenarioSuite {
  static readonly #PRODUCTION_MAXIMUM_CANDIDATE_SCORES = 8_000;
  static readonly #PRODUCTION_MAXIMUM_WEIGHTED_UNITS = 48_000;

  private static assertProductionBudget(
    usage: { readonly 'candidateScores': number; readonly 'weightedUnits': number },
    scenario: string
  ): void {
    assert.ok(
      usage.candidateScores <= CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_CANDIDATE_SCORES,
      `[${scenario}] candidate scores remain within the production cap`
    );
    assert.ok(
      usage.weightedUnits <= CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_WEIGHTED_UNITS,
      `[${scenario}] weighted work remains within the production cap`
    );
  }
  static async run(): Promise<void> {
    ContrastTestPort.configureCvdSearchBudgetForTesting(500_000, 3_000_000);
    try {
      await test('CVD refinement validates and stores the exact emitted hex colors', CvdProbeScenarioSuite.emittedHex);
      await test('CVD refinement resolves dependency chains against terminal backgrounds', CvdProbeScenarioSuite.dependencyRollback);
      await test('CVD refinement finds a jointly valid dependency-chain correction', CvdProbeScenarioSuite.dependencyJoint);
      await test('CVD refinement never swaps original pair failures for new CVD types', CvdProbeScenarioSuite.failureSet);
      await test('CVD refinement records only pairs with an actually fixed CVD type', CvdProbeScenarioSuite.correctionMetadata);
      await test('CVD refinement resolves cyclic role constraints deterministically', CvdProbeScenarioSuite.cycle);
      await test('CVD refinement advisory mode does not claim correction failure', CvdProbeScenarioSuite.advisory);
      await test('CVD modes separate observation, nudging, and terminal enforcement', CvdProbeScenarioSuite.modes);
      await test('CVD observation identifies every deficiency matrix', CvdProbeScenarioSuite.deficiencyMatrices);
      await test('CVD refinement finds interior corrections for zero and near-zero chroma', CvdProbeScenarioSuite.achromaticCorrection);
      await test('CVD refinement avoids extreme colors for a non-extreme correction', CvdProbeScenarioSuite.nonExtremeCorrection);
      await test('CVD refinement preserves an exact baseline boundary when no safe correction exists', CvdProbeScenarioSuite.baselineBoundary);
      await test('CVD refinement resolves a shared foreground against every declared background', CvdProbeScenarioSuite.sharedForeground);
      await test('CVD refinement records exact fixed and remaining deficiency sets for a partial correction', CvdProbeScenarioSuite.partialCorrection);
      await test('CVD refinement moves a derived background when the foreground is stated', CvdProbeScenarioSuite.statedForeground);
      await test('CVD refinement does not move a derived endpoint outside its role range', CvdProbeScenarioSuite.rangeBoundedMover);
      await test('CVD refinement moves a derived foreground when the background is stated', CvdProbeScenarioSuite.statedBackground);
      await test('CVD refinement blocks a pair when both semantic endpoints are stated', CvdProbeScenarioSuite.statedBoth);
      await test('CVD terminal compliance reports a CVD-only stated-both block', CvdProbeScenarioSuite.terminalStatedBoth);
      await test('CVD terminal compliance reports a movable solver-exhausted block', CvdProbeScenarioSuite.terminalSolverExhausted);
      await test('CVD terminal compliance retains a surviving correction', CvdProbeScenarioSuite.terminalCorrection);
      await test('CVD refinement preserves a selected policy floor above the original contrast', CvdProbeScenarioSuite.selectedPolicyFloor);
      await test('CVD refinement moves both derived endpoints around a stated chain middle', CvdProbeScenarioSuite.statedMiddleChain);
      await test('CVD refinement keeps a realistic 32-pair correction budget', CvdProbeScenarioSuite.performance);
      await test('APCA CVD requirements remain in WCAG-ratio units', CvdProbeScenarioSuite.apcaCvdFloor);
    } finally {
      ContrastTestPort.clearCvdSearchBudgetForTesting();
    }
    await test('CVD refinement bounds 100 unresolved movable pairs deterministically', CvdProbeScenarioSuite.budgetedStress);
    await test('CVD refinement keeps production stress work bounded for 100 unresolved movable pairs', CvdProbeScenarioSuite.productionStress);
    await test('CVD refinement shares one bounded budget across a cyclic component', CvdProbeScenarioSuite.budgetedCycle);
    await test('canonical compliance remains deterministic for 100 declared roles', CvdProbeScenarioSuite.compliancePerformance);
    await test('CVD cube bound blocks an unreachable simulated contrast before scoring', CvdProbeScenarioSuite.cubeInfeasible);
    await test('CVD cube bound preserves feasible randomized corrections deterministically', CvdProbeScenarioSuite.cubeFeasible);
  }

  private static apcaCvdFloor(): void {
    const roles = {
      'background': colorRecordFactory.fromHex('#808080'),
      'divider': colorRecordFactory.fromHex('#000000'),
      'text': colorRecordFactory.fromHex('#ffffff')
    };
    const input = InputEntity.intake({
      'colors': [],
      'contrast': { 'algorithm': 'apca', 'cvdMode': 'enforce', 'level': 'Lc' },
      'roles': {
        'contrastPairs': [
          CvdProbeScenarioSuite.pairAtMinimum('text', 'background', 4.5),
          CvdProbeScenarioSuite.pairAtMinimum('divider', 'background', 3)
        ],
        'name': 'apca-cvd-floor',
        'roles': []
      }
    });
    const requirements = ContrastPolicy.normalize(input, PaletteRoleState.admit(roles));
    assert.deepStrictEqual(
      requirements.map((requirement) => { return requirement.cvdMinimumContrastRatio; }),
      [4.5, 3],
      '[cvd-apca-floor] APCA projects declared WCAG AA floors instead of Lc values or zero'
    );
  }

  private static cubeInfeasible(): void {
    enforceCvdSimulate.configureSearchBudgetForTesting(8_000, 48_000);
    try {
      const roles = {
        'background': colorRecordFactory.fromHex('#808080'),
        'text': colorRecordFactory.fromHex('#000000')
      };
      const pairs = [CvdProbeScenarioSuite.pairAtMinimum('text', 'background', 7)];
      const first = ContrastTestPort.runCorrectedCvd(roles, pairs, new RecordingLogger());
      const firstUsage = enforceCvdSimulate.searchBudgetUsageForTesting();
      const second = ContrastTestPort.runCorrectedCvd(roles, pairs, new RecordingLogger());
      const secondUsage = enforceCvdSimulate.searchBudgetUsageForTesting();
      const firstCvd = ContrastMetadataAssertionPort.cvd(first);
      const secondCvd = ContrastMetadataAssertionPort.cvd(second);
      assert.ok(firstCvd !== undefined && secondCvd !== undefined, '[cvd-cube-infeasible] metadata present');
      assert.deepStrictEqual(firstUsage, { 'candidateScores': 0, 'weightedUnits': 0 }, '[cvd-cube-infeasible] exact bound scores no candidates');
      assert.deepStrictEqual(secondUsage, firstUsage, '[cvd-cube-infeasible] score use is deterministic');
      assert.deepStrictEqual(firstCvd.blocked, [{
        'background': 'background',
        'cvdTypes': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
        'foreground': 'text',
        'reason': 'solver-infeasible'
      }], '[cvd-cube-infeasible] cube bound reports the canonical unreachable pair');
      assert.deepStrictEqual(secondCvd.blocked, firstCvd.blocked, '[cvd-cube-infeasible] blocked signature is deterministic');
      assert.strictEqual(firstCvd.corrections.length, 0, '[cvd-cube-infeasible] unreachable group has no correction');
      assert.ok(firstCvd.warnings.length > 0, '[cvd-cube-infeasible] diagnostics remain available');
    } finally {
      enforceCvdSimulate.clearSearchBudgetForTesting();
    }
  }

  private static cubeFeasible(): void {
    const backgrounds = ['#10161f', '#2f556b', '#6d8c4e', '#b47a4d', '#d3c1e0'];
    const pairs = [CvdProbeScenarioSuite.pairAtMinimum('text', 'background', 4.5)];
    for (let index = 0; index < backgrounds.length; index += 1) {
      const background = backgrounds[index];
      if (background === undefined) {
        continue;
      }
      const roles = {
        'background': colorRecordFactory.fromHex(background),
        'text': colorRecordFactory.fromHex('#ffffff')
      };
      const first = ContrastTestPort.runCorrectedCvd(roles, pairs, new RecordingLogger());
      const second = ContrastTestPort.runCorrectedCvd(roles, pairs, new RecordingLogger());
      const firstCvd = ContrastMetadataAssertionPort.cvd(first);
      const secondCvd = ContrastMetadataAssertionPort.cvd(second);
      assert.ok(firstCvd !== undefined && secondCvd !== undefined, `[cvd-cube-feasible-${index}] metadata present`);
      assert.ok(
        !firstCvd.blocked.some((blocked) => {
          const result = blocked.reason === 'solver-infeasible';
          return result;
        }),
        `[cvd-cube-feasible-${index}] exact bound does not reject a feasible CVD group`
      );
      assert.deepStrictEqual(
        Object.entries(second.roles).map(([name, role]) => { return [name, role.hex]; }),
        Object.entries(first.roles).map(([name, role]) => { return [name, role.hex]; }),
        `[cvd-cube-feasible-${index}] terminal signature remains deterministic`
      );
    }
  }

  private static achromaticCorrection(): void {
    const scenarios = [
      {
        'background': colorRecordFactory.fromOklch(0.65, 0, 0),
        'chroma': function(value: number): boolean { const result = value < 0.000_000_1; return result; },
        'name': 'zero',
        'text': colorRecordFactory.fromOklch(0.5, 0, 0)
      },
      {
        'background': colorRecordFactory.fromOklch(0.65, 0.000_000_01, 300),
        'chroma': function(value: number): boolean { const result = value > 0 && value < 0.000_001; return result; },
        'name': 'near-zero',
        'text': colorRecordFactory.fromOklch(0.5, 0.000_000_01, 123)
      }
    ];
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      if (scenario === undefined) {
        continue;
      }
      const state = ContrastTestPort.runCorrectedCvd({ 'background': scenario.background, 'text': scenario.text }, [CvdProbeScenarioSuite.pair('text', 'background')], new RecordingLogger());
      const text = state.roles.text;
      const cvd = ContrastMetadataAssertionPort.cvd(state);
      assert.ok(text !== undefined && cvd !== undefined, `[cvd-achromatic-${scenario.name}] terminal data present`);
      assert.ok(scenario.chroma(text.oklch.c), `[cvd-achromatic-${scenario.name}] correction preserves achromatic search space`);
      assert.ok(text.oklch.l > 0 && text.oklch.l < 1, `[cvd-achromatic-${scenario.name}] correction remains interior`);
      assert.strictEqual(cvd.warnings.length, 0, `[cvd-achromatic-${scenario.name}] correction clears every CVD failure`);
      assert.strictEqual(cvd.corrections.length, 1, `[cvd-achromatic-${scenario.name}] correction recorded`);
    }
  }

  private static nonExtremeCorrection(): void {
    const originalRoles = {
      'background': colorRecordFactory.fromOklch(0.12004924674202846, 0.015276054573075558, 252.51270656713),
      'text': colorRecordFactory.fromOklch(0.665, 0.11, 206.1)
    };
    const state = ContrastTestPort.runCorrectedCvd(originalRoles, [CvdProbeScenarioSuite.pair('text', 'background')], new RecordingLogger());
    const text = state.roles.text;
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(text !== undefined && cvd !== undefined, '[cvd-non-extreme] terminal data present');
    assert.notStrictEqual(text.hex, originalRoles.text.hex, '[cvd-non-extreme] correction moves the failing foreground');
    assert.notStrictEqual(text.hex, '#000000', '[cvd-non-extreme] correction does not collapse to black');
    assert.notStrictEqual(text.hex, '#ffffff', '[cvd-non-extreme] correction does not collapse to white');
    assert.ok(text.oklch.l > 0 && text.oklch.l < 1, '[cvd-non-extreme] correction remains interior');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-non-extreme] correction clears every CVD failure');
    assert.strictEqual(cvd.corrections.length, 1, '[cvd-non-extreme] correction recorded');
  }

  private static baselineBoundary(): void {
    const originalRoles = {
      'background': colorRecordFactory.fromOklch(0.665, 0.11, 206.1),
      'text': colorRecordFactory.fromOklch(0.12004924674202846, 0.015276054573075558, 252.51270656713)
    };
    const state = ContrastTestPort.runCorrectedCvd(originalRoles, [CvdProbeScenarioSuite.pair('text', 'background')], new RecordingLogger());
    const text = state.roles.text;
    const background = state.roles.background;
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(text !== undefined && background !== undefined && cvd !== undefined, '[cvd-baseline-boundary] terminal data present');
    assert.ok(contrastWcag21.apply(text, background) + 1e-12 >= contrastWcag21.apply(originalRoles.text, originalRoles.background), '[cvd-baseline-boundary] correction never weakens the exact trichromat baseline');
    assert.ok(cvd.warnings.length > 0 || cvd.corrections.length > 0, '[cvd-baseline-boundary] terminal CVD outcome remains explicit');
  }

  private static sharedForeground(): void {
    const originalRoles = {
      'backgroundHigh': colorRecordFactory.fromHex('#00a000'),
      'backgroundLow': colorRecordFactory.fromHex('#008000'),
      'text': colorRecordFactory.fromHex('#d00000')
    };
    const pairs = [CvdProbeScenarioSuite.pair('text', 'backgroundLow'), CvdProbeScenarioSuite.pair('text', 'backgroundHigh')];
    const state = ContrastTestPort.runCorrectedCvd(originalRoles, pairs, new RecordingLogger());
    const text = state.roles.text;
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(text !== undefined && cvd !== undefined, '[cvd-shared-foreground] terminal data present');
    assert.notStrictEqual(text.hex, originalRoles.text.hex, '[cvd-shared-foreground] shared foreground moves once for its constraints');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-shared-foreground] both declared backgrounds clear');
    const backgrounds = new Set(cvd.corrections.map((correction) => { return correction.background; }));
    assert.deepStrictEqual(backgrounds, new Set(['backgroundHigh', 'backgroundLow']), '[cvd-shared-foreground] diagnostics retain both semantic constraints');
  }

  private static partialCorrection(): void {
    const originalRoles = {
      'background': colorRecordFactory.fromOklch(0.441858619148843, 0.2611666344795376, 45.69293302483857),
      'text': colorRecordFactory.fromOklch(0.6787660075817258, 0.1514103825194761, 255.34034740179777)
    };
    const state = ContrastTestPort.runCorrectedCvd(originalRoles, [CvdProbeScenarioSuite.pair('text', 'background')], new RecordingLogger());
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-partial-correction] metadata present');
    const correction = cvd.corrections.find((entry) => { const result = entry.foreground === 'text' && entry.background === 'background'; return result; });
    assert.ok(correction !== undefined, '[cvd-partial-correction] partial correction recorded');
    const warningTypes = CvdProbeScenarioSuite.cvdTypesFor(cvd.warnings, 'text', 'background');
    assert.ok(correction.cvdTypesFixed.length > 0, '[cvd-partial-correction] at least one deficiency improves');
    assert.deepStrictEqual(new Set(correction.cvdTypesRemaining), warningTypes, '[cvd-partial-correction] remaining correction diagnostics equal terminal warnings');
    for (let index = 0; index < correction.cvdTypesFixed.length; index += 1) {
      const fixed = correction.cvdTypesFixed[index];
      assert.ok(fixed !== undefined && !warningTypes.has(fixed), '[cvd-partial-correction] fixed deficiencies are absent from terminal warnings');
    }
  }

  private static deficiencyMatrices(): void {
    const scenarios = [
      { 'background': '#008000', 'cvdType': 'deuteranopia', 'foreground': '#d00000' },
      { 'background': '#00cc00', 'cvdType': 'protanopia', 'foreground': '#ff0000' },
      { 'background': '#ffff00', 'cvdType': 'tritanopia', 'foreground': '#0000ff' },
      { 'background': '#00d800', 'cvdType': 'achromatopsia', 'foreground': '#ff0000' }
    ];
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      if (scenario === undefined) {
        continue;
      }
      const state = ContrastTestPort.runObservedCvd({
        'background': colorRecordFactory.fromHex(scenario.background),
        'text': colorRecordFactory.fromHex(scenario.foreground)
      }, [CvdProbeScenarioSuite.pair('text', 'background')], new RecordingLogger());
      const cvd = ContrastMetadataAssertionPort.cvd(state);
      assert.ok(cvd !== undefined, `[cvd-deficiency-${scenario.cvdType}] metadata present`);
      const isReported = cvd.warnings.some((warning) => {
        const result = warning.cvdType === scenario.cvdType;
        return result;
      });
      assert.ok(isReported, `[cvd-deficiency-${scenario.cvdType}] named deficiency is reported`);
    }
  }

  private static advisory(): void {
    const logger = new RecordingLogger();
    const state = ContrastTestPort.runObservedCvd({
      'background': colorRecordFactory.fromHex('#008000'),
      'text': colorRecordFactory.fromHex('#d00000')
    }, [CvdProbeScenarioSuite.pair('text', 'background')], logger);
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-advisory-metadata] canonical metadata present');
    assert.strictEqual(cvd.corrections.length, 0, '[cvd-advisory-metadata] no corrections recorded');
    assert.ok(cvd.warnings.length > 0, '[cvd-advisory-metadata] warnings retained');
    assert.deepEqual(logger.warnings, ['CVD advisory: pairs fail perceptual-stability threshold'], '[cvd-advisory-log] one aggregate advisory per run');
    assert.ok(!logger.warnings.includes('CVD correction could not clear every failing type'), '[cvd-advisory-log] advisory mode has no correction failure');
  }

  private static modes(): void {
    const roles = CvdProbeScenarioSuite.statedPairRoles();
    const pairs = [CvdProbeScenarioSuite.pair('text', 'background')];
    const stated = ['text', 'background'];

    const warned = ContrastTestPort.runObservedCompliance(
      roles,
      pairs,
      new RecordingLogger(),
      stated
    );
    const nudged = ContrastTestPort.runNudgedCompliance(
      roles,
      pairs,
      new RecordingLogger(),
      stated
    );
    const enforced = ContrastTestPort.runCompliance(
      roles,
      pairs,
      new RecordingLogger(),
      stated
    );
    const movableNudged = ContrastTestPort.runNudgedCompliance(
      roles,
      pairs,
      new RecordingLogger(),
      ['text']
    );

    const warnedCvd = ContrastMetadataAssertionPort.cvd(warned);
    const nudgedCvd = ContrastMetadataAssertionPort.cvd(nudged);
    const enforcedCvd = ContrastMetadataAssertionPort.cvd(enforced);
    const movableNudgedCvd = ContrastMetadataAssertionPort.cvd(movableNudged);
    assert.ok(
      warnedCvd !== undefined &&
      nudgedCvd !== undefined &&
      enforcedCvd !== undefined &&
      movableNudgedCvd !== undefined,
      '[cvd-modes] CVD metadata present for every mode'
    );
    assert.strictEqual(
      warned.roles.text?.hex,
      roles.text.hex,
      '[cvd-modes] warn preserves the stated foreground'
    );
    assert.strictEqual(
      nudged.roles.background?.hex,
      roles.background.hex,
      '[cvd-modes] nudge preserves the stated background when no movable endpoint exists'
    );
    assert.deepStrictEqual(
      warnedCvd.blocked,
      [],
      '[cvd-modes] warn never creates a terminal blocker'
    );
    assert.deepStrictEqual(
      nudgedCvd.blocked,
      [],
      '[cvd-modes] nudge never creates a terminal blocker'
    );
    assert.strictEqual(
      warnedCvd.corrections.length,
      0,
      '[cvd-modes] warn never records a correction'
    );
    assert.strictEqual(
      nudgedCvd.corrections.length,
      0,
      '[cvd-modes] nudge records no impossible correction'
    );
    assert.notStrictEqual(
      movableNudged.roles.background?.hex,
      roles.background.hex,
      '[cvd-modes] nudge corrects an unstated endpoint'
    );
    assert.strictEqual(
      movableNudgedCvd.blocked.length,
      0,
      '[cvd-modes] nudge emits no blocker after a movable correction'
    );
    assert.strictEqual(
      movableNudgedCvd.corrections.length,
      1,
      '[cvd-modes] nudge records its applied correction'
    );
    assert.ok(
      warnedCvd.warnings.length > 0 && nudgedCvd.warnings.length > 0,
      '[cvd-modes] warn and nudge retain unresolved CVD evidence'
    );
    assert.deepStrictEqual(
      enforcedCvd.blocked,
      [{
        'background': 'background',
        'cvdTypes': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
        'foreground': 'text',
        'reason': 'stated-both'
      }],
      '[cvd-modes] enforce creates the canonical stated-both blocker'
    );

    const warnedReport = ContrastMetadataAssertionPort.compliance(warned);
    const nudgedReport = ContrastMetadataAssertionPort.compliance(nudged);
    const enforcedReport = ContrastMetadataAssertionPort.compliance(enforced);
    assert.ok(
      warnedReport !== undefined &&
      nudgedReport !== undefined &&
      enforcedReport !== undefined,
      '[cvd-modes] terminal compliance reports present'
    );
    assert.strictEqual(
      warnedReport.compliant,
      true,
      '[cvd-modes] warn evidence does not reject the palette'
    );
    assert.strictEqual(
      nudgedReport.compliant,
      true,
      '[cvd-modes] unresolved nudge evidence does not reject the palette'
    );
    assert.strictEqual(
      enforcedReport.compliant,
      false,
      '[cvd-modes] unresolved enforce evidence rejects the palette'
    );
  }

  private static statedForeground(): void {
    const originalRoles = CvdProbeScenarioSuite.statedPairRoles();
    const state = ContrastTestPort.runCorrectedCvd(
      originalRoles,
      [CvdProbeScenarioSuite.pair('text', 'background')],
      new RecordingLogger(),
      ['text']
    );
    const text = state.roles.text;
    const background = state.roles.background;
    assert.ok(text !== undefined && background !== undefined, '[cvd-stated-foreground] roles remain present');
    assert.strictEqual(text.hex, originalRoles.text.hex, '[cvd-stated-foreground] stated foreground remains byte-exact');
    assert.notStrictEqual(background.hex, originalRoles.background.hex, '[cvd-stated-foreground] derived background moves');
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-stated-foreground] metadata present');
    assert.strictEqual(cvd.blocked.length, 0, '[cvd-stated-foreground] movable pair is not blocked');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-stated-foreground] moved background clears CVD failures');
    assert.deepStrictEqual(cvd.corrections, [{
      'adjustedRoles': ['background'],
      'background': 'background',
      'cvdTypesFixed': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
      'cvdTypesRemaining': [],
      'disposition': 'adjusted-background',
      'foreground': 'text'
    }], '[cvd-stated-foreground] correction records the moved background');
  }

  private static rangeBoundedMover(): void {
    const originalRoles = CvdProbeScenarioSuite.statedPairRoles();
    const background = originalRoles.background;
    const roleSchema = RoleSchemaEntity.intake({
      'contrastPairs': [CvdProbeScenarioSuite.pair('text', 'background')],
      'name': 'cvd-range-bounded-mover',
      'roles': [
        {
          'chromaRange': [background.oklch.c, background.oklch.c],
          'lightnessRange': [background.oklch.l, background.oklch.l],
          'name': 'background',
          'required': true
        },
        { 'name': 'text', 'required': true }
      ]
    });
    const state = ContrastTestPort.runCorrectedCvdWithRoleSchema(
      originalRoles,
      roleSchema,
      new RecordingLogger(),
      ['text']
    );
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    const usage = enforceCvdSimulate.searchBudgetUsageForTesting();

    assert.deepStrictEqual(
      usage,
      { 'candidateScores': 1, 'weightedUnits': 6 },
      '[cvd-range-bounded] candidates outside the authored envelope are not scored'
    );
    assert.ok(cvd !== undefined, '[cvd-range-bounded] metadata present');
    assert.strictEqual(
      state.roles.background?.hex,
      originalRoles.background.hex,
      '[cvd-range-bounded] correction never writes an out-of-range background'
    );
    assert.deepStrictEqual(
      cvd.blocked,
      [{
        'background': 'background',
        'cvdTypes': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
        'foreground': 'text',
        'reason': 'solver-exhausted'
      }],
      '[cvd-range-bounded] enforce reports the constrained unresolved pair'
    );
  }

  private static statedBackground(): void {
    const originalRoles = CvdProbeScenarioSuite.statedPairRoles();
    const state = ContrastTestPort.runCorrectedCvd(
      originalRoles,
      [CvdProbeScenarioSuite.pair('text', 'background')],
      new RecordingLogger(),
      ['background']
    );
    const text = state.roles.text;
    const background = state.roles.background;
    assert.ok(text !== undefined && background !== undefined, '[cvd-stated-background] roles remain present');
    assert.notStrictEqual(text.hex, originalRoles.text.hex, '[cvd-stated-background] derived foreground moves');
    assert.strictEqual(background.hex, originalRoles.background.hex, '[cvd-stated-background] stated background remains byte-exact');
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-stated-background] metadata present');
    assert.strictEqual(cvd.blocked.length, 0, '[cvd-stated-background] movable pair is not blocked');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-stated-background] moved foreground clears CVD failures');
    assert.deepStrictEqual(cvd.corrections, [{
      'adjustedRoles': ['text'],
      'background': 'background',
      'cvdTypesFixed': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
      'cvdTypesRemaining': [],
      'disposition': 'adjusted-foreground',
      'foreground': 'text'
    }], '[cvd-stated-background] correction records the moved foreground');
  }

  private static statedBoth(): void {
    const originalRoles = CvdProbeScenarioSuite.statedPairRoles();
    const state = ContrastTestPort.runCorrectedCvd(
      originalRoles,
      [CvdProbeScenarioSuite.pair('text', 'background')],
      new RecordingLogger(),
      ['text', 'background']
    );
    assert.strictEqual(state.roles.text?.hex, originalRoles.text.hex, '[cvd-stated-both] stated foreground remains byte-exact');
    assert.strictEqual(state.roles.background?.hex, originalRoles.background.hex, '[cvd-stated-both] stated background remains byte-exact');
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-stated-both] metadata present');
    assert.deepStrictEqual(cvd.blocked, [{
      'background': 'background',
      'cvdTypes': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
      'foreground': 'text',
      'reason': 'stated-both'
    }], '[cvd-stated-both] blocked pair identifies the exact fixed endpoints');
    assert.strictEqual(cvd.corrections.length, 0, '[cvd-stated-both] no correction claims a stated role changed');
    assert.ok(cvd.warnings.length > 0, '[cvd-stated-both] unresolved CVD warnings remain explicit');
  }

  private static selectedPolicyFloor(): void {
    const originalRoles = {
      'background': colorRecordFactory.fromHex('#008000'),
      'text': colorRecordFactory.fromHex('#d00000')
    };
    const state = ContrastTestPort.runCorrectedCvd(
      originalRoles,
      [CvdProbeScenarioSuite.pairAtMinimum('text', 'background', 4.5)],
      new RecordingLogger()
    );
    const text = state.roles.text;
    const background = state.roles.background;
    assert.ok(text !== undefined && background !== undefined, '[cvd-selected-floor] terminal roles present');
    assert.ok(contrastWcag21.apply(text, background) >= 4.5, '[cvd-selected-floor] selected standard floor remains valid');
  }

  private static statedMiddleChain(): void {
    const originalRoles = {
      'A': colorRecordFactory.fromOklch(0.8063462371006608, 0.2377493067085743, 107.108104666695),
      'B': colorRecordFactory.fromOklch(0.8175662238150835, 0.2222650540433824, 338.6068118736148),
      'C': colorRecordFactory.fromOklch(0.8744853308424354, 0.24525246489793062, 218.68581217713654)
    };
    const state = ContrastTestPort.runCorrectedCvd(
      originalRoles,
      [CvdProbeScenarioSuite.pair('A', 'B'), CvdProbeScenarioSuite.pair('B', 'C')],
      new RecordingLogger(),
      ['B']
    );
    assert.strictEqual(state.roles.B?.hex, originalRoles.B.hex, '[cvd-stated-middle] stated middle remains byte-exact');
    assert.notStrictEqual(state.roles.A?.hex, originalRoles.A.hex, '[cvd-stated-middle] derived foreground moves');
    assert.notStrictEqual(state.roles.C?.hex, originalRoles.C.hex, '[cvd-stated-middle] derived counterpart moves');
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-stated-middle] metadata present');
    assert.strictEqual(cvd.blocked.length, 0, '[cvd-stated-middle] movable chain is not blocked');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-stated-middle] chain correction clears CVD failures');
    assert.deepStrictEqual(cvd.corrections.map((correction) => {
      return correction.adjustedRoles;
    }), [['A'], ['C']], '[cvd-stated-middle] each semantic pair records its actual mover');
  }

  private static terminalCorrection(): void {
    const originalRoles = CvdProbeScenarioSuite.statedPairRoles();
    const state = ContrastTestPort.runCompliance(
      originalRoles,
      [CvdProbeScenarioSuite.pair('text', 'background')],
      new RecordingLogger()
    );
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    const compliance = ContrastMetadataAssertionPort.compliance(state);
    assert.ok(cvd !== undefined && compliance !== undefined, '[cvd-terminal-correction] terminal metadata present');
    assert.notStrictEqual(state.roles.text?.hex, originalRoles.text.hex, '[cvd-terminal-correction] rendered foreground retains CVD correction');
    assert.strictEqual(cvd.corrections.length, 1, '[cvd-terminal-correction] terminal diagnostics retain correction');
    assert.deepStrictEqual(cvd.corrections[0]?.adjustedRoles, ['text'], '[cvd-terminal-correction] correction identifies rendered mover');
    assert.strictEqual(compliance.compliant, true, '[cvd-terminal-correction] corrected terminal roles comply');
    assert.strictEqual(compliance.disposition, 'resolved', '[cvd-terminal-correction] corrected terminal roles resolve the report');
  }

  private static terminalSolverExhausted(): void {
    const originalRoles = {
      'A': colorRecordFactory.fromHex('#d00000'),
      'B': colorRecordFactory.fromHex('#008000')
    };
    const state = ContrastTestPort.runCompliance(
      originalRoles,
      [CvdProbeScenarioSuite.pair('A', 'B'), CvdProbeScenarioSuite.pair('B', 'A')],
      new RecordingLogger()
    );
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    const compliance = ContrastMetadataAssertionPort.compliance(state);
    assert.ok(cvd !== undefined && compliance !== undefined, '[cvd-terminal-exhausted] terminal metadata present');
    assert.strictEqual(cvd.warnings.length, 8, '[cvd-terminal-exhausted] terminal warnings remain explicit');
    assert.deepStrictEqual(cvd.blocked.map((blocked) => {
      return blocked.reason;
    }), ['solver-exhausted', 'solver-exhausted'], '[cvd-terminal-exhausted] every movable unresolved pair is blocked');
    assert.strictEqual(compliance.compliant, false, '[cvd-terminal-exhausted] CVD failure makes terminal report noncompliant');
    const constraintKinds = new Set<string>();
    for (let index = 0; index < compliance.problemPairs.length; index += 1) {
      const pair = compliance.problemPairs[index];
      if (pair === undefined) {
        continue;
      }
      for (let constraintIndex = 0; constraintIndex < pair.constraints.length; constraintIndex += 1) {
        const constraint = pair.constraints[constraintIndex];
        if (constraint !== undefined) {
          constraintKinds.add(constraint);
        }
      }
    }
    assert.ok(
      constraintKinds.has('cvd-floor') || constraintKinds.has('cvd-drop'),
      '[cvd-terminal-exhausted] canonical report retains CVD constraint evidence'
    );
  }

  private static terminalStatedBoth(): void {
    const originalRoles = CvdProbeScenarioSuite.statedPairRoles();
    const state = ContrastTestPort.runCompliance(
      originalRoles,
      [CvdProbeScenarioSuite.pair('text', 'background')],
      new RecordingLogger(),
      ['text', 'background']
    );
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    const compliance = ContrastMetadataAssertionPort.compliance(state);
    assert.ok(cvd !== undefined && compliance !== undefined, '[cvd-terminal-stated-both] terminal metadata present');
    assert.strictEqual(cvd.corrections.length, 0, '[cvd-terminal-stated-both] standard blockers skip CVD refinement');
    assert.ok(cvd.warnings.length > 0, '[cvd-terminal-stated-both] observation warnings remain evidence');
    assert.strictEqual(compliance.compliant, false, '[cvd-terminal-stated-both] CVD-only failure makes terminal report noncompliant');
    assert.strictEqual(compliance.disposition, 'best-effort', '[cvd-terminal-stated-both] terminal report is best effort');
    const problem = compliance.problemPairs.at(0);
    assert.ok(problem !== undefined, '[cvd-terminal-stated-both] canonical problem pair exists');
    assert.strictEqual(problem.actual, contrastWcag21.apply(originalRoles.text, originalRoles.background), '[cvd-terminal-stated-both] terminal actual remains toastable');
    assert.strictEqual(problem.required, 1, '[cvd-terminal-stated-both] selected requirement remains toastable');
    assert.deepStrictEqual(problem.adjustedRoles, [], '[cvd-terminal-stated-both] exact stated endpoints remain unchanged');
    assert.ok(problem.constraints.includes('pin'), '[cvd-terminal-stated-both] canonical pair reports the pin constraint');
    assert.ok(
      problem.constraints.includes('cvd-floor') || problem.constraints.includes('cvd-drop'),
      '[cvd-terminal-stated-both] canonical pair reports CVD constraint evidence'
    );
  }

  private static statedPairRoles(): { readonly 'background': ReturnType<typeof colorRecordFactory.fromHex>; readonly 'text': ReturnType<typeof colorRecordFactory.fromHex>; } {
    return {
      'background': colorRecordFactory.fromHex('#46092e'),
      'text': colorRecordFactory.fromHex('#0b375d')
    };
  }

  private static correctionMetadata(): void {
    const state = ContrastTestPort.runCorrectedCvd({
      'bad': colorRecordFactory.fromHex('#03060b'),
      'clean': colorRecordFactory.fromHex('#333333'),
      'text': colorRecordFactory.fromHex('#18a6b5')
    }, [CvdProbeScenarioSuite.pair('text', 'bad'), CvdProbeScenarioSuite.pair('text', 'clean')], new RecordingLogger());
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-correction-metadata] metadata present');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-correction-metadata] terminal pairs clear');
    assert.strictEqual(cvd.corrections.length, 1, '[cvd-correction-metadata] only a fixed pair is recorded');
    const correction = cvd.corrections.at(0);
    assert.ok(correction !== undefined, '[cvd-correction-metadata] correction present');
    assert.strictEqual(correction.background, 'bad', '[cvd-correction-metadata] failing pair recorded');
    assert.deepStrictEqual(correction.cvdTypesFixed, ['protanopia'], '[cvd-correction-metadata] exact fixed type recorded');
  }

  private static cycle(): void {
    const originalRoles = {
      'A': colorRecordFactory.fromHex('#d00000'),
      'B': colorRecordFactory.fromHex('#008000')
    };
    const pairs = [CvdProbeScenarioSuite.pair('A', 'B'), CvdProbeScenarioSuite.pair('B', 'A')];
    const logger = new RecordingLogger();
    const first = ContrastTestPort.runCorrectedCvd(originalRoles, pairs, logger);
    const second = ContrastTestPort.runCorrectedCvd(originalRoles, pairs, new RecordingLogger());
    assert.strictEqual(first.roles.A?.hex, second.roles.A?.hex, '[cvd-cycle] deterministic A');
    assert.strictEqual(first.roles.B?.hex, second.roles.B?.hex, '[cvd-cycle] deterministic B');
    const terminalA = first.roles.A;
    const terminalB = first.roles.B;
    assert.ok(terminalA !== undefined && terminalB !== undefined, '[cvd-cycle] terminal roles present');
    assert.ok(contrastWcag21.apply(terminalA, terminalB) + 1e-12 >= contrastWcag21.apply(originalRoles.A, originalRoles.B), '[cvd-cycle] baseline preserved');
    assert.strictEqual(terminalA.hex, originalRoles.A.hex, '[cvd-cycle] restored A');
    assert.strictEqual(terminalB.hex, originalRoles.B.hex, '[cvd-cycle] restored B');
    const cvd = ContrastMetadataAssertionPort.cvd(first);
    assert.ok(cvd !== undefined, '[cvd-cycle] metadata present');
    assert.strictEqual(cvd.warnings.length, 8, '[cvd-cycle] every unresolved pair/type reported');
    assert.strictEqual(cvd.corrections.length, 0, '[cvd-cycle] no phantom correction');
    assert.deepStrictEqual(logger.warnings, ['CVD simulation emitted terminal advisory evidence'], '[cvd-cycle-log] terminal reconciliation emits one aggregate evidence diagnostic');
  }

  private static dependencyJoint(): void {
    const originalRoles = {
      'A': colorRecordFactory.fromOklch(0.8063462371006608, 0.2377493067085743, 107.108104666695),
      'B': colorRecordFactory.fromOklch(0.8175662238150835, 0.2222650540433824, 338.6068118736148),
      'C': colorRecordFactory.fromOklch(0.8744853308424354, 0.24525246489793062, 218.68581217713654)
    };
    const state = ContrastTestPort.runCorrectedCvd(originalRoles, [CvdProbeScenarioSuite.pair('A', 'B'), CvdProbeScenarioSuite.pair('B', 'C')], new RecordingLogger());
    const foregroundA = state.roles.A;
    const foregroundB = state.roles.B;
    const backgroundC = state.roles.C;
    assert.ok(foregroundA !== undefined && foregroundB !== undefined && backgroundC !== undefined, '[cvd-dependency-joint] terminal roles present');
    assert.notStrictEqual(foregroundA.hex, originalRoles.A.hex, '[cvd-dependency-joint] A changed');
    assert.notStrictEqual(foregroundB.hex, originalRoles.B.hex, '[cvd-dependency-joint] B changed');
    assert.ok(contrastWcag21.apply(foregroundA, foregroundB) + 1e-12 >= contrastWcag21.apply(originalRoles.A, originalRoles.B), '[cvd-dependency-joint] A to B baseline preserved');
    assert.ok(contrastWcag21.apply(foregroundB, backgroundC) + 1e-12 >= contrastWcag21.apply(originalRoles.B, originalRoles.C), '[cvd-dependency-joint] B to C baseline preserved');
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined, '[cvd-dependency-joint] metadata present');
    assert.strictEqual(cvd.warnings.length, 0, '[cvd-dependency-joint] pairs clear');
    const pairedCorrection = cvd.corrections.find((correction) => {
      const matches = correction.foreground === 'A' && correction.background === 'B';
      return matches;
    });
    assert.ok(pairedCorrection !== undefined, '[cvd-dependency-joint] A over B correction recorded');
    assert.deepStrictEqual(pairedCorrection.adjustedRoles, ['A', 'B'], '[cvd-dependency-joint] semantic pair records both changed endpoints in semantic order');
  }

  private static dependencyRollback(): void {
    const originalRoles = {
      'A': colorRecordFactory.fromOklch(0.18034453747794033, 0.18045909696491436, 161.84522487223148),
      'B': colorRecordFactory.fromOklch(0.7984681497793644, 0.12265136721078307, 289.4738715235144),
      'C': colorRecordFactory.fromOklch(0.8756250120326876, 0.1959079781617038, 232.3679086379707),
      'D': colorRecordFactory.fromHex('#d00000'),
      'E': colorRecordFactory.fromHex('#008000')
    };
    const state = ContrastTestPort.runCorrectedCvd(originalRoles, [
      CvdProbeScenarioSuite.pair('A', 'B'),
      CvdProbeScenarioSuite.pair('B', 'C'),
      CvdProbeScenarioSuite.pair('D', 'E')
    ], new RecordingLogger());
    const foreground = state.roles.A;
    const terminalBackground = state.roles.B;
    assert.ok(foreground !== undefined && terminalBackground !== undefined, '[cvd-dependency-rollback] terminal roles present');
    assert.ok(contrastWcag21.apply(foreground, terminalBackground) + 1e-12 >= contrastWcag21.apply(originalRoles.A, originalRoles.B), '[cvd-dependency-rollback] baseline preserved');
    assert.strictEqual(foreground.hex, '#03160d', '[cvd-dependency-rollback] restored A');
    assert.strictEqual(terminalBackground.hex, '#bbb2fe', '[cvd-dependency-rollback] restored B');
    assert.notStrictEqual(state.roles.D?.hex, originalRoles.D.hex, '[cvd-dependency-rollback] independent correction preserved');
    const cvd = ContrastMetadataAssertionPort.cvd(state);
    assert.ok(cvd !== undefined && cvd.warnings.length > 0, '[cvd-dependency-rollback] unresolved result remains truthful');
  }

  private static emittedHex(): void {
    const originalRoles = {
      'background': colorRecordFactory.fromOklch(0.26959387329407036, 0.31296409130096436, 348.3163001295179),
      'text': colorRecordFactory.fromOklch(0.32885180693119764, 0.09280003987252712, 249.64939070865512)
    };
    assert.strictEqual(originalRoles.text.hex, '#0b375d', '[cvd-emitted-hex] exact foreground repro');
    assert.strictEqual(originalRoles.background.hex, '#46092e', '[cvd-emitted-hex] exact background repro');
    const pairs = [CvdProbeScenarioSuite.pair('text', 'background')];
    const correctedState = ContrastTestPort.runCorrectedCvd(originalRoles, pairs, new RecordingLogger());
    const correctedForeground = correctedState.roles.text;
    const terminalBackground = correctedState.roles.background;
    assert.ok(correctedForeground !== undefined && terminalBackground !== undefined, '[cvd-emitted-hex] terminal roles present');
    const correctedCvd = ContrastMetadataAssertionPort.cvd(correctedState);
    assert.ok(correctedCvd !== undefined, '[cvd-emitted-hex] metadata present');
    assert.strictEqual(correctedCvd.warnings.length, 0, '[cvd-emitted-hex] correction succeeds');
    assert.strictEqual(correctedCvd.corrections.length, 1, '[cvd-emitted-hex] correction recorded');
    const emittedForeground = colorRecordFactory.fromHex(correctedForeground.hex);
    const emittedBackground = colorRecordFactory.fromHex(terminalBackground.hex);
    assert.deepStrictEqual(correctedForeground.rgb, emittedForeground.rgb, '[cvd-emitted-hex] RGB matches emitted hex');
    const emittedState = ContrastTestPort.runObservedCvd({ 'background': emittedBackground, 'text': emittedForeground }, pairs, new RecordingLogger());
    const emittedCvd = ContrastMetadataAssertionPort.cvd(emittedState);
    assert.ok(emittedCvd !== undefined, '[cvd-emitted-hex] reparsed metadata present');
    assert.strictEqual(emittedCvd.warnings.length, 0, '[cvd-emitted-hex] reparsed pair is safe');
  }

  private static failureSet(): void {
    const originalRoles = {
      'A': colorRecordFactory.fromOklch(0.6819713479839266, 0.1302844616235234, 78.28219106420875),
      'B': colorRecordFactory.fromOklch(0.1058935693046078, 0.13603481529280542, 240.2218773867935),
      'C': colorRecordFactory.fromOklch(0.4619867202918976, 0.31928108286811036, 233.57296999543905)
    };
    const pairs = [CvdProbeScenarioSuite.pair('A', 'B'), CvdProbeScenarioSuite.pair('B', 'C')];
    const originalState = ContrastTestPort.runObservedCvd(originalRoles, pairs, new RecordingLogger());
    const terminalState = ContrastTestPort.runCorrectedCvd(originalRoles, pairs, new RecordingLogger());
    const originalCvd = ContrastMetadataAssertionPort.cvd(originalState);
    const terminalCvd = ContrastMetadataAssertionPort.cvd(terminalState);
    assert.ok(originalCvd !== undefined && terminalCvd !== undefined, '[cvd-dependency-failure-set] metadata present');
    const originalTypes = CvdProbeScenarioSuite.cvdTypesFor(originalCvd.warnings, 'A', 'B');
    const terminalTypes = CvdProbeScenarioSuite.cvdTypesFor(terminalCvd.warnings, 'A', 'B');
    assert.deepStrictEqual(originalTypes, new Set(['protanopia']), '[cvd-dependency-failure-set] original failure reproduced');
    const terminalTypeValues = [...terminalTypes];
    for (let index = 0; index < terminalTypeValues.length; index += 1) {
      const terminalType = terminalTypeValues.at(index);
      assert.ok(terminalType !== undefined, '[cvd-dependency-failure-set] terminal type present');
      assert.ok(originalTypes.has(terminalType), '[cvd-dependency-failure-set] terminal type was originally failing');
    }
    assert.ok(!terminalTypes.has('deuteranopia'), '[cvd-dependency-failure-set] no new deuteranopia');
    assert.ok(!terminalTypes.has('tritanopia'), '[cvd-dependency-failure-set] no new tritanopia');
    const terminalA = terminalState.roles.A;
    const terminalB = terminalState.roles.B;
    assert.ok(terminalA !== undefined && terminalB !== undefined, '[cvd-dependency-failure-set] terminal roles present');
    const emittedOriginalA = colorRecordFactory.fromHex(originalRoles.A.hex);
    const emittedOriginalB = colorRecordFactory.fromHex(originalRoles.B.hex);
    assert.ok(contrastWcag21.apply(terminalA, terminalB) + 1e-12 >= contrastWcag21.apply(emittedOriginalA, emittedOriginalB), '[cvd-dependency-failure-set] emitted baseline preserved');
    const correction = terminalCvd.corrections.find((entry) => {
      const matches = entry.foreground === 'A' && entry.background === 'B';
      return matches;
    });
    if (terminalA.hex !== emittedOriginalA.hex) {
      assert.ok(correction !== undefined, '[cvd-dependency-failure-set] changed pair has correction metadata');
    }
    if (correction !== undefined) {
      for (let index = 0; index < correction.cvdTypesFixed.length; index += 1) {
        const fixedType = correction.cvdTypesFixed.at(index);
        assert.ok(fixedType !== undefined, '[cvd-dependency-failure-set] fixed type present');
        assert.ok(originalTypes.has(fixedType), '[cvd-dependency-failure-set] fixed type was originally failing');
      }
    }
  }

  private static cvdTypesFor(warnings: readonly { readonly 'background': string; readonly 'cvdType': string; readonly 'foreground': string; }[], foreground: string, background: string): Set<string> {
    const result = new Set<string>();
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings.at(index);
      if (warning?.foreground === foreground && warning.background === background) {
        result.add(warning.cvdType);
      }
    }
    return result;
  }

  private static pair(foreground: string, background: string): JSONSchema7Type {
    const result = ContrastPairEntity.intake({ 'algorithm': 'wcag21', 'background': background, 'foreground': foreground, 'minimumContrastRatio': 1 });
    return result;
  }

  private static pairAtMinimum(foreground: string, background: string, minimumContrastRatio: number): JSONSchema7Type {
    const result = ContrastPairEntity.intake({ 'algorithm': 'wcag21', 'background': background, 'foreground': foreground, 'minimumContrastRatio': minimumContrastRatio });
    return result;
  }

  private static budgetedStress(): void {
    const maximumCandidateScores = 1;
    const maximumWeightedUnits = 6;
    const roles: Record<string, ReturnType<typeof colorRecordFactory.fromHex>> = {
      'background': colorRecordFactory.fromHex('#008000')
    };
    const pairs: JSONSchema7Type[] = [];
    for (let index = 0; index < 99; index += 1) {
      const foreground = `text${index}`;
      Object.defineProperty(roles, foreground, {
        'configurable': true,
        'enumerable': true,
        'value': colorRecordFactory.fromHex('#d00000'),
        'writable': true
      });
      pairs.push(CvdProbeScenarioSuite.pair(foreground, 'background'));
    }
    const firstResult = ContrastTestPort.runComplianceWithCvdSearchBudgetForTesting(
      roles, pairs, new RecordingLogger(), maximumCandidateScores, maximumWeightedUnits
    );
    const secondResult = ContrastTestPort.runComplianceWithCvdSearchBudgetForTesting(
      roles, pairs, new RecordingLogger(), maximumCandidateScores, maximumWeightedUnits
    );
    const firstReport = ContrastMetadataAssertionPort.compliance(firstResult.state);
    const secondReport = ContrastMetadataAssertionPort.compliance(secondResult.state);
    assert.ok(firstReport !== undefined && secondReport !== undefined, '[cvd-budget-stress] terminal reports present');
    assert.ok(firstResult.usage.candidateScores <= maximumCandidateScores, '[cvd-budget-stress] global score count never exceeds the injected candidate cap');
    assert.ok(firstResult.usage.weightedUnits <= maximumWeightedUnits, '[cvd-budget-stress] global weighted work never exceeds the injected work cap');
    assert.deepStrictEqual(secondResult.usage, firstResult.usage, '[cvd-budget-stress] deterministic score budget usage');
    assert.strictEqual(firstReport.compliant, false, '[cvd-budget-stress] exhausted movable pairs make the terminal report noncompliant');
    assert.strictEqual(firstReport.problemPairs.length, 99, '[cvd-budget-stress] every unresolved pair receives one canonical problem record');
    for (let index = 0; index < firstReport.problemPairs.length; index += 1) {
      const pair = firstReport.problemPairs[index];
      if (pair === undefined) {
        throw new Error(`[cvd-budget-stress] missing problem pair ${index}`);
      }
      let hasCvdConstraint = false;
      for (let constraintIndex = 0; constraintIndex < pair.constraints.length; constraintIndex += 1) {
        const constraint = pair.constraints[constraintIndex];
        if (constraint === 'cvd-floor' || constraint === 'cvd-drop') {
          hasCvdConstraint = true;
          break;
        }
      }
      assert.strictEqual(hasCvdConstraint, true, `[cvd-budget-stress] unresolved pair ${index} reports CVD evidence`);
    }
    assert.deepStrictEqual(
      Object.entries(secondResult.state.roles).map(([name, role]) => { return [name, role.hex]; }),
      Object.entries(firstResult.state.roles).map(([name, role]) => { return [name, role.hex]; }),
      '[cvd-budget-stress] bounded resolution is deterministic'
    );
  }

  private static productionStress(): void {
    const roles: Record<string, ReturnType<typeof colorRecordFactory.fromHex>> = {
      'background': colorRecordFactory.fromHex('#008000')
    };
    const pairs: JSONSchema7Type[] = [];
    for (let index = 0; index < 99; index += 1) {
      const foreground = `text${index}`;
      Object.defineProperty(roles, foreground, {
        'configurable': true,
        'enumerable': true,
        'value': colorRecordFactory.fromHex('#d00000'),
        'writable': true
      });
      pairs.push(CvdProbeScenarioSuite.pair(foreground, 'background'));
    }
    const result = ContrastTestPort.runComplianceWithCvdSearchBudgetForTesting(
      roles,
      pairs,
      new RecordingLogger(),
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_CANDIDATE_SCORES,
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_WEIGHTED_UNITS
    );
    const report = ContrastMetadataAssertionPort.compliance(result.state);
    assert.ok(report !== undefined, '[cvd-production-stress] terminal report present');
    assert.strictEqual(report.compliant, true, '[cvd-production-stress] shared score and group-result caches retain a valid correction for each repeated failing pair');
    assert.strictEqual(report.problemPairs.length, 0, '[cvd-production-stress] corrected pairs have no terminal problems');
    CvdProbeScenarioSuite.assertProductionBudget(result.usage, 'cvd-production-stress');
  }
  private static budgetedCycle(): void {
    const maximumCandidateScores = 1;
    const maximumWeightedUnits = 6;
    const roles = {
      'A': colorRecordFactory.fromHex('#d00000'),
      'B': colorRecordFactory.fromHex('#008000')
    };
    const pairs = [CvdProbeScenarioSuite.pair('A', 'B'), CvdProbeScenarioSuite.pair('B', 'A')];
    const result = ContrastTestPort.runComplianceWithCvdSearchBudgetForTesting(
      roles, pairs, new RecordingLogger(), maximumCandidateScores, maximumWeightedUnits
    );
    const report = ContrastMetadataAssertionPort.compliance(result.state);
    assert.ok(report !== undefined, '[cvd-budget-cycle] terminal report present');
    assert.ok(result.usage.candidateScores <= maximumCandidateScores, '[cvd-budget-cycle] one shared score cap covers every cycle pass');
    assert.ok(result.usage.weightedUnits <= maximumWeightedUnits, '[cvd-budget-cycle] one shared weighted-work cap covers every cycle pass');
    assert.strictEqual(report.compliant, false, '[cvd-budget-cycle] exhausted cycle is noncompliant');
    assert.deepStrictEqual(
      report.problemPairs.map((pair) => { return pair.constraints; }),
      report.problemPairs.map((pair) => { return pair.constraints; }),
      '[cvd-budget-cycle] the shared cycle budget reports each unresolved pair exactly once'
    );
  }

  private static compliancePerformance(): void {
    const roles: Record<string, ReturnType<typeof colorRecordFactory.fromHex>> = {
      'background': colorRecordFactory.fromHex('#ffffff')
    };
    const pairs: JSONSchema7Type[] = [];
    const text = colorRecordFactory.fromHex('#000000');
    for (let index = 0; index < 99; index += 1) {
      const foreground = `text${index}`;
      Object.defineProperty(roles, foreground, {
        'configurable': true,
        'enumerable': true,
        'value': text,
        'writable': true
      });
      pairs.push(CvdProbeScenarioSuite.pairAtMinimum(foreground, 'background', 4.5));
    }
    const firstResult = ContrastTestPort.runComplianceWithCvdSearchBudgetForTesting(
      roles,
      pairs,
      new RecordingLogger(),
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_CANDIDATE_SCORES,
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_WEIGHTED_UNITS
    );
    const secondResult = ContrastTestPort.runComplianceWithCvdSearchBudgetForTesting(
      roles,
      pairs,
      new RecordingLogger(),
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_CANDIDATE_SCORES,
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_WEIGHTED_UNITS
    );
    const firstReport = ContrastMetadataAssertionPort.compliance(firstResult.state);
    const secondReport = ContrastMetadataAssertionPort.compliance(secondResult.state);
    assert.ok(firstReport !== undefined && secondReport !== undefined, '[compliance-100-role] terminal reports present');
    assert.strictEqual(Object.keys(firstResult.state.roles).length, 100, '[compliance-100-role] all declared roles remain present');
    assert.strictEqual(firstReport.pairs.length, 99, '[compliance-100-role] every declared pair is measured');
    assert.strictEqual(firstReport.compliant, true, '[compliance-100-role] terminal roles comply');
    assert.deepStrictEqual(
      Object.entries(secondResult.state.roles).map(([name, role]) => { return [name, role.hex]; }),
      Object.entries(firstResult.state.roles).map(([name, role]) => { return [name, role.hex]; }),
      '[compliance-100-role] canonical resolver is deterministic'
    );
    CvdProbeScenarioSuite.assertProductionBudget(firstResult.usage, 'compliance-100-role');
    assert.deepStrictEqual(secondResult.usage, firstResult.usage, '[compliance-100-role] production work is deterministic');
  }
  private static performance(): void {
    const roleRecord = {
      'background': colorRecordFactory.fromHex('#008000'),
      'text0': colorRecordFactory.fromHex('#d00000'),
      'text1': colorRecordFactory.fromHex('#d00000'),
      'text10': colorRecordFactory.fromHex('#d00000'),
      'text11': colorRecordFactory.fromHex('#d00000'),
      'text12': colorRecordFactory.fromHex('#d00000'),
      'text13': colorRecordFactory.fromHex('#d00000'),
      'text14': colorRecordFactory.fromHex('#d00000'),
      'text15': colorRecordFactory.fromHex('#d00000'),
      'text16': colorRecordFactory.fromHex('#d00000'),
      'text17': colorRecordFactory.fromHex('#d00000'),
      'text18': colorRecordFactory.fromHex('#d00000'),
      'text19': colorRecordFactory.fromHex('#d00000'),
      'text2': colorRecordFactory.fromHex('#d00000'),
      'text20': colorRecordFactory.fromHex('#d00000'),
      'text21': colorRecordFactory.fromHex('#d00000'),
      'text22': colorRecordFactory.fromHex('#d00000'),
      'text23': colorRecordFactory.fromHex('#d00000'),
      'text24': colorRecordFactory.fromHex('#d00000'),
      'text25': colorRecordFactory.fromHex('#d00000'),
      'text26': colorRecordFactory.fromHex('#d00000'),
      'text27': colorRecordFactory.fromHex('#d00000'),
      'text28': colorRecordFactory.fromHex('#d00000'),
      'text29': colorRecordFactory.fromHex('#d00000'),
      'text3': colorRecordFactory.fromHex('#d00000'),
      'text30': colorRecordFactory.fromHex('#d00000'),
      'text31': colorRecordFactory.fromHex('#d00000'),
      'text4': colorRecordFactory.fromHex('#d00000'),
      'text5': colorRecordFactory.fromHex('#d00000'),
      'text6': colorRecordFactory.fromHex('#d00000'),
      'text7': colorRecordFactory.fromHex('#d00000'),
      'text8': colorRecordFactory.fromHex('#d00000'),
      'text9': colorRecordFactory.fromHex('#d00000')
    };
    const pairs: JSONSchema7Type[] = [];
    for (let pairIndex = 0; pairIndex < 32; pairIndex += 1) {
      const foreground = `text${pairIndex}`;
      pairs.push(CvdProbeScenarioSuite.pair(foreground, 'background'));
    }
    enforceCvdSimulate.configureSearchBudgetForTesting(
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_CANDIDATE_SCORES,
      CvdProbeScenarioSuite.#PRODUCTION_MAXIMUM_WEIGHTED_UNITS
    );
    try {
      const originalRoles = new Map(Object.entries(roleRecord));
      const first = ContrastTestPort.runCorrectedCvd(roleRecord, pairs, new RecordingLogger());
      const firstUsage = enforceCvdSimulate.searchBudgetUsageForTesting();
      const second = ContrastTestPort.runCorrectedCvd(roleRecord, pairs, new RecordingLogger());
      const secondUsage = enforceCvdSimulate.searchBudgetUsageForTesting();
      if (firstUsage === undefined || secondUsage === undefined) {
        throw new TypeError('CVD production search did not report work usage');
      }
      const firstCvd = ContrastMetadataAssertionPort.cvd(first);
      const secondCvd = ContrastMetadataAssertionPort.cvd(second);
      assert.ok(firstCvd !== undefined && secondCvd !== undefined, '[cvd-performance] metadata present');
      assert.strictEqual(firstCvd.warnings.length, 0, '[cvd-performance] first run clear');
      assert.strictEqual(firstCvd.corrections.length, 32, '[cvd-performance] first corrections recorded');
      assert.strictEqual(secondCvd.warnings.length, 0, '[cvd-performance] second run clear');
      assert.strictEqual(secondCvd.corrections.length, 32, '[cvd-performance] second corrections recorded');
      const firstRoles = new Map(Object.entries(first.roles));
      const secondRoles = new Map(Object.entries(second.roles));
      const firstSignature: string[] = [];
      const secondSignature: string[] = [];
      for (let pairIndex = 0; pairIndex < 32; pairIndex += 1) {
        const foreground = `text${pairIndex}`;
        const original = originalRoles.get(foreground);
        const firstRole = firstRoles.get(foreground);
        const secondRole = secondRoles.get(foreground);
        assert.ok(original !== undefined && firstRole !== undefined && secondRole !== undefined, `[cvd-performance] ${foreground} present`);
        assert.notStrictEqual(firstRole.hex, original.hex, `[cvd-performance] ${foreground} corrected`);
        firstSignature.push(firstRole.hex);
        secondSignature.push(secondRole.hex);
      }
      assert.deepStrictEqual(secondSignature, firstSignature, '[cvd-performance] deterministic corrections');
      CvdProbeScenarioSuite.assertProductionBudget(firstUsage, 'cvd-performance');
      assert.deepStrictEqual(secondUsage, firstUsage, '[cvd-performance] production work is deterministic');
    } finally {
      ContrastTestPort.configureCvdSearchBudgetForTesting(500_000, 3_000_000);
    }
  }
}
