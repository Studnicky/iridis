/**
 * applyConfigToDocument.ts
 *
 * iridis dogfoods iridis. Runs the engine against the global docs config and
 * writes the resolved roles as CSS custom properties on document.documentElement.
 * The vitepress base theme reads --vp-c-brand-1, --vp-c-brand-2, --vp-c-brand-3,
 * --vp-c-brand-soft, --vp-c-bg, --vp-c-bg-alt, --vp-c-text-1, --vp-c-text-2,
 * etc. — we override the brand and surface tokens from the engine output.
 *
 * Side-effect only. Idempotent on repeated calls. SSR-safe (early return
 * when window is undefined).
 */

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import type { ColorRecordInterface } from '@studnicky/iridis/model';

import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const PIPELINE: readonly string[] = [
  'intake:hex',
  'clamp:count',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
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

    const schema = roleSchemaByName[config.roleSchema] ?? roleSchemaByName['minimal'];
    const state = await engine.run({
      'colors':   config.seedColors,
      'roles':    schema,
      'contrast': {
        'level':     config.contrastLevel,
        'algorithm': config.contrastAlgorithm,
      },
      'runtime': {
        'framing':    config.framing,
        'colorSpace': config.colorSpace,
      },
    });

    const root = document.documentElement;
    const roles = state.roles;

    // Map resolved roles to vitepress brand tokens. We pick by intent /
    // common name across the supported role schemas.
    const accent     = pickRole(roles, ['accent', 'primary']);
    const background = pickRole(roles, ['canvas', 'background']);
    const surface    = pickRole(roles, ['surface', 'background', 'canvas']);
    const text       = pickRole(roles, ['text', 'onBackground', 'foreground']);
    const muted      = pickRole(roles, ['muted', 'secondary', 'border']);

    if (accent !== null) {
      root.style.setProperty('--vp-c-brand-1',    accent.hex);
      root.style.setProperty('--vp-c-brand-2',    accent.hex);
      root.style.setProperty('--vp-c-brand-3',    accent.hex);
      root.style.setProperty('--vp-c-brand-soft', hexToRgba(accent.hex, 0.14));
    }
    if (text       !== null) root.style.setProperty('--vp-c-text-1', text.hex);
    if (muted      !== null) root.style.setProperty('--vp-c-text-2', muted.hex);
    if (surface    !== null) root.style.setProperty('--vp-c-bg-soft', surface.hex);
    if (background !== null) {
      root.style.setProperty('--vp-c-bg',     background.hex);
      root.style.setProperty('--vp-c-bg-alt', surface?.hex ?? background.hex);
    }

    // Reflect the framing in the html data attribute so any framing-aware
    // CSS rules can branch off it.
    root.dataset['iridisFraming'] = config.framing;
  } catch {
    /* on failure, leave the existing palette.css tokens in place */
  }
}

function pickRole(
  roles: Readonly<Record<string, ColorRecordInterface>>,
  candidates: readonly string[],
): ColorRecordInterface | null {
  for (const name of candidates) {
    const role = roles[name];
    if (role) return role;
  }
  return null;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >>  8) & 0xff;
  const b =  n        & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
