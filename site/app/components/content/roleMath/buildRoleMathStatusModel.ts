import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export const buildRoleMathStatusModel = class RoleMathStatusModel {
  public readonly color: 'warning' | 'secondary' | 'info' | 'primary' | 'success';
  public readonly label: 'Synthesized' | 'Derived' | 'Explicit Pin' | 'Clamped' | 'Direct Match';

  private constructor(
    color: 'warning' | 'secondary' | 'info' | 'primary' | 'success',
    label: 'Synthesized' | 'Derived' | 'Explicit Pin' | 'Clamped' | 'Direct Match'
  ) {
    this.color = color;
    this.label = label;
  }

  public static build(role: RoleMathEntryType): RoleMathStatusModel {
    if (role.synthesized) {
      return new RoleMathStatusModel('warning', 'Synthesized');
    }
    if (role.isDerived) {
      return new RoleMathStatusModel('secondary', 'Derived');
    }
    if (role.isPinned) {
      return new RoleMathStatusModel('info', 'Explicit Pin');
    }
    if (role.clamp !== null) {
      return new RoleMathStatusModel('primary', 'Clamped');
    }
    return new RoleMathStatusModel('success', 'Direct Match');
  }
};
