import type { JSONSchema7Type } from 'json-schema';

import { ComplianceReportEntity } from '@studnicky/iridis-contrast';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AccessibilityBlockers } from '../app/composables/accessibilityBlockers.ts';
import { ComplianceReportFixture } from './fixtures/ComplianceReportFixture.ts';

class ReportMetadata {
  public static build(problemPairs: readonly object[], algorithm: string, level: string): ComplianceReportEntity.Type {
    const result = ComplianceReportEntity.intake({
      'compliant': problemPairs.length === 0,
      'cvdCompliant': true,
      'pairs': [],
      'problemPairs': problemPairs,
      'selected': { 'algorithm': algorithm, 'level': level }
    });
    return result;
  }
}

await test('compliant report yields an empty key and no pairs', () => {
  const set = AccessibilityBlockers.fromReport(ReportMetadata.build([], 'wcag21', 'AA'));
  assert.equal(set.compliant, true);
  assert.equal(set.key, '');
  assert.deepEqual(set.pairs, []);
});

await test('blocked report yields a sorted deterministic key and toast text', () => {
  const set = AccessibilityBlockers.fromReport(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE, ComplianceReportFixture.ACCENT_ON_SURFACE], 'wcag21', 'AA'));
  assert.equal(set.compliant, false);
  assert.equal(set.standardLabel, 'WCAG AA');
  assert.equal(set.key, 'WCAG AA|accent/surface|text/surface');
  const message = AccessibilityBlockers.toastMessage(set);
  assert.equal(message.title, 'Pinned roles cannot meet WCAG AA');
  assert.equal(message.description, 'text on surface needs 4.50, reaches 1.09 (pinned); accent on surface needs 3.00, reaches 2.50 (search exhausted)');
});

await test('pair order does not change the key', () => {
  const forward = AccessibilityBlockers.fromReport(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE, ComplianceReportFixture.ACCENT_ON_SURFACE], 'wcag21', 'AA'));
  const reverse = AccessibilityBlockers.fromReport(ReportMetadata.build([ComplianceReportFixture.ACCENT_ON_SURFACE, ComplianceReportFixture.TEXT_ON_SURFACE], 'wcag21', 'AA'));
  assert.equal(forward.key, reverse.key);
});

await test('the selected standard labels the title and key', () => {
  const aaa = AccessibilityBlockers.fromReport(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE], 'wcag21', 'AAA'));
  const apca = AccessibilityBlockers.fromReport(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE], 'apca', 'Lc'));
  assert.equal(AccessibilityBlockers.toastMessage(aaa).title, 'Pinned roles cannot meet WCAG AAA');
  assert.equal(AccessibilityBlockers.toastMessage(apca).title, 'Pinned roles cannot meet APCA Lc');
  assert.notEqual(aaa.key, apca.key);
});

await test('stated-pair and cvd-type blockers are both reported', () => {
  const set = AccessibilityBlockers.fromReport(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE, ComplianceReportFixture.ACCENT_ON_SURFACE], 'wcag21', 'AA'));
  assert.equal(set.pairs.length, 2);
});

await test('missing or malformed reports are compliant with no pairs', () => {
  const malformed: readonly (JSONSchema7Type | undefined)[] = [
    void 0,
    null,
    'nope',
    { 'compliant': false, 'problemPairs': 'x' },
    { 'compliant': false, 'cvdCompliant': true, 'pairs': [], 'problemPairs': [{ 'foreground': 1 }], 'selected': { 'algorithm': 'wcag21', 'level': 'AA' } }
  ];
  for (let index = 0; index < malformed.length; index += 1) {
    const candidate = malformed[index];
    const set = AccessibilityBlockers.fromReport(candidate);
    assert.equal(set.compliant, true);
    assert.equal(set.key, '');
    assert.deepEqual(set.pairs, []);
  }
});
