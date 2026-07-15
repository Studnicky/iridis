import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import { computed } from 'vue';

import type { ContrastPairingType } from './types/contrastPairing.ts';
import type { RoleViewType } from './types/index.ts';

import { contrastRatio } from '../theme/ContrastRatio.ts';
import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { complianceFor } from '../utils/complianceFor.ts';
import { minRatioForRole } from '../utils/minRatioForRole.ts';
import { useIridis } from './useIridis.ts';

/** Highest-contrast role in `candidates` against `bg`, by live WCAG ratio. */
function bestForegroundAgainst(bg: RoleViewType, candidates: readonly RoleViewType[]): { 'ratio': number; 'view': RoleViewType } {
  let best = candidates[0]!;
  let bestRatio = contrastRatio(best.hex, bg.hex);
  for (const c of candidates.slice(1)) {
    const ratio = contrastRatio(c.hex, bg.hex);
    if (ratio > bestRatio) { best = c; bestRatio = ratio; }
  }
  return { 'ratio': bestRatio, 'view': best };
}

function labelFor(ratio: number, schema: RoleSchemaInterfaceType | undefined, roleName: string): string {
  const compliance = complianceFor(ratio, minRatioForRole(schema, roleName));
  const suffix = compliance === 'fail' ? 'decorative only' : `${compliance} pass`;
  return `${ratio.toFixed(1)}:1 — ${suffix}`;
}

/**
 * Three sample text/background pairings drawn from the currently resolved
 * roles: the highest-contrast light-on-dark pair, its dark-on-light inverse,
 * and a deliberately lower-contrast pair (highest ratio still under the AA
 * threshold) — so a non-technical viewer sees how the palette reads as real
 * UI, not just a list of hex codes. Reactive off the same roleViews every
 * other derived view in useIridis.ts reads.
 */
export function usePairingPreview() {
  const { 'framing': framing, 'roleViews': roleViews, 'schemaName': schemaName } = useIridis();

  const pairings = computed<ContrastPairingType[]>(() => {
    const views = roleViews.value;
    if (views.length < 2) {return [];}

    const schema = roleSchemaByName[schemaName.value]?.[framing.value];

    const byLightness = [...views].sort((a, b) => {return a.l - b.l;});
    const darkest = byLightness[0]!;
    const lightest = byLightness[byLightness.length - 1]!;

    const lightOnDark = bestForegroundAgainst(darkest, views.filter((v) => {return v.name !== darkest.name;}));
    const darkOnLight = bestForegroundAgainst(lightest, views.filter((v) => {return v.name !== lightest.name;}));

    /* Lower-contrast sample: the highest ratio still under the AA threshold
     * across every role pair, so it's legible-ish rather than illegibly low. */
    let lowContrast: { 'bg': RoleViewType; 'fg': RoleViewType; 'ratio': number } | undefined;
    let dimmest: { 'bg': RoleViewType; 'fg': RoleViewType; 'ratio': number } | undefined;
    for (const bg of views) {
      for (const fg of views) {
        if (bg.name === fg.name) {continue;}
        const ratio = contrastRatio(fg.hex, bg.hex);
        if (ratio < 4.5 && (lowContrast === undefined || ratio > lowContrast.ratio)) {
          lowContrast = { 'bg': bg, 'fg': fg, 'ratio': ratio };
        }
        if (dimmest === undefined || ratio < dimmest.ratio) {
          dimmest = { 'bg': bg, 'fg': fg, 'ratio': ratio };
        }
      }
    }
    const low = lowContrast ?? dimmest;

    const result: ContrastPairingType[] = [
      {
        'background': darkest,
        'complianceLabel': labelFor(lightOnDark.ratio, schema, lightOnDark.view.name),
        'foreground': lightOnDark.view,
        'key': 'lightOnDark',
        'label': 'Light on dark',
        'ratio': lightOnDark.ratio
      },
      {
        'background': lightest,
        'complianceLabel': labelFor(darkOnLight.ratio, schema, darkOnLight.view.name),
        'foreground': darkOnLight.view,
        'key': 'darkOnLight',
        'label': 'Dark on light',
        'ratio': darkOnLight.ratio
      }
    ];
    if (low !== undefined) {
      result.push({
        'background': low.bg,
        'complianceLabel': labelFor(low.ratio, schema, low.fg.name),
        'foreground': low.fg,
        'key': 'lowContrast',
        'label': 'Lower contrast',
        'ratio': low.ratio
      });
    }
    return result;
  });

  return { 'pairings': pairings };
}
