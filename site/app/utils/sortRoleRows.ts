import type { RoleSortableRowType } from '../composables/types/roleSortableRow.ts';
import type { RoleSortFieldType } from '../composables/types/roleSortField.ts';
import type { RoleSortKeyType } from '../composables/types/roleSortKey.ts';

const COMPLIANCE_RANK: Record<string, number> = { 'AA': 1, 'AAA': 2, 'fail': 0 };

function compareRoleField(a: RoleSortableRowType, b: RoleSortableRowType, field: RoleSortFieldType): number {
  if (field === 'compliance') {return (COMPLIANCE_RANK[a.compliance] ?? 0) - (COMPLIANCE_RANK[b.compliance] ?? 0);}
  const av = a[field];
  const bv = b[field];
  if (typeof av === 'string' && typeof bv === 'string') {return av.localeCompare(bv);}
  return (av as number) - (bv as number);
}

/** Applies an ordered list of sort keys — first key wins, ties fall through to the next. */
export function sortRoleRows<T extends RoleSortableRowType>(rows: readonly T[], keys: readonly RoleSortKeyType[]): T[] {
  const result = [...rows].sort((a, b) => {
    for (const key of keys) {
      const cmp = compareRoleField(a, b, key.field) * (key.desc ? -1 : 1);
      if (cmp !== 0) {return cmp;}
    }
    return 0;
  });
  return result;
}
