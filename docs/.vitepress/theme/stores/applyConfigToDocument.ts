/**
 * Projector that turns docs config into live CSS variables. Picks the
 * `{dark, light}` variant of the active schema matching the current
 * framing, runs the iridis engine, and writes one `--iridis-{role}`
 * custom property per resolved role onto `document.documentElement`.
 *
 *   active schema + framing → engine.run → state.roles → --iridis-{role}
 *
 * No alias chains, no JS-side hue rotation, no static fallbacks — if a
 * role isn't in the schema it isn't in the cascade, and that sparseness
 * is the demonstration of what the user's chosen schema produces.
 *
 * Previously-written `--iridis-*` properties are cleared before each
 * run so a 16→4 schema switch doesn't leave 12 phantom variables
 * cascading. SSR-safe: early-returns when `window`/`document` are
 * undefined.
 */

import { Engine, coreTasks } from '@studnicky/iridis';

import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const PIPELINE: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
];

/** All --iridis-{role} props the projector has written. Used to clear
 *  stale entries when switching schemas. */
const writtenProps = new Set<string>();

/**
 * Projects the supplied config onto the document. Idempotent — invoked
 * by the theme dispatcher's `watch` on every state change. Async
 * because the engine pipeline returns a promise; awaiting is optional
 * for fire-and-forget callers.
 */
export async function applyConfigToDocument(config: DocsConfigType): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const pair = roleSchemaByName[config.roleSchema];
  if (!pair) {
    if (typeof console !== 'undefined') {
      console.warn(`[iridis] unknown schema: ${config.roleSchema}`);
    }
    return;
  }

  const schema = pair[config.framing];

  try {
    const engine = new Engine();
    for (const t of coreTasks)    engine.tasks.register(t);
    engine.pipeline(PIPELINE);

    const state = await engine.run({
      'colors':   config.paletteColors,
      'roles':    schema,
      'contrast': { 'level': config.contrastLevel, 'algorithm': config.contrastAlgorithm },
      'runtime':  { 'framing': config.framing, 'colorSpace': config.colorSpace },
    });

    const root = document.documentElement;

    /* Clear stale props from the previous run so a 16→4 switch doesn't
       leave 12 phantom syntax tokens cascading. */
    for (const prop of writtenProps) {
      root.style.removeProperty(prop);
    }
    writtenProps.clear();

    /* Write one CSS variable per resolved role. The role NAME is the
       variable name — the schema author controls both. */
    for (const [name, color] of Object.entries(state.roles)) {
      const prop = `--iridis-${name}`;
      root.style.setProperty(prop, color.hex);
      writtenProps.add(prop);
    }

    root.dataset['iridisFraming'] = config.framing;
    root.dataset['iridisSchema']  = config.roleSchema;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[iridis] applyConfigToDocument failed:', err);
    }
  }
}
