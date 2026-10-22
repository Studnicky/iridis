import { ComplianceReportViewInterfaceTypeEntity } from './entities/ComplianceReportViewInterfaceTypeEntity.ts';

const REPORT_KEY = 'contrast:complianceReport';

class BlockedPairView {
  public readonly actual: number;
  public readonly background: string;
  public readonly foreground: string;
  public readonly required: number;

  public constructor(actual: number, background: string, foreground: string, required: number) {
    this.actual = actual;
    this.background = background;
    this.foreground = foreground;
    this.required = required;
  }

  public get id(): string {
    const result = `${this.foreground}/${this.background}`;
    return result;
  }
}

class AccessibilityBlockerSet {
  public readonly key: string;
  public readonly pairs: readonly BlockedPairView[];
  public readonly standardLabel: string;

  public constructor(pairs: readonly BlockedPairView[], standardLabel: string) {
    const ids = pairs.map((pair) => {
      return pair.id;
    }).sort((left, right) => {
      const order = left.localeCompare(right);
      return order;
    });
    this.key = ids.length === 0 ? '' : [standardLabel, ...ids].join('|');
    this.pairs = pairs;
    this.standardLabel = standardLabel;
  }

  public get compliant(): boolean {
    const result = this.pairs.length === 0;
    return result;
  }
}

interface AccessibilityToastMessageInterface {
  readonly 'description': string;
  readonly 'title': string;
}

/** Reads the engine compliance report from pipeline metadata into a toast-ready blocker set. */
export class AccessibilityBlockers {
  private static readonly standardLabels: ReadonlyMap<string, string> = new Map([
    ['apca:Lc', 'APCA Lc'],
    ['wcag21:AA', 'WCAG AA'],
    ['wcag21:AAA', 'WCAG AAA']
  ]);

  public static fromMetadata(metadata: Readonly<Record<string, unknown>>): AccessibilityBlockerSet {
    const report: unknown = metadata[REPORT_KEY];
    let result = new AccessibilityBlockerSet([], '');
    if (ComplianceReportViewInterfaceTypeEntity.validate(report)) {
      const { algorithm, level } = report.selected;
      const label = AccessibilityBlockers.standardLabels.get(`${algorithm}:${level}`) ?? `${algorithm} ${level}`;
      const pairs = report.blockedPairs.map((pair) => {
        return new BlockedPairView(pair.actual, pair.background, pair.foreground, pair.required);
      });
      result = new AccessibilityBlockerSet(pairs, label);
    }
    return result;
  }

  public static toastMessage(set: AccessibilityBlockerSet): AccessibilityToastMessageInterface {
    const lines = set.pairs.map((pair) => {
      return `${pair.foreground} on ${pair.background} needs ${pair.required.toFixed(2)}, reaches ${pair.actual.toFixed(2)}`;
    });
    const result: AccessibilityToastMessageInterface = {
      'description': lines.join('; '),
      'title': `Pinned roles cannot meet ${set.standardLabel}`
    };
    return result;
  }
}
