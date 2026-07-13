export type RoleSortField = 'name' | 'l' | 'c' | 'h' | 'ratio' | 'compliance';

export type RoleSortKeyType = { field: RoleSortField; desc: boolean };

export const ROLE_SORT_FIELD_OPTIONS: { label: string; value: RoleSortField }[] = [
  { 'label': 'Role name', 'value': 'name' },
  { 'label': 'Lightness', 'value': 'l' },
  { 'label': 'Chroma', 'value': 'c' },
  { 'label': 'Hue', 'value': 'h' },
  { 'label': 'Ratio', 'value': 'ratio' },
  { 'label': 'Compliance', 'value': 'compliance' }
];

export function roleSortFieldLabel(field: RoleSortField): string {
  return ROLE_SORT_FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field;
}

const COMPLIANCE_RANK: Record<string, number> = { 'AAA': 2, 'AA': 1, 'fail': 0 };

/** Every role listing site-wide (Roles table, Resolved roles, Clamps) sorts
 * against this same shape/comparator so "sort by ratio" means the same thing
 * everywhere, not a per-card reimplementation that could quietly drift. */
export interface RoleSortableRowType {
  name: string;
  l: number;
  c: number;
  h: number;
  ratio: number;
  compliance: string;
}

function compareRoleField(a: RoleSortableRowType, b: RoleSortableRowType, field: RoleSortField): number {
  if (field === 'compliance') return (COMPLIANCE_RANK[a.compliance] ?? 0) - (COMPLIANCE_RANK[b.compliance] ?? 0);
  const av = a[field];
  const bv = b[field];
  if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
  return (av as number) - (bv as number);
}

/** Applies an ordered list of sort keys — first key wins, ties fall through to the next. */
export function sortRoleRows<T extends RoleSortableRowType>(rows: readonly T[], keys: readonly RoleSortKeyType[]): T[] {
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const cmp = compareRoleField(a, b, key.field) * (key.desc ? -1 : 1);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

export function complianceFor(ratio: number): string {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail';
}
