import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export type RoleMathStatusModel = {
  readonly color: 'warning' | 'secondary' | 'info' | 'primary' | 'success';
  readonly label: 'Synthesized' | 'Derived' | 'Explicit Pin' | 'Clamped' | 'Direct Match';
};

export function buildRoleMathStatusModel(role: RoleMathEntryType): RoleMathStatusModel {
  if (role.synthesized) {
    return { color: 'warning', label: 'Synthesized' };
  }
  if (role.isDerived) {
    return { color: 'secondary', label: 'Derived' };
  }
  if (role.isPinned) {
    return { color: 'info', label: 'Explicit Pin' };
  }
  if (role.clamp) {
    return { color: 'primary', label: 'Clamped' };
  }
  return { color: 'success', label: 'Direct Match' };
}
