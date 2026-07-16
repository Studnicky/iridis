type ContrastPairsType = {
  pairs: { foreground: string; background: string; before: number; after: number; required: number; pass: boolean; algorithm: string }[];
};

type CvdReportType = {
  warnings: unknown[];
  corrections: { foreground: string; background: string; cvdTypesFixed: string[]; cvdTypesRemaining: string[] }[] | undefined;
};

export function pairSummary(report: unknown): string {
  const { pairs } = report as ContrastPairsType;
  const passing = pairs.filter((pair) => pair.pass).length;
  return `${passing}/${pairs.length} pairs passing`;
}

export function cvdCorrectionSummary(report: unknown): string | undefined {
  const { corrections } = report as CvdReportType;
  if (corrections === undefined) return undefined;
  const autoCorrected = corrections.filter((correction) => correction.cvdTypesRemaining.length === 0).length;
  const stillFailing = corrections.filter((correction) => correction.cvdTypesRemaining.length > 0).length;
  return `${autoCorrected} pairs auto-corrected, ${stillFailing} still failing`;
}
