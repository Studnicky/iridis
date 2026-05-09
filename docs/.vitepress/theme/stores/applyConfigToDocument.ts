/**
 * applyConfigToDocument.ts
 *
 * iridis dogfoods iridis. Runs the engine against the docs-theme role schema
 * (selected by configStore.framing) and writes every visible chrome token
 * onto document.documentElement as a CSS custom property.
 *
 * The docs-theme schema declares tight per-role lightnessRange and chromaRange
 * constraints; the engine's required-role nudging guarantees every assigned
 * color falls inside its declared envelope. The result: a framing-appropriate,
 * readable theme regardless of what the user picks for seeds. Pattern adapted
 * from vscode-arcade-blaster's paletteClamp.ts.
 *
 * Side-effect only. SSR-safe (early return when window is undefined).
 */

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import type { ColorRecordInterface } from '@studnicky/iridis/model';

import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';
import { docsThemeSchemaFor } from '../schemas/docsThemeSchema.ts';

const PIPELINE: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'expand:family',
];

export async function applyConfigToDocument(config: DocsConfigType): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    const engine = new Engine();
    for (const m of mathBuiltins) engine.math.register(m);
    for (const t of coreTasks)    engine.tasks.register(t);
    engine.pipeline(PIPELINE);

    const schema = docsThemeSchemaFor(config.framing);
    const state = await engine.run({
      'colors':  config.seedColors,
      'roles':   schema,
      'runtime': {
        'framing':    config.framing,
        'colorSpace': config.colorSpace,
      },
    });

    const r          = state.roles;
    const background = r['background']!;
    const surface    = r['surface']!;
    const bgSoft     = r['bgSoft']!;
    const divider    = r['divider']!;
    const muted      = r['muted']!;
    const text       = r['text']!;
    const brand      = r['brand']!;
    const onBrand    = r['onBrand']!;

    const root = document.documentElement;
    root.style.setProperty('--vp-c-bg',         background.hex);
    root.style.setProperty('--vp-c-bg-alt',     surface.hex);
    root.style.setProperty('--vp-c-bg-elv',     surface.hex);
    root.style.setProperty('--vp-c-bg-soft',    bgSoft.hex);

    root.style.setProperty('--vp-c-divider',    divider.hex);
    root.style.setProperty('--vp-c-border',     divider.hex);
    root.style.setProperty('--vp-c-gutter',     divider.hex);

    root.style.setProperty('--vp-c-text-1',     text.hex);
    root.style.setProperty('--vp-c-text-2',     muted.hex);
    root.style.setProperty('--vp-c-text-3',     muted.hex);

    root.style.setProperty('--vp-c-brand-1',    brand.hex);
    root.style.setProperty('--vp-c-brand-2',    brand.hex);
    root.style.setProperty('--vp-c-brand-3',    brand.hex);
    root.style.setProperty('--vp-c-brand-soft', hexToRgba(brand.hex, 0.16));

    root.style.setProperty('--vp-button-brand-bg',   brand.hex);
    root.style.setProperty('--vp-button-brand-text', onBrand.hex);
    root.style.setProperty('--vp-button-brand-border', brand.hex);
    root.style.setProperty('--vp-button-brand-hover-bg',   shadeHex(brand.hex, 0.06, config.framing));
    root.style.setProperty('--vp-button-brand-hover-text', onBrand.hex);
    root.style.setProperty('--vp-button-brand-hover-border', shadeHex(brand.hex, 0.06, config.framing));

    root.style.setProperty('--vp-button-alt-bg',   surface.hex);
    root.style.setProperty('--vp-button-alt-text', text.hex);
    root.style.setProperty('--vp-button-alt-border', divider.hex);
    root.style.setProperty('--vp-button-alt-hover-bg',   bgSoft.hex);
    root.style.setProperty('--vp-button-alt-hover-text', text.hex);
    root.style.setProperty('--vp-button-alt-hover-border', divider.hex);

    root.dataset['iridisFraming'] = config.framing;
    void unused(state);
  } catch {
    /* on failure, leave the existing palette.css tokens in place */
  }
}

function unused<T>(_value: T): void { /* swallow unused-binding lint */ }

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >>  8) & 0xff;
  const b =  n        & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Shift a hex color toward black (dark framing) or white (light framing) by
 * a small amount for hover states. Pure linear blend on sRGB — adequate for
 * a 6% lift, no perceptual nuance required.
 */
function shadeHex(hex: string, amount: number, framing: 'dark' | 'light'): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >>  8) & 0xff;
  const b =  n        & 0xff;
  const target = framing === 'dark' ? 255 : 0;
  const mix = (channel: number): number => Math.round(channel + (target - channel) * amount);
  const toHex = (v: number): string => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function debugColorRecord(c: ColorRecordInterface | undefined): string {
  if (!c) return 'undefined';
  return `${c.hex} (l=${c.oklch.l.toFixed(3)} c=${c.oklch.c.toFixed(3)} h=${Math.round(c.oklch.h)})`;
}
