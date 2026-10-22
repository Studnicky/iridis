import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AccessibilityBlockers } from '../app/composables/accessibilityBlockers.ts';
import { ComplianceReportFixture } from './fixtures/ComplianceReportFixture.ts';

class ReportMetadata {
  public static build(blockedPairs: readonly object[], algorithm: string, level: string): Record<string, unknown> {
    const result: Record<string, unknown> = {
      'contrast:complianceReport': {
        'blockedPairs': blockedPairs,
        'compliant': blockedPairs.length === 0,
        'cvdCompliant': true,
        'pairs': blockedPairs,
        'selected': { 'algorithm': algorithm, 'level': level }
      }
    };
    return result;
  }
}

await test('compliant report yields an empty key and no pairs', () => {
  const set = AccessibilityBlockers.fromMetadata(ReportMetadata.build([], 'wcag21', 'AA'));
  assert.equal(set.compliant, true);
  assert.equal(set.key, '');
  assert.deepEqual(set.pairs, []);
});

await test('blocked report yields a sorted deterministic key and toast text', () => {
  const set = AccessibilityBlockers.fromMetadata(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE, ComplianceReportFixture.ACCENT_ON_SURFACE], 'wcag21', 'AA'));
  assert.equal(set.compliant, false);
  assert.equal(set.standardLabel, 'WCAG AA');
  assert.equal(set.key, 'WCAG AA|accent/surface|text/surface');
  const message = AccessibilityBlockers.toastMessage(set);
  assert.equal(message.title, 'Pinned roles cannot meet WCAG AA');
  assert.equal(message.description, 'text on surface needs 4.50, reaches 1.09; accent on surface needs 3.00, reaches 2.50');
});

await test('pair order does not change the key', () => {
  const forward = AccessibilityBlockers.fromMetadata(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE, ComplianceReportFixture.ACCENT_ON_SURFACE], 'wcag21', 'AA'));
  const reverse = AccessibilityBlockers.fromMetadata(ReportMetadata.build([ComplianceReportFixture.ACCENT_ON_SURFACE, ComplianceReportFixture.TEXT_ON_SURFACE], 'wcag21', 'AA'));
  assert.equal(forward.key, reverse.key);
});

await test('the selected standard labels the title and key', () => {
  const aaa = AccessibilityBlockers.fromMetadata(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE], 'wcag21', 'AAA'));
  const apca = AccessibilityBlockers.fromMetadata(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE], 'apca', 'Lc'));
  assert.equal(AccessibilityBlockers.toastMessage(aaa).title, 'Pinned roles cannot meet WCAG AAA');
  assert.equal(AccessibilityBlockers.toastMessage(apca).title, 'Pinned roles cannot meet APCA Lc');
  assert.notEqual(aaa.key, apca.key);
});

await test('stated-pair and cvd-type blockers are both reported', () => {
  const set = AccessibilityBlockers.fromMetadata(ReportMetadata.build([ComplianceReportFixture.TEXT_ON_SURFACE, ComplianceReportFixture.ACCENT_ON_SURFACE], 'wcag21', 'AA'));
  assert.equal(set.pairs.length, 2);
});

await test('missing or malformed reports are compliant with no pairs', () => {
  const malformed: readonly Record<string, unknown>[] = [
    {},
    { 'contrast:complianceReport': null },
    { 'contrast:complianceReport': 'nope' },
    { 'contrast:complianceReport': { 'blockedPairs': 'x', 'compliant': false } },
    { 'contrast:complianceReport': { 'blockedPairs': [{ 'foreground': 1 }], 'compliant': false, 'cvdCompliant': true, 'pairs': [], 'selected': { 'algorithm': 'wcag21', 'level': 'AA' } } }
  ];
  for (let index = 0; index < malformed.length; index += 1) {
    const set = AccessibilityBlockers.fromMetadata(malformed[index] ?? {});
    assert.equal(set.compliant, true);
    assert.equal(set.key, '');
    assert.deepEqual(set.pairs, []);
  }
});
