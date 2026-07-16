import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';
import type { ColorSampleType } from '~/composables/types/colorSample.ts';

export const EASE_PRESETS: Record<string, string> = {
  Bouncy: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  'Ease in/out': 'ease-in-out',
  Linear: 'linear',
  'Smooth (default)': 'cubic-bezier(0.33, 0, 0.2, 1)',
  Snappy: 'cubic-bezier(0.16, 1, 0.3, 1)'
};

/** The decorative aliases whose engine-computed current hex we show live below. */
export const LIVE_ROLES: readonly string[] = ALIAS_COLOR_NAMES.filter((alias) => alias !== 'neutral');

export type LiveMotionSwatchType = {
  role: string;
  hex: string;
};

export type NamedAnimationType = {
  kind: 'dot' | 'orbit' | 'sonar' | 'radar' | 'chroma';
  class?: string;
  duration: string;
  label: string;
  note: string;
};

/** `kind: 'dot'` swatches share one template; everything else renders bespoke markup. */
export const NAMED_ANIMATIONS: readonly NamedAnimationType[] = [
  { kind: 'dot', class: 'pulse', duration: '3s', label: 'pulse-glow', note: 'carousel arrows, active dot' },
  { kind: 'dot', class: 'float', duration: '7s', label: 'float', note: 'hero logo, floating orbs' },
  { kind: 'dot', class: 'spin-slow', duration: '26s', label: 'spin', note: 'ambient background accent' },
  { kind: 'dot', class: 'glass', duration: '4s', label: 'sheen', note: 'every glass panel’s top edge' },
  { kind: 'orbit', duration: '2.2-3.8s', label: 'orbit', note: 'three roles, three independent rings' },
  { kind: 'sonar', duration: '2.4s', label: 'sonar', note: 'success/warning/error/primary in sequence' },
  { kind: 'radar', duration: '2.6s', label: 'radar', note: 'primary bleeding into secondary, one sweep' },
  { kind: 'chroma', duration: '4s', label: 'chroma', note: 'the accent hue cycling the full wheel' }
];

export function buildLiveMotionSwatches(
  colorStreamHistory: Record<string, readonly ColorSampleType[] | undefined>
): LiveMotionSwatchType[] {
  return LIVE_ROLES.map((role) => {
    const samples = colorStreamHistory[role];
    const last = samples?.[samples.length - 1];
    return { role, hex: last?.hex ?? `var(--ui-color-${role}-500)` };
  });
}
