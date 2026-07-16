type PairPassReport = {
  pairs: { pass: boolean }[];
};

export type SchemaStageSummary = {
  key: string;
  label: string;
  text: string;
  color: 'success' | 'warning' | 'neutral';
};

export function buildSchemaComplianceSummaries(
  enabledStageNames: ReadonlySet<string>,
  report: {
    aa?: PairPassReport;
    aaa?: PairPassReport;
    apca?: PairPassReport;
  }
): SchemaStageSummary[] {
  const summaries: SchemaStageSummary[] = [];
  if (enabledStageNames.has('enforce:wcagAA') && report.aa !== undefined) {
    const passing = report.aa.pairs.filter((pair) => pair.pass).length;
    summaries.push({
      'color': passing === report.aa.pairs.length ? 'success' : 'warning',
      'key': 'aa',
      'label': 'WCAG AA',
      'text': `${passing}/${report.aa.pairs.length} pairs passing`
    });
  }
  if (enabledStageNames.has('enforce:wcagAAA') && report.aaa !== undefined) {
    const passing = report.aaa.pairs.filter((pair) => pair.pass).length;
    summaries.push({
      'color': passing === report.aaa.pairs.length ? 'success' : 'warning',
      'key': 'aaa',
      'label': 'WCAG AAA',
      'text': `${passing}/${report.aaa.pairs.length} pairs passing`
    });
  }
  if (enabledStageNames.has('enforce:apca') && report.apca !== undefined) {
    const passing = report.apca.pairs.filter((pair) => pair.pass).length;
    summaries.push({
      'color': passing === report.apca.pairs.length ? 'success' : 'warning',
      'key': 'apca',
      'label': 'APCA',
      'text': `${passing}/${report.apca.pairs.length} pairs passing`
    });
  }
  return summaries;
}
