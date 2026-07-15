import type { RoleSortFieldType } from '../composables/types/roleSortField.ts';

import { ROLE_SORT_FIELD_OPTIONS } from './roleSortFieldOptions.ts';

export function roleSortFieldLabel(field: RoleSortFieldType): string {
  return ROLE_SORT_FIELD_OPTIONS.find((o) => {return o.value === field;})?.label ?? field;
}
