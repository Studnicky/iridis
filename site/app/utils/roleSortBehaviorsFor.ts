import type { PresentationRoleSortKeyEntity } from '../composables/presentationControls/entities/PresentationRoleSortKeyEntity.ts';
import type { RoleSortFieldBehaviorInterface } from './roleSortFieldBehaviorInterface.ts';
import type { RoleSortFieldComparatorInterface } from './roleSortFieldComparatorInterface.ts';

import { RoleSortBehavior } from './roleSortBehavior.ts';
import { ROLE_SORT_FIELD_OPTIONS } from './roleSortFieldOptions.ts';

const comparatorsByField = new Map<string, RoleSortFieldComparatorInterface>(
  ROLE_SORT_FIELD_OPTIONS.map((option) => {
    const entry: [string, RoleSortFieldComparatorInterface] = [option.key, option.value];
    return entry;
  })
);

/** Resolves the stored sort keys into comparator behaviors, in priority order. */
class RoleSortBehaviorsForOperation {
  static run(keys: readonly PresentationRoleSortKeyEntity.Type[]): RoleSortFieldBehaviorInterface[] {
    const result = keys.map((key) => {
      const comparator = comparatorsByField.get(key.field);
      if (comparator === undefined) {
        throw new RangeError(`Role sort field "${key.field}" has no comparator`);
      }
      const behavior = key.direction === 'ascending' ? RoleSortBehavior.ascending(comparator) : RoleSortBehavior.descending(comparator);
      return behavior;
    });
    return result;
  }
}

export const roleSortBehaviorsFor = RoleSortBehaviorsForOperation.run;
