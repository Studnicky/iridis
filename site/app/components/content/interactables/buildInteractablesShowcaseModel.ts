import type { RoleViewType } from '~/composables/types/index.ts';
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

class InteractablesAccordionItem {
  public readonly content: string;
  public readonly label: string;

  public constructor(content: string, label: string) {
    this.content = content;
    this.label = label;
  }
}

class InteractablesTabItem {
  public readonly label: 'Overview' | 'Roles' | 'Contrast';
  public readonly slot: 'overview' | 'rolesTab' | 'contrastTab';

  public constructor(
    label: 'Overview' | 'Roles' | 'Contrast',
    slot: 'overview' | 'rolesTab' | 'contrastTab'
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

  public static resolveDefaultCheckedColors(): AliasColorType.Type[] {
    return ['primary', 'success', 'error'];
  }

  public static build(
    strictness: number,
    rows: readonly { 'compliance': string }[],
    apcaPairs: readonly { 'pass': boolean }[],
    resolvedRoleCount: number,
    backgroundHex: string
  ): InteractablesShowcaseViewModel {
    const complianceLabel = this.resolveComplianceLabel(strictness);
    const compliancePercent = this.resolveCompliancePercent(strictness, rows, apcaPairs);
    const accordionItems = this.buildAccordionItems(
      resolvedRoleCount,
      complianceLabel,
      compliancePercent,
      backgroundHex
    );
    return new InteractablesShowcaseViewModel(
      accordionItems,
      backgroundHex,
      complianceLabel,
      compliancePercent
    );
  }

  public static buildTabs(
    roleViews: readonly RoleViewType[],
    backgroundHex: string,
    complianceLabel: string,
    compliancePercent: number
  ): InteractablesTabsViewModel {
    return new InteractablesTabsViewModel(
      `${compliancePercent}% of roles meet ${complianceLabel}.`,
      `${roleViews.length} roles resolved · background ${backgroundHex} · compliance target ${complianceLabel}.`,
      this.tabItems,
      roleViews.slice(0, 16)
    );
  }

  private static buildAccordionItems(
    resolvedRoleCount: number,
    complianceLabel: string,
    compliancePercent: number,
    backgroundHex: string
  ): InteractablesAccordionItem[] {
    return [
      new InteractablesAccordionItem(`${resolvedRoleCount} roles currently resolved.`, 'Resolved roles'),
      new InteractablesAccordionItem(`${complianceLabel} — ${compliancePercent}% of roles passing.`, 'Compliance target'),
      new InteractablesAccordionItem(`Current background role hex: ${backgroundHex}.`, 'Background')
    ];
  }

  private static resolveComplianceLabel(strictness: number): string {
    return ['AA', 'AAA', 'APCA'][strictness] ?? 'AA';
  }

  private static resolveCompliancePercent(
    strictness: number,
    rows: readonly { 'compliance': string }[],
    apcaPairs: readonly { 'pass': boolean }[]
  ): number {
    if (strictness === 2) {
      if (apcaPairs.length === 0) {
        return 0;
      }
      let passing = 0;
      for (const pair of apcaPairs) {
        if (pair.pass) {
          passing++;
        }
      }
      return Math.round((passing / apcaPairs.length) * 100);
    }
    if (rows.length === 0) {
      return 0;
    }
    let passing = 0;
    for (const row of rows) {
      if (strictness === 1 ? row.compliance === 'AAA' : row.compliance !== 'fail') {
        passing++;
      }
    }
    return Math.round((passing / rows.length) * 100);
  }
};
