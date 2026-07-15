import type { RoleSortFieldType } from '../composables/types/roleSortField.ts';

export const ROLE_SORT_FIELD_OPTIONS: { 'label': string; 'value': RoleSortFieldType }[] = [
  { 'label': 'Role name', 'value': 'name' },
  { 'label': 'Lightness', 'value': 'l' },
  { 'label': 'Chroma', 'value': 'c' },
  { 'label': 'Hue', 'value': 'h' },
  { 'label': 'Ratio', 'value': 'ratio' },
  { 'label': 'Compliance', 'value': 'compliance' }
];
