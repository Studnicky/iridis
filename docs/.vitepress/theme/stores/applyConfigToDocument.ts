/**
 * applyConfigToDocument.ts — projector.
 *
 * Single responsibility: take the active schema (a {dark,light} pair),
 * pick the variant matching the current framing, run the engine, write
 * one CSS variable per resolved role onto documentElement. That is the
 * entire glue layer.
 *
 *   active schema + framing → engine.run → state.roles → --iridis-{role}
 *
 * No alias chains. No JS-side hue rotation. No static fallbacks. If a
 * role isn't in the schema it isn't in the cascade — that sparseness IS
 * the demonstration of what the user's chosen schema produces.
 *
 * Previously-set --iridis-* properties are cleared before the new set
 * is written, so switching from iridis-16 to iridis-4 doesn't leave
 * stale variables from the previous schema haunting the cascade.
 *
 * SSR-safe (early return when window/document is undefined).
 */

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';

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
    for (const m of mathBuiltins) engine.math.register(m);
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
