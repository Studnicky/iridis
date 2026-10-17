import type { RoleViewType } from '~/composables/types/index.ts';

import { AliasColorEntity } from '~/theme/entities/AliasColorEntity.ts';

class InteractablesAccordionItem {
  public readonly content: string;
  public readonly label: string;

  public constructor(content: string, label: string) {
    this.content = content;
    this.label = label;
  }
}

class InteractablesTabItem {
  public readonly label: string;
  public readonly slot: string;

  public constructor(
    label: string,
    slot: string
  ) {
    this.label = label;
    this.slot = slot;
  }
}

class InteractablesShowcaseViewModel {
  public readonly accordionItems: InteractablesAccordionItem[];
  public readonly backgroundHex: string;
  public readonly complianceLabel: string;
  public readonly compliancePercent: number;

  public constructor(
    accordionItems: InteractablesAccordionItem[],
    backgroundHex: string,
    complianceLabel: string,
    compliancePercent: number
  ) {
    this.accordionItems = accordionItems;
    this.backgroundHex = backgroundHex;
    this.complianceLabel = complianceLabel;
    this.compliancePercent = compliancePercent;
  }
}

class InteractablesTabsViewModel {
  public readonly contrastText: string;
  public readonly overviewText: string;
  public readonly tabItems: readonly InteractablesTabItem[];
  public readonly visibleRoles: RoleViewType[];

  public constructor(
    contrastText: string,
    overviewText: string,
    tabItems: readonly InteractablesTabItem[],
    visibleRoles: RoleViewType[]
  ) {
    this.contrastText = contrastText;
    this.overviewText = overviewText;
    this.tabItems = tabItems;
    this.visibleRoles = visibleRoles;
  }
}

export const buildInteractablesShowcaseModel = class InteractablesShowcaseModelBuilder {
  private static readonly tabItems: readonly InteractablesTabItem[] = [
    new InteractablesTabItem('Overview', 'overview'),
    new InteractablesTabItem('Roles', 'rolesTab'),
    new InteractablesTabItem('Contrast', 'contrastTab')
  ];

  public static resolveDefaultCheckedColors(): AliasColorEntity.Type[] {
    const result = [
      AliasColorEntity.Values[0],
      AliasColorEntity.Values[2],
      AliasColorEntity.Values[4]
    ];
    return result;
  }

  public static build(
    strictness: number,
    rows: readonly { 'compliance': string }[],
    apcaPairCount: number,
    apcaPassingPairCount: number,
    resolvedRoleCount: number,
    backgroundHex: string
  ): InteractablesShowcaseViewModel {
    const complianceLabel = this.resolveComplianceLabel(strictness);
    const compliancePercent = this.resolveCompliancePercent(
      strictness,
      rows,
      apcaPairCount,
      apcaPassingPairCount
    );
    const accordionItems = this.buildAccordionItems(
      resolvedRoleCount,
      complianceLabel,
      compliancePercent,
      backgroundHex
    );
    const result = new InteractablesShowcaseViewModel(
      accordionItems,
      backgroundHex,
      complianceLabel,
      compliancePercent
    );
    return result;
  }

  public static buildTabs(
    roleViews: readonly RoleViewType[],
    backgroundHex: string,
    complianceLabel: string,
    compliancePercent: number
  ): InteractablesTabsViewModel {
    const result = new InteractablesTabsViewModel(
      `${compliancePercent}% of roles meet ${complianceLabel}.`,
      `${roleViews.length} roles resolved · background ${backgroundHex} · compliance target ${complianceLabel}.`,
      this.tabItems,
      roleViews.slice(0, 16)
    );
    return result;
  }

  private static buildAccordionItems(
    resolvedRoleCount: number,
    complianceLabel: string,
    compliancePercent: number,
    backgroundHex: string
  ): InteractablesAccordionItem[] {
    const result = [
      new InteractablesAccordionItem(`${resolvedRoleCount} roles currently resolved.`, 'Resolved roles'),
      new InteractablesAccordionItem(`${complianceLabel} — ${compliancePercent}% of roles passing.`, 'Compliance target'),
      new InteractablesAccordionItem(`Current background role hex: ${backgroundHex}.`, 'Background')
    ];
    return result;
  }

  private static resolveComplianceLabel(strictness: number): string {
    const label = ['AA', 'AAA', 'APCA'][strictness] ?? 'AA';
    return label;
  }

  private static resolveCompliancePercent(
    strictness: number,
    rows: readonly { 'compliance': string }[],
    apcaPairCount: number,
    apcaPassingPairCount: number
  ): number {
    if (strictness === 2) {
      if (apcaPairCount === 0) {
        return 0;
      }
      const percentage = Math.round((apcaPassingPairCount / apcaPairCount) * 100);
      return percentage;
    }
    if (rows.length === 0) {
      return 0;
    }
    let passing = 0;
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (row === undefined) {
        continue;
      }
      if (strictness === 1 ? row.compliance === 'AAA' : row.compliance !== 'fail') {
        passing++;
      }
    }
    const percentage = Math.round((passing / rows.length) * 100);
    return percentage;
  }
};
