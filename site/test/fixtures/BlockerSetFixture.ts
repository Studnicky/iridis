import { ComplianceReportEntity } from '@studnicky/iridis-contrast';

import { AccessibilityBlockers } from '../../app/composables/accessibilityBlockers.ts';
import { ComplianceReportFixture } from './ComplianceReportFixture.ts';

class BlockerSetBuilder {
  public static report(problemPairs: readonly object[]): ComplianceReportEntity.Type {
    const result = ComplianceReportEntity.intake({
      'compliant': problemPairs.length === 0,
      'disposition': problemPairs.length === 0 ? 'resolved' : 'best-effort',
      'pairs': [],
      'problemPairs': problemPairs,
      'selected': { 'algorithm': 'wcag21', 'level': 'AA' }
    });
    return result;
  }
}

const blockedReport = BlockerSetBuilder.report([ComplianceReportFixture.TEXT_ON_SURFACE]);

export const BlockerSetFixture = Object.freeze({
  'blocked': AccessibilityBlockers.fromReport(blockedReport),
  'compliant': AccessibilityBlockers.fromReport(BlockerSetBuilder.report([])),
  'withheld': AccessibilityBlockers.fromReport(ComplianceReportEntity.create({ ...blockedReport, 'disposition': 'withheld' }))
});
