import * as VueModule from 'vue';

import { roleSortBehaviorsFor } from '../utils/roleSortBehaviorsFor.ts';
import { usePresentationControls } from './usePresentationControls.ts';

/** Comparator behaviors for the shared role-sort keys held by the presentation store. */
class UseRoleSortBehaviorsOperation {
  static run() {
    const { readModel } = usePresentationControls();
    const roleSortBehaviors = VueModule.computed(() => {
      const result = roleSortBehaviorsFor(readModel.value.roleSortKeys);
      return result;
    });
    return { 'roleSortBehaviors': roleSortBehaviors };
  }
}

export const useRoleSortBehaviors = UseRoleSortBehaviorsOperation.run;
