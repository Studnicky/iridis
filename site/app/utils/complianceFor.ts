/** Classifies a resolved contrast ratio against a pair's own declared minRatio
 * rather than a fixed WCAG-AA/AAA threshold, so a pair the schema deliberately
 * declares at e.g. 3.0 (divider, syntax-comment/punctuation) is scored against
 * the target it was actually enforced to. minRatio defaults to 4.5 (WCAG AA
 * body text) so existing callers that don't pass one keep today's behavior. */
export function complianceFor(ratio: number, minRatio = 4.5): string {
  if (ratio >= Math.max(minRatio, 7)) {return 'AAA';}
  if (ratio >= minRatio) {return 'AA';}
  return 'fail';
}
