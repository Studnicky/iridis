import { DECORATIVE_ALIASES } from '~/composables/decorativeAliases.ts';
import { capitalize } from '~/utils/capitalize.ts';

import { asCanvasElement } from './drawColorStream.ts';

export type ColorStreamRoleSpecType = {
  alias: string;
  label: string;
  roleName: string;
};

/** Role display order for the seismograph stack, derived from decorativeAliases.ts's own alias/roleName pairing. */
export const COLOR_STREAM_ROLE_SPECS: readonly ColorStreamRoleSpecType[] = Object.entries(DECORATIVE_ALIASES).map(([alias, roleName]) => ({
  alias,
  label: capitalize(alias),
  roleName
}));

export function createCanvasRefSetter(
  refs: (HTMLCanvasElement | null)[],
  index: number
): (el: unknown) => void {
  return (el: unknown) => {
    refs[index] = asCanvasElement(el);
  };
}
