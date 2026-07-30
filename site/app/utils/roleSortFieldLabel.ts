import type { RoleSortFieldType } from '../composables/types/roleSortField.ts';

import { ROLE_SORT_FIELD_OPTIONS } from './roleSortFieldOptions.ts';

class RoleSortFieldLabelOperation {
  static run(field: RoleSortFieldType.Type): string {
    return ROLE_SORT_FIELD_OPTIONS.find((o) => {return o.value === field;})?.label ?? field;
  }
}

export const roleSortFieldLabel = RoleSortFieldLabelOperation.run;
