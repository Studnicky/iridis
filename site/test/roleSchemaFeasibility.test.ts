import type { PaletteStateInterface, RoleSchemaEntity } from '@studnicky/iridis';

import { InputEntity, RuntimeOptionsEntity } from '@studnicky/iridis';
import { ComplianceReportEntity } from '@studnicky/iridis-contrast';
import { JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLOR_PIPELINE } from '../app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../app/composables/createColorEngine.ts';
import { ContrastConfigOptionsEntity } from '../app/composables/entities/ContrastConfigOptionsEntity.ts';
import { DerivationConfigEntity } from '../app/composables/entities/DerivationConfigEntity.ts';
import { VARIANT_CONFIG } from '../app/composables/variantConfig.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';
import { SeedInputEntity } from '../app/theme/types/SeedInputEntity.ts';

class RoleSchemaFeasibility {
  private static readonly framings = ['dark', 'light'] as const;

  private static readonly strictnesses = [1, 2] as const;

  private static readonly tolerance = 1e-6;

  public static assertAll(): void {
    const entries = Object.entries(roleSchemaByName);
    for (let schemaIndex = 0; schemaIndex < entries.length; schemaIndex += 1) {
      const [schemaName, schemaPair] = entries[schemaIndex]!;
      for (let framingIndex = 0; framingIndex < RoleSchemaFeasibility.framings.length; framingIndex += 1) {
        const framing = RoleSchemaFeasibility.framings[framingIndex]!;
        for (let strictnessIndex = 0; strictnessIndex < RoleSchemaFeasibility.strictnesses.length; strictnessIndex += 1) {
          const strictness = RoleSchemaFeasibility.strictnesses[strictnessIndex]!;
          const schema = schemaPair[framing];
          const runtime = RuntimeOptionsEntity.create({ 'colorSpace': 'srgb', 'framing': framing });
          const state = RoleSchemaFeasibility.run(schema, runtime, strictness);
          const report = ComplianceReportEntity.intake(state.metadata['contrast:complianceReport']);
          const standard = strictness === 1 ? 'AAA' : 'APCA';
          const label = `${schemaName}/${framing}/${standard}`;
          assert.equal(report.compliant, true, `${label} is compliant`);
          assert.deepEqual(report.problemPairs, [], `${label} has no problem pairs`);
          RoleSchemaFeasibility.assertPairs(report, label);
          RoleSchemaFeasibility.assertRanges(schema, state, label);
        }
      }
    }
  }

  private static assertPairs(report: ComplianceReportEntity.Type, label: string): void {
    for (let pairIndex = 0; pairIndex < report.pairs.length; pairIndex += 1) {
      const pair = report.pairs[pairIndex];
      if (pair === undefined) {
        continue;
      }
      const pairLabel = `${label} ${pair.foreground}/${pair.background}`;
      assert.equal(pair.passed, true, `${pairLabel} passes`);
      assert.equal(
        pair.actual + RoleSchemaFeasibility.tolerance >= pair.required,
        true,
        `${pairLabel} meets its selected target`
      );
    }
  }

  private static assertRanges(schema: RoleSchemaEntity.Type, state: PaletteStateInterface, label: string): void {
    for (let roleIndex = 0; roleIndex < schema.roles.length; roleIndex += 1) {
      const definition = schema.roles[roleIndex];
      if (definition === undefined) {
        continue;
      }
      const role = state.roles[definition.name];
      const roleLabel = `${label} ${definition.name}`;
      assert.notEqual(role, undefined, `${roleLabel} resolves`);
      if (role === undefined) {
        continue;
      }
      assert.notEqual(definition.lightnessRange, undefined, `${roleLabel} declares a lightness range`);
      assert.notEqual(definition.chromaRange, undefined, `${roleLabel} declares a chroma range`);
      if (definition.lightnessRange === undefined || definition.chromaRange === undefined) {
        continue;
      }
      const [minimumLightness, maximumLightness] = definition.lightnessRange;
      const [minimumChroma, maximumChroma] = definition.chromaRange;
      assert.equal(role.oklch.l + RoleSchemaFeasibility.tolerance >= minimumLightness, true, `${roleLabel} respects its minimum lightness`);
      assert.equal(role.oklch.l - RoleSchemaFeasibility.tolerance <= maximumLightness, true, `${roleLabel} respects its maximum lightness`);
      assert.equal(role.oklch.c + RoleSchemaFeasibility.tolerance >= minimumChroma, true, `${roleLabel} respects its minimum chroma`);
      assert.equal(role.oklch.c - RoleSchemaFeasibility.tolerance <= maximumChroma, true, `${roleLabel} respects its maximum chroma`);
    }
  }

  private static run(schema: RoleSchemaEntity.Type, runtime: RuntimeOptionsEntity.Type, strictness: number): PaletteStateInterface {
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    const result = engine.run(InputEntity.create({
      'colors': [SeedInputEntity.intake('#000000'), SeedInputEntity.intake('#ffffff')],
      'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': strictness })),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DerivationConfigEntity.defaultValue),
        'derivation:semanticHuesEnabled': true
      },
      'roles': schema,
      'runtime': runtime
    }));
    return result;
  }
}

await test('built-in schemas admit default unpinned AAA and APCA palettes inside authored ranges', () => {
  RoleSchemaFeasibility.assertAll();
});
