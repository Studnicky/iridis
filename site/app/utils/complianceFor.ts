/** Classifies a resolved contrast ratio against a pair's declared
 * minimumContrastRatio rather than a fixed WCAG-AA/AAA threshold. A pair set
 * to 3.0 (divider or syntax comment/punctuation) therefore reflects the
 * target the pipeline enforces. The omitted argument uses the 4.5 WCAG AA
 * body-text default for callers without a declared contrast pair. */
class ComplianceForOperation {
  static run(ratio: number, minimumContrastRatio = 4.5): string {
    if (ratio >= Math.max(minimumContrastRatio, 7)) {return 'AAA';}
    if (ratio >= minimumContrastRatio) {return 'AA';}
    return 'fail';
  }
}

export const complianceFor = ComplianceForOperation.run;
