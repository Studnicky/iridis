import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AccessibilityBlockers } from '../app/composables/accessibilityBlockers.ts';
import { ComplianceReportViewInterfaceTypeEntity } from '../app/composables/entities/ComplianceReportViewInterfaceTypeEntity.ts';
import { ComplianceReportFixture } from './fixtures/ComplianceReportFixture.ts';

class ReportMetadata {
  public static build(blockedPairs: readonly object[], algorithm: string, level: string): ComplianceReportViewInterfaceTypeEntity.Type {
    const result = ComplianceReportViewInterfaceTypeEntity.intake({
      'blockedPairs': blockedPairs,
      'compliant': blockedPairs.length === 0,
      'cvdCompliant': true,
      'pairs': blockedPairs,
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
  assert.equal(message.description, 'text on surface needs 4.50, reaches 1.09; accent on surface needs 3.00, reaches 2.50');
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
  const malformed: readonly unknown[] = [
    void 0,
    null,
    'nope',
    { 'blockedPairs': 'x', 'compliant': false },
    { 'blockedPairs': [{ 'foreground': 1 }], 'compliant': false, 'cvdCompliant': true, 'pairs': [], 'selected': { 'algorithm': 'wcag21', 'level': 'AA' } }
  ];
  for (let index = 0; index < malformed.length; index += 1) {
    const candidate = malformed[index];
    const set = AccessibilityBlockers.fromReport(ComplianceReportViewInterfaceTypeEntity.validate(candidate) ? candidate : void 0);
    assert.equal(set.compliant, true);
    assert.equal(set.key, '');
    assert.deepEqual(set.pairs, []);
  }
});
