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
    await test('enforce:cvdSimulate validates and stores the exact emitted hex colors', CvdProbeScenarioSuite.emittedHex);
    await test('enforce:cvdSimulate resolves dependency chains against terminal backgrounds', CvdProbeScenarioSuite.dependencyRollback);
    await test('enforce:cvdSimulate finds a jointly valid dependency-chain correction', CvdProbeScenarioSuite.dependencyJoint);
    await test('enforce:cvdSimulate never swaps original pair failures for new CVD types', CvdProbeScenarioSuite.failureSet);
    await test('enforce:cvdSimulate records only pairs with an actually fixed CVD type', CvdProbeScenarioSuite.correctionMetadata);
    await test('enforce:cvdSimulate resolves cyclic role constraints deterministically', CvdProbeScenarioSuite.cycle);
    await test('enforce:cvdSimulate advisory mode does not claim correction failure', CvdProbeScenarioSuite.advisory);
    await test('enforce:cvdSimulate keeps a realistic 32-pair correction budget', CvdProbeScenarioSuite.performance);
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
