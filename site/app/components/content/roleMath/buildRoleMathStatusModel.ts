import type { BadgeProps } from '@nuxt/ui/components/Badge.vue';

import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

abstract class RoleMathStatusPresentation {
  public abstract badgeColor(): NonNullable<BadgeProps['color']>;

  public abstract badgeLabel(): string;
}

class RoleMathSynthesizedStatusPresentation extends RoleMathStatusPresentation {
  public badgeColor(): NonNullable<BadgeProps['color']> {
    return 'warning';
  }

  public badgeLabel(): string {
    return 'Synthesized';
  }
}

class RoleMathDerivedStatusPresentation extends RoleMathStatusPresentation {
  public badgeColor(): NonNullable<BadgeProps['color']> {
    return 'secondary';
  }

  public badgeLabel(): string {
    return 'Derived';
  }
}

class RoleMathPinnedStatusPresentation extends RoleMathStatusPresentation {
  public badgeColor(): NonNullable<BadgeProps['color']> {
    return 'info';
  }

  public badgeLabel(): string {
    return 'Explicit Pin';
  }
}

class RoleMathClampedStatusPresentation extends RoleMathStatusPresentation {
  public badgeColor(): NonNullable<BadgeProps['color']> {
    return 'primary';
  }

  public badgeLabel(): string {
    return 'Clamped';
  }
}

class RoleMathDirectMatchStatusPresentation extends RoleMathStatusPresentation {
  public badgeColor(): NonNullable<BadgeProps['color']> {
    return 'success';
  }

  public badgeLabel(): string {
    return 'Direct Match';
  }
}

export const buildRoleMathStatusModel = class RoleMathStatusModel {
  public readonly presentation: RoleMathStatusPresentation;

  private constructor(presentation: RoleMathStatusPresentation) {
    this.presentation = presentation;
  }

  public static build(role: RoleMathEntry): RoleMathStatusModel {
    if (role.origin.isSynthesized()) {
      return new RoleMathStatusModel(new RoleMathSynthesizedStatusPresentation());
    }
    if (role.origin.isDerived()) {
      return new RoleMathStatusModel(new RoleMathDerivedStatusPresentation());
    }
    if (role.origin.isPinned()) {
      return new RoleMathStatusModel(new RoleMathPinnedStatusPresentation());
    }
    if (role.clamp !== null) {
      return new RoleMathStatusModel(new RoleMathClampedStatusPresentation());
    }
    return new RoleMathStatusModel(new RoleMathDirectMatchStatusPresentation());
  }
};
