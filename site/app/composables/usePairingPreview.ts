import { computed } from 'vue';

import type { RoleViewType } from './types/index.ts';

import { contrastRatio } from '../theme/ContrastRatio.ts';
import { complianceFor } from '../utils/roleSort.ts';
import { useIridis } from './useIridis.ts';

export interface PairingSwatchType {
  readonly hex: string;
  readonly name: string;
}

export interface ContrastPairingType {
  readonly background: PairingSwatchType;
  readonly complianceLabel: string;
  readonly foreground: PairingSwatchType;
  readonly key: 'darkOnLight' | 'lightOnDark' | 'lowContrast';
  readonly label: string;
  readonly ratio: number;
}

/** Highest-contrast role in `candidates` against `bg`, by live WCAG ratio. */
function bestForegroundAgainst(bg: RoleViewType, candidates: readonly RoleViewType[]): { ratio: number; view: RoleViewType } {
  let best = candidates[0]!;
  let bestRatio = contrastRatio(best.hex, bg.hex);
  for (const c of candidates.slice(1)) {
    const ratio = contrastRatio(c.hex, bg.hex);
    if (ratio > bestRatio) { best = c; bestRatio = ratio; }
  }
  return { 'ratio': bestRatio, 'view': best };
}

function labelFor(ratio: number): string {
  const compliance = complianceFor(ratio);
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
  const { 'roleViews': roleViews } = useIridis();

  const pairings = computed<ContrastPairingType[]>(() => {
    const views = roleViews.value;
    if (views.length < 2) {return [];}

    const byLightness = [...views].sort((a, b) => {return a.l - b.l;});
    const darkest = byLightness[0]!;
    const lightest = byLightness[byLightness.length - 1]!;

    const lightOnDark = bestForegroundAgainst(darkest, views.filter((v) => {return v.name !== darkest.name;}));
    const darkOnLight = bestForegroundAgainst(lightest, views.filter((v) => {return v.name !== lightest.name;}));

    /* Lower-contrast sample: the highest ratio still under the AA threshold
     * across every role pair, so it's legible-ish rather than illegibly low. */
    let lowContrast: { bg: RoleViewType; fg: RoleViewType; ratio: number } | undefined;
    let dimmest: { bg: RoleViewType; fg: RoleViewType; ratio: number } | undefined;
    for (const bg of views) {
      for (const fg of views) {
        if (bg.name === fg.name) {continue;}
        const ratio = contrastRatio(fg.hex, bg.hex);
        if (ratio < 4.5 && (lowContrast === undefined || ratio > lowContrast.ratio)) {
          lowContrast = { bg, fg, ratio };
        }
        if (dimmest === undefined || ratio < dimmest.ratio) {
          dimmest = { bg, fg, ratio };
        }
      }
    }
    const low = lowContrast ?? dimmest;

    const result: ContrastPairingType[] = [
      {
        'background': { 'hex': darkest.hex, 'name': darkest.name },
        'complianceLabel': labelFor(lightOnDark.ratio),
        'foreground': { 'hex': lightOnDark.view.hex, 'name': lightOnDark.view.name },
        'key': 'lightOnDark',
        'label': 'Light on dark',
        'ratio': lightOnDark.ratio
      },
      {
        'background': { 'hex': lightest.hex, 'name': lightest.name },
        'complianceLabel': labelFor(darkOnLight.ratio),
        'foreground': { 'hex': darkOnLight.view.hex, 'name': darkOnLight.view.name },
        'key': 'darkOnLight',
        'label': 'Dark on light',
        'ratio': darkOnLight.ratio
      }
    ];
    if (low !== undefined) {
      result.push({
        'background': { 'hex': low.bg.hex, 'name': low.bg.name },
        'complianceLabel': labelFor(low.ratio),
        'foreground': { 'hex': low.fg.hex, 'name': low.fg.name },
        'key': 'lowContrast',
        'label': 'Lower contrast',
        'ratio': low.ratio
      });
    }
    return result;
  });

  return { pairings };
}
