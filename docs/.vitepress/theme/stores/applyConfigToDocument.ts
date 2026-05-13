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
 * CSS variable writes are diffed against the previous run: roles that
 * dropped out of the schema get `removeProperty`'d, roles whose hex
 * changed get `setProperty`'d, roles whose hex is identical pay nothing.
 * SSR-safe: early-returns when `window`/`document` are undefined.
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

/**
 * Last-written role hex per `--iridis-{role}` prop. Used to skip
 * `setProperty` calls when nothing changed for a role, and to drive
 * `removeProperty` only for roles that disappeared since the previous
 * run (e.g. switching from a 16-role schema to a 4-role schema).
 */
const writtenRoles = new Map<string, string>();

/**
 * Module-scope engine. Constructed once at import time with the core
 * tasks registered and the projector's pipeline declared. `Engine.run`
 * carries no state between calls — every invocation produces a fresh
 * `PaletteStateInterface` from the input — so reuse is safe and avoids
 * per-`watch`-tick allocation of a new registry + task list.
 */
const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.pipeline(PIPELINE);

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
    const state = await engine.run({
      'colors':   config.paletteColors,
      'roles':    schema,
      'contrast': { 'level': config.contrastLevel, 'algorithm': config.contrastAlgorithm },
      'runtime':  { 'framing': config.framing, 'colorSpace': config.colorSpace },
    });

    const root = document.documentElement;

    /* Diff against the previous run: only `setProperty` when a role's
       hex actually changed, and only `removeProperty` for role names
       that disappeared (e.g. 16-role → 4-role schema switch).         */
    const currentRoles = new Map<string, string>();
    for (const [name, color] of Object.entries(state.roles)) {
      currentRoles.set(name, color.hex);
    }

    for (const [name, prevHex] of writtenRoles) {
      if (!currentRoles.has(name)) {
        root.style.removeProperty(`--iridis-${name}`);
        writtenRoles.delete(name);
      } else if (currentRoles.get(name) !== prevHex) {
        const hex = currentRoles.get(name) as string;
        root.style.setProperty(`--iridis-${name}`, hex);
        writtenRoles.set(name, hex);
      }
    }

    for (const [name, hex] of currentRoles) {
      if (!writtenRoles.has(name)) {
        root.style.setProperty(`--iridis-${name}`, hex);
        writtenRoles.set(name, hex);
      }
    }

    root.dataset['iridisFraming'] = config.framing;
    root.dataset['iridisSchema']  = config.roleSchema;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[iridis] applyConfigToDocument failed:', err);
    }
  }
}
