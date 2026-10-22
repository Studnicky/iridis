import type { JSONSchema7Type } from 'json-schema';

import { colorRecordFactory, ContrastPairInterfaceTypeEntity, contrastWcag21 } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContrastMetadataAssertionPort } from '../../contrast-plugin/ContrastMetadataAssertionPort.ts';
import { ContrastTestPort } from '../../contrast-plugin/ContrastTestPort.ts';
import { RecordingLogger } from '../../contrast-plugin/RecordingLogger.ts';

/** Independent direct probes for CVD correction integrity, determinism, and workload behavior. */
export class CvdProbeScenarioSuite {
  static async run(): Promise<void> {
    await test('CVD refinement validates and stores the exact emitted hex colors', CvdProbeScenarioSuite.emittedHex);
    await test('CVD refinement resolves dependency chains against terminal backgrounds', CvdProbeScenarioSuite.dependencyRollback);
    await test('CVD refinement finds a jointly valid dependency-chain correction', CvdProbeScenarioSuite.dependencyJoint);
    await test('CVD refinement never swaps original pair failures for new CVD types', CvdProbeScenarioSuite.failureSet);
    await test('CVD refinement records only pairs with an actually fixed CVD type', CvdProbeScenarioSuite.correctionMetadata);
    await test('CVD refinement resolves cyclic role constraints deterministically', CvdProbeScenarioSuite.cycle);
    await test('CVD refinement advisory mode does not claim correction failure', CvdProbeScenarioSuite.advisory);
    await test('CVD refinement moves a derived background when the foreground is stated', CvdProbeScenarioSuite.statedForeground);
    await test('CVD refinement moves a derived foreground when the background is stated', CvdProbeScenarioSuite.statedBackground);
    await test('CVD refinement blocks a pair when both semantic endpoints are stated', CvdProbeScenarioSuite.statedBoth);
    await test('CVD terminal compliance reports a CVD-only stated-both block', CvdProbeScenarioSuite.terminalStatedBoth);
    await test('CVD terminal compliance reports a movable solver-exhausted block', CvdProbeScenarioSuite.terminalSolverExhausted);
    await test('CVD terminal compliance retains a surviving correction', CvdProbeScenarioSuite.terminalCorrection);
    await test('CVD refinement preserves a selected policy floor above the original contrast', CvdProbeScenarioSuite.selectedPolicyFloor);
    await test('CVD refinement moves both derived endpoints around a stated chain middle', CvdProbeScenarioSuite.statedMiddleChain);
    await test('CVD refinement keeps a realistic 32-pair correction budget', CvdProbeScenarioSuite.performance);
    await test('canonical compliance remains deterministic for 100 declared roles', CvdProbeScenarioSuite.compliancePerformance);
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
    assert.strictEqual(compliance.cvdCompliant, true, '[cvd-terminal-correction] corrected terminal roles clear CVD');
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
    assert.strictEqual(compliance.cvdCompliant, false, '[cvd-terminal-exhausted] terminal CVD status fails');
    assert.deepStrictEqual(compliance.blockedPairs.map((blocked) => {
      return blocked.reason;
    }), ['solver-exhausted', 'solver-exhausted'], '[cvd-terminal-exhausted] canonical report retains CVD blockers');
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
    assert.strictEqual(compliance.compliant, false, '[cvd-terminal-stated-both] CVD-only failure makes terminal report noncompliant');
    assert.strictEqual(compliance.cvdCompliant, false, '[cvd-terminal-stated-both] terminal CVD status fails');
    assert.deepStrictEqual(compliance.blockedPairs, [{
      'actualTrichromat': contrastWcag21.apply(originalRoles.text, originalRoles.background),
      'background': 'background',
      'foreground': 'text',
      'reason': 'stated-both',
      'requiredTrichromat': 1,
      'target': 'AA'
    }], '[cvd-terminal-stated-both] exact terminal blocker remains toastable');
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
    assert.deepStrictEqual(logger.warnings, ['CVD correction could not clear every failing type'], '[cvd-cycle-log] terminal metadata warnings emit one aggregate correction diagnostic');
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
    const result = ContrastPairInterfaceTypeEntity.intake({ 'algorithm': 'wcag21', 'background': background, 'foreground': foreground, 'minimumContrastRatio': 1 });
    return result;
  }

  private static pairAtMinimum(foreground: string, background: string, minimumContrastRatio: number): JSONSchema7Type {
    const result = ContrastPairInterfaceTypeEntity.intake({ 'algorithm': 'wcag21', 'background': background, 'foreground': foreground, 'minimumContrastRatio': minimumContrastRatio });
    return result;
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
    const startedAt = performance.now();
    const first = ContrastTestPort.runCompliance(roles, pairs, new RecordingLogger());
    const elapsedMs = performance.now() - startedAt;
    const second = ContrastTestPort.runCompliance(roles, pairs, new RecordingLogger());
    const firstReport = ContrastMetadataAssertionPort.compliance(first);
    const secondReport = ContrastMetadataAssertionPort.compliance(second);
    assert.ok(firstReport !== undefined && secondReport !== undefined, '[compliance-100-role] terminal reports present');
    assert.strictEqual(Object.keys(first.roles).length, 100, '[compliance-100-role] all declared roles remain present');
    assert.strictEqual(firstReport.pairs.length, 99, '[compliance-100-role] every declared pair is measured');
    assert.strictEqual(firstReport.compliant, true, '[compliance-100-role] terminal roles comply');
    assert.deepStrictEqual(
      Object.entries(second.roles).map(([name, role]) => { return [name, role.hex]; }),
      Object.entries(first.roles).map(([name, role]) => { return [name, role.hex]; }),
      '[compliance-100-role] canonical resolver is deterministic'
    );
    const localGenerousBoundMs = 8_000;
    assert.ok(elapsedMs <= localGenerousBoundMs, `[compliance-100-role] enforce:compliance plus report:compliance took ${elapsedMs.toFixed(2)} ms against the generous ${localGenerousBoundMs} ms local bound`);
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
    const originalRoles = new Map(Object.entries(roleRecord));
    const first = ContrastTestPort.runCorrectedCvd(roleRecord, pairs, new RecordingLogger());
    const startedAt = performance.now();
    const second = ContrastTestPort.runCorrectedCvd(roleRecord, pairs, new RecordingLogger());
    const elapsedMs = performance.now() - startedAt;
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
    const baselineRoles = {
      'background': roleRecord.background,
      'text0': roleRecord.text0,
      'text1': roleRecord.text1,
      'text2': roleRecord.text2,
      'text3': roleRecord.text3
    };
    const baselinePairs: JSONSchema7Type[] = [];
    for (let pairIndex = 0; pairIndex < 4; pairIndex += 1) {
      const foreground = `text${pairIndex}`;
      baselinePairs.push(CvdProbeScenarioSuite.pair(foreground, 'background'));
    }
    const baselineStartedAt = performance.now();
    ContrastTestPort.runCorrectedCvd(baselineRoles, baselinePairs, new RecordingLogger());
    const baselineElapsedMs = performance.now() - baselineStartedAt;
    const ceilingMs = Math.max(250, baselineElapsedMs * 16);
    assert.ok(elapsedMs <= ceilingMs, `[cvd-performance] 32 pairs took ${elapsedMs.toFixed(2)} ms against ${ceilingMs.toFixed(2)} ms`);
  }
}
