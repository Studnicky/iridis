import type { CvdPairWarningInterfaceType } from '@studnicky/iridis-contrast/types';

export type CvdWarningsPanelReport = {
  readonly corrected: number;
  readonly list: CvdPairWarningInterfaceType[];
  readonly stillFailing: number;
  readonly warnings: number;
};

export type CvdWarningsPanelModel = {
  readonly correctedLabel: string | null;
  readonly detailsToggleLabel: string;
  readonly hasWarnings: boolean;
  readonly summaryBadgeColor: 'success' | 'warning';
  readonly summaryBadgeLabel: string;
};

export function buildCvdWarningsPanelModel(
  report: CvdWarningsPanelReport,
  showDetails: boolean
): CvdWarningsPanelModel {
  return {
    correctedLabel: report.corrected > 0
      ? `${report.corrected} pair${report.corrected === 1 ? '' : 's'} auto-corrected`
      : null,
    detailsToggleLabel: showDetails ? 'Hide warning details' : 'Show warning details',
    hasWarnings: report.warnings > 0,
    summaryBadgeColor: report.warnings === 0 ? 'success' : 'warning',
    summaryBadgeLabel: report.warnings === 0
      ? 'No contrast warnings under CVD'
      : `${report.warnings} warning${report.warnings === 1 ? '' : 's'}`
  };
}
