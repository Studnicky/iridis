<script setup lang="ts">
/**
 * MultiOutputDemo.vue
 *
 * Same engine, same palette, six output formats. Demonstrates the iridis
 * promise: one input, many surfaces. Each plugin writes its own slot in
 * state.outputs; this component renders all six in PrimeVue Tabs.
 *
 * Plugins adopted: stylesheet, tailwind, vscode, capacitor, rdf, plus
 * the in-core emit:json. The render is read-only — clicking a tab just
 * switches the visible output.
 */

import { computed, onMounted, ref, watch } from 'vue';

import { Engine, coreTasks } from '@studnicky/iridis';
import type { PaletteStateInterface } from '@studnicky/iridis/model';

import { stylesheetPlugin }  from '@studnicky/iridis-stylesheet';
import { tailwindPlugin }    from '@studnicky/iridis-tailwind';
import { vscodePlugin, vscodeRoleSchema16 } from '@studnicky/iridis-vscode';
import { capacitorPlugin }   from '@studnicky/iridis-capacitor';
import { rdfPlugin }         from '@studnicky/iridis-rdf';

import { configStore }       from '../stores/configStore.ts';

const tabs = [
  { 'id': 'css',         'label': 'CSS variables',         'lang': 'css' },
  { 'id': 'tailwind',    'label': 'Tailwind theme',        'lang': 'json' },
  { 'id': 'vscode',      'label': 'VS Code theme',         'lang': 'json' },
  { 'id': 'capacitor',   'label': 'Capacitor (StatusBar)', 'lang': 'json' },
  { 'id': 'rdf',         'label': 'RDF (Turtle)',          'lang': 'turtle' },
  { 'id': 'json',        'label': 'JSON',                  'lang': 'json' },
] as const;

const activeTab = ref<string>('css');
const state = ref<PaletteStateInterface | null>(null);
const error = ref<string | null>(null);

async function runPipeline(): Promise<void> {
  try {
    const engine = new Engine();
    for (const t of coreTasks)    engine.tasks.register(t);

    engine.adopt(stylesheetPlugin);
    engine.adopt(tailwindPlugin);
    engine.adopt(vscodePlugin);
    engine.adopt(capacitorPlugin);
    engine.adopt(rdfPlugin);

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
      'colors':  configStore.paletteColors,
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
    [...configStore.paletteColors],
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
    default:          return '';
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
        <span class="iridis-multi__label">Six outputs · same palette</span>
        <Button
          type="button"
          label="copy"
          severity="secondary"
          size="small"
          :title="`copy ${visibleLabel}`"
          class="iridis-multi__copy"
          @click="copyToClipboard"
        />
      </div>

      <Tabs v-model:value="activeTab" class="iridis-multi__tabs">
        <TabList>
          <Tab v-for="t in tabs" :key="t.id" :value="t.id">{{ t.label }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel v-for="t in tabs" :key="t.id" :value="t.id">
            <div v-if="error" class="iridis-multi__error">
              <strong>Pipeline error:</strong> {{ error }}
            </div>
            <pre v-else class="iridis-multi__output"><code>{{ visibleOutput }}</code></pre>
          </TabPanel>
        </TabPanels>
      </Tabs>
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
.iridis-multi__copy :deep(.p-button) {
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.iridis-multi__copy :deep(.p-button:hover) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

/* PrimeVue Tabs styled to match the docs' underline pattern. */
.iridis-multi__tabs :deep(.p-tablist) {
  background: var(--vp-c-bg-soft);
  padding: 0.45rem 0.6rem 0;
}
.iridis-multi__tabs :deep(.p-tab) {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}
.iridis-multi__tabs :deep(.p-tab[aria-selected="true"]) {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}
.iridis-multi__tabs :deep(.p-tabpanels),
.iridis-multi__tabs :deep(.p-tabpanel) {
  background: transparent;
  padding: 0;
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
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 10%, transparent);
  color: var(--iridis-error, var(--iridis-text, currentColor));
  font-size: 0.85rem;
}
</style>
