import { RuntimeOptionsEntity } from '@studnicky/iridis';
import { strict } from 'node:assert';
import { test } from 'node:test';

import { ContrastConfigOptionsEntity } from '../app/composables/entities/ContrastConfigOptionsEntity.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';
import { CvdBudgetDiagnostics } from './fixtures/CvdBudgetDiagnostics.ts';
import { PinAssertions } from './fixtures/PinAssertions.ts';
import { PinRequest } from './fixtures/PinRequest.ts';
import { PinRun } from './fixtures/PinRun.ts';

class AccessibilityMatrix {
  private static readonly configurations: readonly { readonly 'label': string; readonly 'options': ContrastConfigOptionsEntity.Type; }[] = [
    { 'label': 'AA/warn', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'warn', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 0 }) },
    { 'label': 'AA/nudge', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 0 }) },
    { 'label': 'AA/enforce', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'enforce', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 0 }) },
    { 'label': 'AAA/warn', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'warn', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 1 }) },
    { 'label': 'AAA/nudge', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 1 }) },
    { 'label': 'AAA/enforce', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'enforce', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 1 }) },
    { 'label': 'APCA/warn', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'warn', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 2 }) },
    { 'label': 'APCA/nudge', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 2 }) },
    { 'label': 'APCA/enforce', 'options': ContrastConfigOptionsEntity.create({ 'cvdMode': 'enforce', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 2 }) }
  ];

  private static readonly framings = ['dark', 'light'] as const;
  private static readonly sampleImageSeeds = ['#5e35b1', '#ffffff', '#000000'];

  private static assertNormalBudget(run: PinRun, label: string): void {
    strict.equal(
      CvdBudgetDiagnostics.isWithinNormalHeadroom(run.budgetUsage),
      true,
      `${label} consumed ${run.budgetUsage.candidateScores} candidate scores and ${run.budgetUsage.weightedUnits} weighted units.`
    );
  }

  private static recordBlockedPairs(blocked: string[], label: string, run: PinRun): void {
    if (run.report.compliant) {
      return;
    }
    for (let blockedIndex = 0; blockedIndex < run.report.problemPairs.length; blockedIndex += 1) {
      const pair = run.report.problemPairs[blockedIndex];
      if (pair !== undefined) {
        blocked.push(`${label}: ${pair.foreground}/${pair.background} ${pair.causes.join('+')} required=${pair.required} actual=${pair.actual}`);
      }
    }
  }

  public static assertDefaults(): readonly string[] {
    const blocked: string[] = [];
    const schemas = Object.entries(roleSchemaByName);
    for (let schemaIndex = 0; schemaIndex < schemas.length; schemaIndex += 1) {
      const [, schemaPair] = schemas[schemaIndex]!;
      for (let framingIndex = 0; framingIndex < AccessibilityMatrix.framings.length; framingIndex += 1) {
        const framing = AccessibilityMatrix.framings[framingIndex]!;
        const runtime = RuntimeOptionsEntity.create({ 'colorSpace': 'srgb', 'framing': framing });
        const schema = schemaPair[framing];
        for (let configurationIndex = 0; configurationIndex < AccessibilityMatrix.configurations.length; configurationIndex += 1) {
          const configuration = AccessibilityMatrix.configurations[configurationIndex]!;
          const run = PinRun.execute(PinRequest.forSchema(schema, runtime, configuration.options, new Map()));
          PinAssertions.truthful(run);
          PinAssertions.staysWithinRoleRanges(run);
          const label = `${schema.name}/${framing}/${configuration.label}`;
          AccessibilityMatrix.assertNormalBudget(run, label);
          AccessibilityMatrix.recordBlockedPairs(blocked, label, run);
        }
      }
    }
    const result = blocked.toSorted((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }

  public static assertSampleImagePalette(): void {
    const schemaPair = roleSchemaByName['iridis-32'];
    for (let framingIndex = 0; framingIndex < AccessibilityMatrix.framings.length; framingIndex += 1) {
      const framing = AccessibilityMatrix.framings[framingIndex]!;
      const runtime = RuntimeOptionsEntity.create({ 'colorSpace': 'srgb', 'framing': framing });
      for (let configurationIndex = 0; configurationIndex < AccessibilityMatrix.configurations.length; configurationIndex += 1) {
        const configuration = AccessibilityMatrix.configurations[configurationIndex]!;
        const run = PinRun.execute(PinRequest.forSchema(
          schemaPair[framing],
          runtime,
          configuration.options,
          new Map(),
          AccessibilityMatrix.sampleImageSeeds
        ));
        PinAssertions.truthful(run);
        PinAssertions.staysWithinRoleRanges(run);
        AccessibilityMatrix.assertNormalBudget(run, `iridis-32/${framing}/${configuration.label}/sample-image`);
      }
    }
  }

  public static assertUnconstrainedBrandPin(): void {
    const pins = new Map([['brand', '#7c3aed']]);
    const runtime = RuntimeOptionsEntity.create({ 'colorSpace': 'srgb', 'framing': 'dark' });
    const schema = roleSchemaByName['iridis-32'].dark;
    for (let configurationIndex = 0; configurationIndex < AccessibilityMatrix.configurations.length; configurationIndex += 1) {
      const configuration = AccessibilityMatrix.configurations[configurationIndex]!;
      const run = PinRun.execute(PinRequest.forSchema(schema, runtime, configuration.options, pins));
      PinAssertions.truthful(run);
      PinAssertions.pinsExact(run);
      PinAssertions.staysWithinRoleRanges(run);
      AccessibilityMatrix.assertNormalBudget(run, `iridis-32/dark/${configuration.label}/brand-pin`);
    }
  }
}

await test('built-in default palettes report truthfully for every standard and CVD mode', (context) => {
  const blocked = AccessibilityMatrix.assertDefaults();
  if (blocked.length > 0) {
    context.diagnostic(`Default blocked or noncompliant cases:\n${blocked.join('\n')}`);
  }
});

await test('the deterministic sample-image palette reports truthfully for every standard and CVD mode', () => {
  AccessibilityMatrix.assertSampleImagePalette();
});

await test('an unconstrained brand pin keeps its exact color while every mode reports truthfully', () => {
  AccessibilityMatrix.assertUnconstrainedBrandPin();
});
