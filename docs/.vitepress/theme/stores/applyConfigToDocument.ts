/**
 * applyConfigToDocument.ts
 *
 * iridis dogfoods iridis. Runs the engine against the docs-theme role schema
 * (selected by configStore.framing) and writes the resolved palette as a
 * cascading set of CSS custom properties:
 *
 *   1. Engine emits canonical role hexes (background, surface, ..., onBrand).
 *      These are the *iridis-emitted* tokens — written as `--iridis-*` so the
 *      provenance is explicit.
 *   2. The vitepress chrome tokens (--vp-c-*) cascade from the iridis tokens
 *      via var() references in palette.css. Hover and elevation states are
 *      computed via color-mix() against the iridis tokens, not hardcoded.
 *
 * This is the cascading model: change one palette color, the iridis token recomputes,
 * and every consumer of the cascade follows. Pattern adapted from
 * vscode-arcade-blaster's role-resolved palette → derived theme cascade.
 *
 * Side-effect only. SSR-safe.
 */

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';

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
      'colors':  config.paletteColors,
      'roles':   schema,
      'runtime': {
        'framing':    config.framing,
        'colorSpace': config.colorSpace,
      },
    });

    const r          = state.roles;
    const root       = document.documentElement;

    // Chrome tokens — source of truth for the docs theme.
    setIridis(root, '--iridis-background', r['background']!.hex);
    setIridis(root, '--iridis-surface',    r['surface']!.hex);
    setIridis(root, '--iridis-bg-soft',    r['bgSoft']!.hex);
    setIridis(root, '--iridis-divider',    r['divider']!.hex);
    setIridis(root, '--iridis-muted',      r['muted']!.hex);
    setIridis(root, '--iridis-text',       r['text']!.hex);
    setIridis(root, '--iridis-brand',      r['brand']!.hex);
    setIridis(root, '--iridis-on-brand',   r['onBrand']!.hex);

    // Syntax tokens — consumed by the iridis Shiki theme so code blocks
    // recolor in step with the chrome on every config change.
    const syntaxRoles = [
      'syntaxText', 'syntaxComment', 'syntaxKeyword', 'syntaxString',
      'syntaxNumber', 'syntaxFunction', 'syntaxType', 'syntaxConstant',
      'syntaxVariable', 'syntaxProperty', 'syntaxTag', 'syntaxPunctuation',
      'syntaxEscape', 'syntaxError',
    ] as const;
    for (const name of syntaxRoles) {
      const rec = r[name];
      if (rec) {
        setIridis(root, `--iridis-${kebab(name)}`, rec.hex);
      }
    }

    // Reflect framing for any framing-aware CSS hooks.
    root.dataset['iridisFraming'] = config.framing;
  } catch {
    /* on failure, leave the existing palette.css fallback values in place */
  }
}

function setIridis(root: HTMLElement, name: string, value: string): void {
  root.style.setProperty(name, value);
}

function kebab(camel: string): string {
  return camel.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}
