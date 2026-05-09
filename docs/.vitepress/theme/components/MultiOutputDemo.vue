<script setup lang="ts">
/**
 * MultiOutputDemo.vue
 *
 * Same engine, same seeds, six output formats. Demonstrates the iridis
 * promise: one input, many surfaces. Each plugin writes its own slot in
 * state.outputs; this component renders all six in tabs.
 *
 * Plugins adopted: stylesheet, tailwind, vscode, capacitor, rdf, plus
 * the in-core emit:json. The render is read-only — clicking a tab just
 * switches the visible output.
 */

import { computed, onMounted, ref, watch } from 'vue';

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import type { PaletteStateInterface } from '@studnicky/iridis/model';

import { stylesheetPlugin }  from '@studnicky/iridis-stylesheet';
import { tailwindPlugin }    from '@studnicky/iridis-tailwind';
import { capacitorPlugin }   from '@studnicky/iridis-capacitor';
import { reasoningPlugin }   from '@studnicky/iridis-rdf';

import { configStore }       from '../stores/configStore.ts';
import { roleSchemaByName }  from '../schemas/roleSchemas.ts';

const tabs = [
  { 'id': 'css',         'label': 'CSS variables',         'lang': 'css' },
  { 'id': 'cssScoped',   'label': 'CSS scoped blocks',     'lang': 'css' },
  { 'id': 'tailwind',    'label': 'Tailwind theme',        'lang': 'json' },
  { 'id': 'capacitor',   'label': 'Capacitor (StatusBar)', 'lang': 'json' },
  { 'id': 'rdf',         'label': 'RDF (Turtle)',          'lang': 'turtle' },
  { 'id': 'json',        'label': 'JSON',                  'lang': 'json' },
] as const;

const activeTab = ref<typeof tabs[number]['id']>('css');
const state = ref<PaletteStateInterface | null>(null);
const error = ref<string | null>(null);

async function runPipeline(): Promise<void> {
  try {
    const engine = new Engine();
    for (const m of mathBuiltins) engine.math.register(m);
    for (const t of coreTasks)    engine.tasks.register(t);

    engine.adopt(stylesheetPlugin);
    engine.adopt(tailwindPlugin);
    engine.adopt(vscodePlugin);
    engine.adopt(capacitorPlugin);
    engine.adopt(reasoningPlugin);

    engine.pipeline([
      'intake:hex',
      'resolve:roles',
      'expand:family',
      'enforce:contrast',
      'derive:variant',
      'emit:json',
      'emit:cssVars',
      'emit:tailwindTheme',
      'emit:vscodeUiPalette',
      'emit:vscodeSemanticRules',
      'emit:vscodeThemeJson',
      'emit:capacitorTheme',
      'reason:annotate',
      'reason:serialize',
    ]);

    state.value = await engine.run({
      'colors':  configStore.seedColors,
      // VS Code plugin wants the 16-role schema; it fills missing roles
      // via expand:family + required-role nudging.
      'roles':   vscodeRoleSchema16,
      'contrast': {
        'level':     configStore.contrastLevel,
        'algorithm': configStore.contrastAlgorithm,
      },
      'runtime': {
        'framing':    configStore.framing,
        'colorSpace': configStore.colorSpace,
      },
    });
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    state.value = null;
  }
}

onMounted(() => { runPipeline(); });

watch(
  () => [
    [...configStore.seedColors],
    configStore.framing,
    configStore.contrastLevel,
    configStore.contrastAlgorithm,
    configStore.colorSpace,
  ],
  () => runPipeline(),
  { 'deep': true },
);

const cssOutput = computed(() => {
  const o = state.value?.outputs['cssVars'] as { 'full'?: string } | undefined;
  return o?.full ?? '/* no output */';
});

const tailwindOutput = computed(() => {
  const o = state.value?.outputs['tailwind'];
  return JSON.stringify(o ?? null, null, 2);
});

const vscodeOutput = computed(() => {
  const o = state.value?.outputs['vscode'] as { 'themeJson'?: unknown } | undefined;
  return JSON.stringify(o?.themeJson ?? null, null, 2);
});

const capacitorOutput = computed(() => {
  const o = state.value?.outputs['capacitor'];
  return JSON.stringify(o ?? null, null, 2);
});

const rdfOutput = computed(() => {
  const o = state.value?.outputs['reasoning'] as { 'turtle'?: string } | undefined;
  return o?.turtle ?? '# no output';
});

const jsonOutput = computed(() => {
  if (!state.value) return '{}';
  // Render a slimmed JSON of just the canonical surfaces.
  return JSON.stringify({
    'roles':    state.value.roles,
    'variants': state.value.variants,
  }, null, 2);
});

const visibleOutput = computed(() => {
  switch (activeTab.value) {
    case 'css':       return cssOutput.value;
    case 'tailwind':  return tailwindOutput.value;
    case 'vscode':    return vscodeOutput.value;
    case 'capacitor': return capacitorOutput.value;
    case 'rdf':       return rdfOutput.value;
    case 'json':      return jsonOutput.value;
  }
});

const visibleLabel = computed(() => tabs.find((t) => t.id === activeTab.value)?.label ?? '');

function copyToClipboard(): void {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  navigator.clipboard.writeText(visibleOutput.value).catch(() => { /* ignore */ });
}
</script>

<template>
  <ClientOnly>
    <div class="iridis-multi">
      <div class="iridis-multi__header">
        <span class="iridis-multi__label">Six outputs · same seeds</span>
        <button type="button" class="iridis-multi__copy" :title="`copy ${visibleLabel}`" @click="copyToClipboard">
          copy
        </button>
      </div>

      <div class="iridis-multi__tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :class="['iridis-multi__tab', { 'iridis-multi__tab--active': activeTab === t.id }]"
          :aria-selected="activeTab === t.id"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <div v-if="error" class="iridis-multi__error">
        <strong>Pipeline error:</strong> {{ error }}
      </div>

      <pre v-else class="iridis-multi__output"><code>{{ visibleOutput }}</code></pre>
    </div>
  </ClientOnly>
</template>

<style scoped>
.iridis-multi {
  margin: 1.25rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
.iridis-multi__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.iridis-multi__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.iridis-multi__copy {
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
}
.iridis-multi__copy:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.iridis-multi__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.45rem 0.6rem 0;
  background: var(--vp-c-bg-soft);
}
.iridis-multi__tab {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.iridis-multi__tab:hover {
  color: var(--vp-c-text-1);
}
.iridis-multi__tab--active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}
.iridis-multi__output {
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--vp-c-bg);
  overflow: auto;
  max-height: 420px;
  border-top: 1px solid var(--vp-c-divider);
}
.iridis-multi__output code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
  white-space: pre;
}
.iridis-multi__error {
  padding: 0.85rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 0.85rem;
}
</style>
