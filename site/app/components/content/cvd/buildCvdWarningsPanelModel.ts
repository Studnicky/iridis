import type { CvdPairWarningInterfaceType } from '@studnicky/iridis-contrast/types';

class CvdWarningsPanelReport {
  public readonly corrected: number;
  public readonly list: CvdPairWarningInterfaceType[];
  public readonly stillFailing: number;
  public readonly warnings: number;

  public constructor(
    corrected: number,
    list: CvdPairWarningInterfaceType[],
    stillFailing: number,
    warnings: number
  ) {
    this.corrected = corrected;
    this.list = list;
    this.stillFailing = stillFailing;
    this.warnings = warnings;
  }
}

class CvdWarningsPanelModel {
  public readonly correctedLabel: string | null;
  public readonly detailsToggleLabel: string;
  public readonly hasWarnings: boolean;
  public readonly summaryBadgeColor: 'success' | 'warning';
  public readonly summaryBadgeLabel: string;

  public constructor(
    correctedLabel: string | null,
    detailsToggleLabel: string,
    hasWarnings: boolean,
    summaryBadgeColor: 'success' | 'warning',
    summaryBadgeLabel: string
  ) {
    this.correctedLabel = correctedLabel;
    this.detailsToggleLabel = detailsToggleLabel;
    this.hasWarnings = hasWarnings;
    this.summaryBadgeColor = summaryBadgeColor;
    this.summaryBadgeLabel = summaryBadgeLabel;
  }
}

export const buildCvdWarningsPanelModel = class CvdWarningsPanelModelBuilder {
  public static build(report: CvdWarningsPanelReport, showDetails: boolean): CvdWarningsPanelModel {
    const correctedLabel = report.corrected > 0
      ? `${report.corrected} pair${report.corrected === 1 ? '' : 's'} auto-corrected`
      : null;
    const summaryBadgeLabel = report.warnings === 0
      ? 'No contrast warnings under CVD'
      : `${report.warnings} warning${report.warnings === 1 ? '' : 's'}`;
    return new CvdWarningsPanelModel(
      correctedLabel,
      showDetails ? 'Hide warning details' : 'Show warning details',
      report.warnings > 0,
      report.warnings === 0 ? 'success' : 'warning',
      summaryBadgeLabel
    );
  }
};
