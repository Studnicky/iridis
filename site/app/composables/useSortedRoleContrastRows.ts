import * as VueModule from 'vue';

import { sortRoleRows } from '../utils/sortRoleRows.ts';
import { useIridis } from './useIridis.ts';
import { useRoleSortBehaviors } from './useRoleSortBehaviors.ts';

/** The resolved role rows ordered by the shared role-sort keys. */
class UseSortedRoleContrastRowsOperation {
  static run() {
    const { roleContrastRows } = useIridis();
    const { roleSortBehaviors } = useRoleSortBehaviors();
    const sortedRoleContrastRows = VueModule.computed(() => {
      const result = sortRoleRows(roleContrastRows.value, roleSortBehaviors.value);
      return result;
    });
    return { 'sortedRoleContrastRows': sortedRoleContrastRows };
  }
}

export const useSortedRoleContrastRows = UseSortedRoleContrastRowsOperation.run;
