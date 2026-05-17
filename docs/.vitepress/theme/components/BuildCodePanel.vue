<script setup lang="ts">
/**
 * BuildCodePanel.vue
 *
 * Copy-paste-runnable boilerplate that reproduces the current docs
 * pipeline against the current `configStore` state.
 *
 * Renders three blocks:
 *   1. Seed-driven engine call — the canonical hex-input path.
 *   2. Image-driven engine call — same schema, different intake.
 *   3. CSS variables — flattened `:root { --iridis-{role}: #hex }`
 *      from the inline styles the projector wrote on documentElement.
 *
 * Each block carries its own copy-to-clipboard button.
 */
import { computed } from 'vue';
import IridisButton from './base/IridisButton.vue';
import { configStore }      from '../stores/configStore.ts';
import { appliedRoles }     from '../stores/applyConfigToDocument.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const SEED_PIPELINE: readonly string[] = [
  'intake:hex',
  'clamp:count',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'enforce:wcagAA',
  'enforce:wcagAAA',
  'enforce:apca',
  'enforce:cvdSimulate',
  'derive:variant',
  'emit:json',
];

const IMAGE_PIPELINE: readonly string[] = [
  'intake:imagePixels',
  'gallery:histogram',
  'gallery:extract',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
];

/* Inline the active role schema as a JSON literal so the snippet is
   copy-paste-runnable without a separate import of the docs-only
   roleSchemaByName helper. The user's schema (whether built-in or a
   custom-* variant edited in the Role schema tab) becomes a literal
   in the generated code. */
const resolvedSchemaLiteral = computed<string>(() => {
  const pair = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-32'];
  if (pair === undefined) return '/* unknown schema */';
  const schema = pair[configStore.framing];
  return JSON.stringify(schema, null, 2);
});

const seedCode = computed<string>(() => {
  const colors = JSON.stringify([...configStore.paletteColors]);
  return [
    "import { Engine, coreTasks } from '@studnicky/iridis';",
    "import { contrastPlugin }    from '@studnicky/iridis-contrast';",
    "import type { RoleSchemaInterface } from '@studnicky/iridis/model';",
    '',
    `// Active schema — '${configStore.roleSchema}' / framing '${configStore.framing}' — inlined`,
    '// for a self-contained example. Move it to its own module in your app.',
    `const roleSchema: RoleSchemaInterface = ${resolvedSchemaLiteral.value};`,
    '',
    'const engine = new Engine();',
    'for (const t of coreTasks) engine.tasks.register(t);',
    'engine.adopt(contrastPlugin);',
    '',
    `engine.pipeline(${JSON.stringify([...SEED_PIPELINE], null, 2)});`,
    '',
    'const state = await engine.run({',
    `  'colors':   ${colors},`,
    `  'roles':    roleSchema,`,
    `  'contrast': { 'level': '${configStore.contrastLevel}', 'algorithm': '${configStore.contrastAlgorithm}' },`,
    `  'runtime':  { 'framing': '${configStore.framing}', 'colorSpace': '${configStore.colorSpace}' },`,
    '});',
    '',
    'console.log(state.outputs.json);',
  ].join('\n');
});

const imageCode = computed<string>(() => [
  "import { Engine, coreTasks } from '@studnicky/iridis';",
  "import { contrastPlugin }    from '@studnicky/iridis-contrast';",
  "import { imagePlugin }       from '@studnicky/iridis-image';",
  "import type { RoleSchemaInterface } from '@studnicky/iridis/model';",
  '',
  `// Active schema — '${configStore.roleSchema}' / framing '${configStore.framing}' — inlined.`,
  '// Same schema as the seed-driven example above — image is just a different intake.',
  `const roleSchema: RoleSchemaInterface = ${resolvedSchemaLiteral.value};`,
  '',
  'const engine = new Engine();',
  'for (const t of coreTasks) engine.tasks.register(t);',
  'engine.adopt(contrastPlugin);',
  'engine.adopt(imagePlugin);',
  '',
  `engine.pipeline(${JSON.stringify([...IMAGE_PIPELINE], null, 2)});`,
  '',
  '// `imageData` is the result of canvas.getImageData() — Uint8ClampedArray + width + height.',
  'const state = await engine.run({',
  "  'colors':   [imageData],",
  `  'roles':    roleSchema,`,
  `  'contrast': { 'level': '${configStore.contrastLevel}', 'algorithm': '${configStore.contrastAlgorithm}' },`,
  `  'runtime':  { 'framing': '${configStore.framing}', 'colorSpace': '${configStore.colorSpace}' },`,
  '});',
  '',
  'console.log(state.outputs.json);',
].join('\n'));

const cssVariables = computed<string>(() => {
  /* Source the snippet from the reactive `appliedRoles` map the
     projector publishes on every successful `engine.run`. Reading
     `document.documentElement.style` would race the projector — the
     watch fires synchronously on config change but the projector
     awaits `engine.run` before writing CSS vars, so the DOM is stale
     until the next microtask. The reactive ref lets Vue track the
     dependency precisely and emit the snippet that exactly matches
     what was written to `:root`. */
  const roles = appliedRoles.value;
  const names = Object.keys(roles).sort();
  if (names.length === 0) return ':root {\n}';
  const lines = [':root {'];
  for (const name of names) {
    const hex = roles[name];
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) continue;
    lines.push(`  --iridis-${name}: ${hex};`);
  }
  lines.push('}');
  return lines.join('\n');
});

async function copyCss(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  try {
    await navigator.clipboard.writeText(cssVariables.value);
  } catch { /* noop */ }
}
async function copyCode(text: string): Promise<void> {
  if (typeof navigator === 'undefined') return;
  try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
}
</script>

<template>
  <ClientOnly>
    <div class="build-code-panel">
      <article class="build-code-panel__block">
        <header class="build-code-panel__head">
          <span class="build-code-panel__label">Seed-driven pipeline</span>
          <IridisButton variant="secondary" size="sm" @click="copyCode(seedCode)">
            Copy code
          </IridisButton>
        </header>
        <pre class="build-code-panel__pre"><code>{{ seedCode }}</code></pre>
      </article>

      <article class="build-code-panel__block">
        <header class="build-code-panel__head">
          <span class="build-code-panel__label">Image-driven pipeline (same schema)</span>
          <IridisButton variant="secondary" size="sm" @click="copyCode(imageCode)">
            Copy code
          </IridisButton>
        </header>
        <pre class="build-code-panel__pre"><code>{{ imageCode }}</code></pre>
      </article>

      <article class="build-code-panel__block">
        <header class="build-code-panel__head">
          <span class="build-code-panel__label">CSS variables (live from this page)</span>
          <IridisButton variant="secondary" size="sm" @click="copyCss">
            Copy CSS
          </IridisButton>
        </header>
        <pre class="build-code-panel__pre"><code>{{ cssVariables }}</code></pre>
      </article>
    </div>
  </ClientOnly>
</template>

<style scoped>
.build-code-panel {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.build-code-panel__block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.build-code-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.85rem;
}
.build-code-panel__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.build-code-panel__pre {
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: auto;
  max-height: 360px;
}
.build-code-panel__pre code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  white-space: pre;
}
</style>
