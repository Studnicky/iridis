import type { ComplianceBlockedPairInterfaceTypeEntity } from '@studnicky/iridis-contrast';
import type { JSONSchema7Type } from 'json-schema';

import { ComplianceReportInterfaceTypeEntity } from '@studnicky/iridis-contrast';

class BlockedPairView {
  private static readonly reasonSuffixes: ReadonlyMap<ComplianceBlockedPairInterfaceTypeEntity.Type['reason'], string> = new Map([
    ['relation-tolerance', ' (relation tolerance)'],
    ['solver-exhausted', ' (search exhausted)'],
    ['stated-both', ' (both pinned)']
  ]);

  public readonly actual: number;
  public readonly background: string;
  public readonly foreground: string;
  public readonly required: number;
  public readonly suffix: string;

  public constructor(pair: ComplianceBlockedPairInterfaceTypeEntity.Type) {
    this.actual = pair.actualTrichromat;
    this.background = pair.background;
    this.foreground = pair.foreground;
    this.required = pair.requiredTrichromat;
    this.suffix = BlockedPairView.reasonSuffixes.get(pair.reason) ?? '';
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

/** Reads the engine compliance report into a toast-ready blocker set. */
export class AccessibilityBlockers {
  private static readonly standardLabels: ReadonlyMap<string, string> = new Map([
    ['apca:Lc', 'APCA Lc'],
    ['wcag21:AA', 'WCAG AA'],
    ['wcag21:AAA', 'WCAG AAA']
  ]);

  public static standardLabel(algorithm: string, level: string): string {
    const result = AccessibilityBlockers.standardLabels.get(`${algorithm}:${level}`) ?? `${algorithm} ${level}`;
    return result;
  }

  public static fromReport(report: JSONSchema7Type | undefined): AccessibilityBlockerSet {
    let result = new AccessibilityBlockerSet([], '');
    if (report !== undefined && ComplianceReportInterfaceTypeEntity.validate(report)) {
      const { algorithm, level } = report.selected;
      const label = AccessibilityBlockers.standardLabel(algorithm, level);
      const pairs = report.blockedPairs.map((pair) => {
        return new BlockedPairView(pair);
      });
      result = new AccessibilityBlockerSet(pairs, label);
    }
    return result;
  }

  public static toastMessage(set: AccessibilityBlockerSet): AccessibilityToastMessageInterface {
    const lines = set.pairs.map((pair) => {
      return `${pair.foreground} on ${pair.background} needs ${pair.required.toFixed(2)}, reaches ${pair.actual.toFixed(2)}${pair.suffix}`;
    });
    const result: AccessibilityToastMessageInterface = {
      'description': lines.join('; '),
      'title': `Pinned roles cannot meet ${set.standardLabel}`
    };
    return result;
  }
}
