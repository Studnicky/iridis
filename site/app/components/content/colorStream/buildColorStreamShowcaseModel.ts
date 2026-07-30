import { DECORATIVE_ALIASES } from '~/composables/decorativeAliases.ts';
import { capitalize } from '~/utils/capitalize.ts';

import { drawColorStream } from './drawColorStream.ts';

class ColorStreamRoleSpec {
  public readonly alias: string;
  public readonly label: string;
  public readonly roleName: string;

  public constructor(alias: string, label: string, roleName: string) {
    this.alias = alias;
    this.label = label;
    this.roleName = roleName;
  }
}

export const buildColorStreamShowcaseModel = class ColorStreamShowcaseModel {
  /** Role display order for the seismograph stack, derived from decorativeAliases.ts's own alias/roleName pairing. */
  public static buildRoles(): readonly ColorStreamRoleSpec[] {
    const roles: ColorStreamRoleSpec[] = [];
    for (const [alias, roleName] of Object.entries(DECORATIVE_ALIASES)) {
      roles.push(new ColorStreamRoleSpec(alias, capitalize(alias), roleName));
    }
    return roles;
  }

  public static buildCanvasReferenceSetter(
    canvasElements: (HTMLCanvasElement | null)[],
    index: number
  ): (element: unknown) => void {
    return (element: unknown) => {
      canvasElements[index] = drawColorStream.resolveCanvasElement(element);
    };
  }
};
