import type { CvdPairWarningEntity } from '@studnicky/iridis-contrast/types';

class CvdWarningsPanelReport {
  public readonly corrected: number;
  public readonly list: CvdPairWarningEntity.Type[];
  public readonly stillFailing: number;
  public readonly warnings: number;

  public constructor(
    corrected: number,
    list: CvdPairWarningEntity.Type[],
    stillFailing: number,
    warnings: number
  ) {
    this.corrected = corrected;
    this.list = list;
    this.stillFailing = stillFailing;
    this.warnings = warnings;
  }
}

abstract class CvdWarningsSummaryPresentation {
  readonly #warningCount: number;

  public constructor(warningCount: number) {
    this.#warningCount = warningCount;
  }

  public abstract badgeColor(): 'success' | 'warning';

  public abstract badgeLabel(): string;

  protected warningCount(): number {
    const count = this.#warningCount;
    return count;
  }
}

class CvdWarningsAbsentSummaryPresentation extends CvdWarningsSummaryPresentation {
  public constructor() {
    super(0);
  }

  public badgeColor(): 'success' | 'warning' {
    return 'success';
  }

  public badgeLabel(): string {
    return 'No contrast warnings under CVD';
  }
}

class CvdWarningsPresentSummaryPresentation extends CvdWarningsSummaryPresentation {
  public constructor(warningCount: number) {
    super(warningCount);
  }

  public badgeColor(): 'success' | 'warning' {
    return 'warning';
  }

  public badgeLabel(): string {
    const warningCount = this.warningCount();
    const suffix = warningCount === 1 ? '' : 's';
    const label = `${warningCount} warning${suffix}`;
    return label;
  }
}

abstract class CvdWarningDetailsPresentation {
  public abstract toggleLabel(): string;
}

class CvdWarningDetailsHiddenPresentation extends CvdWarningDetailsPresentation {
  public toggleLabel(): string {
    return 'Show warning details';
  }
}

class CvdWarningDetailsShownPresentation extends CvdWarningDetailsPresentation {
  public toggleLabel(): string {
    return 'Hide warning details';
  }
}

class CvdWarningsPanelModel {
  public readonly correctedLabel: string | null;
  readonly #detailsPresentation: CvdWarningDetailsPresentation;
  readonly #summaryPresentation: CvdWarningsSummaryPresentation;

  public constructor(
    correctedLabel: string | null,
    detailsPresentation: CvdWarningDetailsPresentation,
    summaryPresentation: CvdWarningsSummaryPresentation
  ) {
    this.correctedLabel = correctedLabel;
    this.#detailsPresentation = detailsPresentation;
    this.#summaryPresentation = summaryPresentation;
  }

  public get detailsToggleLabel(): string {
    const label = this.#detailsPresentation.toggleLabel();
    return label;
  }

  public get hasWarnings(): boolean {
    const hasWarnings = this.#summaryPresentation instanceof CvdWarningsPresentSummaryPresentation;
    return hasWarnings;
  }

  public get summaryBadgeColor(): 'success' | 'warning' {
    const color = this.#summaryPresentation.badgeColor();
    return color;
  }

  public get summaryBadgeLabel(): string {
    const label = this.#summaryPresentation.badgeLabel();
    return label;
  }
}

export const buildCvdWarningsPanelModel = class CvdWarningsPanelModelBuilder {
  public static buildWithHiddenDetails(report: CvdWarningsPanelReport): CvdWarningsPanelModel {
    const model = CvdWarningsPanelModelBuilder.#build(
      report,
      new CvdWarningDetailsHiddenPresentation()
    );
    return model;
  }

  public static buildWithShownDetails(report: CvdWarningsPanelReport): CvdWarningsPanelModel {
    const model = CvdWarningsPanelModelBuilder.#build(
      report,
      new CvdWarningDetailsShownPresentation()
    );
    return model;
  }

  static #build(
    report: CvdWarningsPanelReport,
    detailsPresentation: CvdWarningDetailsPresentation
  ): CvdWarningsPanelModel {
    let correctedLabel: string | null = null;
    if (report.corrected > 0) {
      const suffix = report.corrected === 1 ? '' : 's';
      correctedLabel = `${report.corrected} pair${suffix} auto-corrected`;
    }
    const summaryPresentation = report.warnings === 0
      ? new CvdWarningsAbsentSummaryPresentation()
      : new CvdWarningsPresentSummaryPresentation(report.warnings);
    const model = new CvdWarningsPanelModel(
      correctedLabel,
      detailsPresentation,
      summaryPresentation
    );
    return model;
  }
};
