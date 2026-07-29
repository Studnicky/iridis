/** Classifies a resolved contrast ratio against a pair's own declared minRatio
 * rather than a fixed WCAG-AA/AAA threshold, so a pair the schema deliberately
 * declares at e.g. 3.0 (divider, syntax-comment/punctuation) is scored against
 * the target it was actually enforced to. minRatio defaults to 4.5 (WCAG AA
 * body text) so existing callers that don't pass one keep today's behavior. */
class ComplianceForOperation {
  static run(ratio: number, minimumRatio = 4.5): string {
    if (ratio >= Math.max(minimumRatio, 7)) {return 'AAA';}
    if (ratio >= minimumRatio) {return 'AA';}
    return 'fail';
  }
}

export const complianceFor = ComplianceForOperation.run;
