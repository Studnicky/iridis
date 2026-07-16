import type { RoleViewType } from '~/composables/types/index.ts';
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

export type InteractablesAccordionItem = {
  label: string;
  content: string;
};

export type InteractablesTabItem = {
  readonly label: 'Overview' | 'Roles' | 'Contrast';
  readonly slot: 'overview' | 'rolesTab' | 'contrastTab';
};

export type InteractablesShowcaseViewModel = {
  readonly backgroundHex: string;
  readonly complianceLabel: string;
  readonly compliancePercent: number;
  readonly accordionItems: readonly InteractablesAccordionItem[];
};

export type InteractablesTabsViewModel = {
  readonly contrastText: string;
  readonly overviewText: string;
  readonly tabItems: readonly InteractablesTabItem[];
  readonly visibleRoles: readonly RoleViewType[];
};

const INTERACTABLES_TAB_ITEMS: readonly InteractablesTabItem[] = [
  { label: 'Overview', slot: 'overview' },
  { label: 'Roles', slot: 'rolesTab' },
  { label: 'Contrast', slot: 'contrastTab' }
];

export function defaultCheckedColors(): AliasColorType[] {
  return ['primary', 'success', 'error'];
}

export function complianceLabelFor(strictness: number): string {
  return ['AA', 'AAA', 'APCA'][strictness] ?? 'AA';
}

export function compliancePercentFor(
  strictness: number,
  rows: readonly { compliance: string }[],
  apcaPairs: readonly { pass: boolean }[]
): number {
  if (strictness === 2) {
    if (apcaPairs.length === 0) return 0;
    const passing = apcaPairs.filter((pair) => pair.pass).length;
    return Math.round((passing / apcaPairs.length) * 100);
  }
  if (rows.length === 0) return 0;
  const passing = rows.filter((row) => strictness === 1 ? row.compliance === 'AAA' : row.compliance !== 'fail').length;
  return Math.round((passing / rows.length) * 100);
}

export function buildInteractablesAccordionItems(
  resolvedRoleCount: number,
  complianceLabel: string,
  compliancePercent: number,
  backgroundHex: string
): InteractablesAccordionItem[] {
  return [
    { 'label': 'Resolved roles', 'content': `${resolvedRoleCount} roles currently resolved.` },
    { 'label': 'Compliance target', 'content': `${complianceLabel} — ${compliancePercent}% of roles passing.` },
    { 'label': 'Background', 'content': `Current background role hex: ${backgroundHex}.` }
  ];
}

export function buildInteractablesShowcaseViewModel(
  strictness: number,
  rows: readonly { compliance: string }[],
  apcaPairs: readonly { pass: boolean }[],
  resolvedRoleCount: number,
  backgroundHex: string
): InteractablesShowcaseViewModel {
  const complianceLabel = complianceLabelFor(strictness);
  const compliancePercent = compliancePercentFor(strictness, rows, apcaPairs);
  return {
    backgroundHex,
    complianceLabel,
    compliancePercent,
    'accordionItems': buildInteractablesAccordionItems(
      resolvedRoleCount,
      complianceLabel,
      compliancePercent,
      backgroundHex
    )
  };
}

export function buildInteractablesTabsViewModel(
  roleViews: readonly RoleViewType[],
  backgroundHex: string,
  complianceLabel: string,
  compliancePercent: number
): InteractablesTabsViewModel {
  return {
    contrastText: `${compliancePercent}% of roles meet ${complianceLabel}.`,
    overviewText: `${roleViews.length} roles resolved · background ${backgroundHex} · compliance target ${complianceLabel}.`,
    tabItems: INTERACTABLES_TAB_ITEMS,
    visibleRoles: roleViews.slice(0, 16)
  };
}
