import type { CompliancePairEntity } from '@studnicky/iridis-contrast';
import type { JSONSchema7Type } from 'json-schema';

import { ComplianceReportEntity } from '@studnicky/iridis-contrast';

import { AccessibilityBlockerSetEntity } from './entities/AccessibilityBlockerSetEntity.ts';

interface AccessibilityToastMessageInterface {
  readonly 'description': string;
  readonly 'title': string;
}

/** Reads the engine compliance report into a toast-ready blocker set. */
export class AccessibilityBlockers {
  private static readonly constraintLabels: ReadonlyMap<CompliancePairEntity.Type['constraints'][number], string> = new Map([
    ['cvd-drop', 'colour-vision drop'],
    ['cvd-floor', 'colour-vision floor'],
    ['gamut', 'gamut'],
    ['hue-relationship', 'hue relationship'],
    ['pin', 'pinned'],
    ['range', 'role range']
  ]);

  private static readonly standardLabels: ReadonlyMap<string, string> = new Map([
    ['apca:Lc', 'APCA Lc'],
    ['wcag21:AA', 'WCAG AA'],
    ['wcag21:AAA', 'WCAG AAA']
  ]);

  public static standardLabel(algorithm: string, level: string): string {
    const result = AccessibilityBlockers.standardLabels.get(`${algorithm}:${level}`) ?? `${algorithm} ${level}`;
    return result;
  }

  public static fromReport(report: JSONSchema7Type | undefined): AccessibilityBlockerSetEntity.Type {
    let result = AccessibilityBlockers.setOf([], '', 'resolved');
    if (report !== undefined && ComplianceReportEntity.validate(report)) {
      const { algorithm, level } = report.selected;
      const pairs = report.problemPairs.map((pair) => {
        const blocked = AccessibilityBlockers.pairOf(pair);
        return blocked;
      });
      result = AccessibilityBlockers.setOf(pairs, AccessibilityBlockers.standardLabel(algorithm, level), report.disposition);
    }
    return result;
  }

  public static toastMessage(set: AccessibilityBlockerSetEntity.Type): AccessibilityToastMessageInterface {
    const lines = set.pairs.map((pair) => {
      return `${pair.foreground} on ${pair.background} needs ${pair.required.toFixed(2)}, reaches ${pair.actual.toFixed(2)}${pair.suffix}${pair.proofText}`;
    });
    const result: AccessibilityToastMessageInterface = {
      'description': lines.join('; '),
      'title': `Pinned roles cannot meet ${set.standardLabel}`
    };
    return result;
  }

  private static pairOf(pair: CompliancePairEntity.Type): AccessibilityBlockerSetEntity.Type['pairs'][number] {
    const labels = pair.constraints.map((constraint) => {
      const label = AccessibilityBlockers.constraintLabels.get(constraint) ?? constraint;
      return label;
    });
    const result = {
      'actual': pair.actual,
      'background': pair.background,
      'foreground': pair.foreground,
      'id': `${pair.foreground}/${pair.background}`,
      'proofText': AccessibilityBlockers.proofText(pair.proof),
      'required': pair.required,
      'suffix': labels.length === 0 ? '' : ` (${labels.join(', ')})`
    };
    return result;
  }

  private static proofText(proof: CompliancePairEntity.Type['proof']): string {
    let result = '';
    if (proof !== undefined) {
      const bounds = proof.limitingBounds.map((bound) => {
        return `${bound.role} ${bound.channel} ${bound.edge} ${bound.value.toFixed(2)}`;
      });
      const limits = bounds.length === 0 ? '' : `, limited by ${bounds.join(', ')}`;
      result = `; best reachable ${proof.bestActual.toFixed(2)}${limits}`;
    }
    return result;
  }

  private static setOf(
    pairs: readonly AccessibilityBlockerSetEntity.Type['pairs'][number][],
    standardLabel: string,
    disposition: string
  ): AccessibilityBlockerSetEntity.Type {
    const ids = pairs.map((pair) => {
      return pair.id;
    }).sort((left, right) => {
      const order = left.localeCompare(right);
      return order;
    });
    const result = AccessibilityBlockerSetEntity.create({
      'compliant': pairs.length === 0,
      'key': ids.length === 0 ? '' : [standardLabel, ...ids].join('|'),
      'pairs': [...pairs],
      'standardLabel': standardLabel,
      'withheld': disposition === 'withheld'
    });
    return result;
  }
}
