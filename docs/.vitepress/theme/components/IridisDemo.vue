<script setup lang="ts">
/**
 * IridisDemo.vue
 *
 * Live engine instance bound to the global docs config store. Every demo on
 * every page is a separate Engine instance running its own pipeline against
 * the shared seed colors, framing, contrast settings, and role schema.
 *
 * Reactive: any change to the config (or the local input prop) re-runs the
 * pipeline and updates the rendered output.
 *
 * Props
 *   pipeline   — string[]  task names to run, in order
 *   showColors — boolean   render the canonical colors strip (default true)
 *   showRoles  — boolean   render the resolved-roles swatch grid (default true)
 *   showJson   — boolean   render the collapsible JSON of state.outputs (default true)
 *   localSeeds — string[]  override the global seedColors for this demo
 */

import { computed, onMounted, ref, watch } from 'vue';

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import type { ColorRecordInterface, InputInterface, PaletteStateInterface } from '@studnicky/iridis/model';

import { configStore }     from '../stores/configStore.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const props = withDefaults(defineProps<{
  'pipeline':    readonly string[];
  'showColors'?: boolean;
  'showRoles'?:  boolean;
  'showJson'?:   boolean;
  'localSeeds'?: readonly string[];
}>(), {
  'showColors': true,
  'showRoles':  true,
  'showJson':   false,
  'localSeeds': undefined,
});

const state = ref<PaletteStateInterface | null>(null);
const error = ref<string | null>(null);

function buildInput(): InputInterface {
  const seeds = props.localSeeds ?? configStore.seedColors;
  const schema = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['minimal'];
  return {
    'colors':   seeds,
    'roles':    schema,
    'contrast': {
      'level':     configStore.contrastLevel,
      'algorithm': configStore.contrastAlgorithm,
    },
    'runtime': {
      'framing':    configStore.framing,
      'colorSpace': configStore.colorSpace,
    },
  };
}

async function runPipeline(): Promise<void> {
  try {
    const engine = new Engine();
    for (const m of mathBuiltins) engine.math.register(m);
    for (const t of coreTasks)    engine.tasks.register(t);
    engine.pipeline(props.pipeline);
    state.value = await engine.run(buildInput());
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    state.value = null;
  }
}

onMounted(() => {
  runPipeline();
});

// Re-run on any reactive input change
watch(
  () => [
    configStore.seedColors,
    configStore.framing,
    configStore.contrastLevel,
    configStore.contrastAlgorithm,
    configStore.colorSpace,
    configStore.roleSchema,
    props.pipeline,
    props.localSeeds,
  ],
  () => runPipeline(),
  { 'deep': true },
);

const colors = computed(() => state.value?.colors ?? []);
const roles  = computed(() => state.value?.roles ?? {} as Record<string, ColorRecordInterface>);
const outputsJson = computed(() => {
  if (state.value === null) return '';
  return JSON.stringify(state.value.outputs, null, 2);
});

const jsonOpen = ref(false);
</script>

<template>
  <ClientOnly>
    <div class="iridis-demo">
      <div v-if="error" class="iridis-demo__error">
        <strong>Pipeline error:</strong> {{ error }}
      </div>

      <div v-if="showColors && colors.length > 0" class="iridis-demo__section">
        <div class="iridis-demo__label">Canonical colors ({{ colors.length }})</div>
        <div class="iridis-demo__strip">
          <div
            v-for="(c, i) in colors"
            :key="i"
            class="iridis-demo__chip"
            :style="{ background: c.hex }"
            :title="c.hex + ' • L=' + c.oklch.l.toFixed(3) + ' C=' + c.oklch.c.toFixed(3) + ' H=' + Math.round(c.oklch.h)"
          >
            <span class="iridis-demo__chip-label">{{ c.hex }}</span>
          </div>
        </div>
      </div>

      <div v-if="showRoles && Object.keys(roles).length > 0" class="iridis-demo__section">
        <div class="iridis-demo__label">Resolved roles</div>
        <div class="iridis-demo__roles">
          <div
            v-for="(c, name) in roles"
            :key="name"
            class="iridis-demo__role"
            :style="{ background: c.hex }"
          >
            <span class="iridis-demo__role-name">{{ name }}</span>
            <span class="iridis-demo__role-hex">{{ c.hex }}</span>
          </div>
        </div>
      </div>

      <div v-if="showJson && state" class="iridis-demo__section">
        <button class="iridis-demo__json-toggle" type="button" @click="jsonOpen = !jsonOpen">
          {{ jsonOpen ? '▾' : '▸' }} state.outputs
        </button>
        <pre v-show="jsonOpen" class="iridis-demo__json"><code>{{ outputsJson }}</code></pre>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.iridis-demo {
  margin: 1.25rem 0;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
}
.iridis-demo__error {
  padding: 0.65rem 0.85rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  color: #ef4444;
  font-size: 0.85rem;
}
.iridis-demo__section + .iridis-demo__section {
  margin-top: 1rem;
}
.iridis-demo__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin-bottom: 0.5rem;
}
.iridis-demo__strip {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.iridis-demo__chip {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.iridis-demo__chip-label {
  font-size: 0.62rem;
  font-family: var(--vp-font-family-mono);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 0.05rem 0.25rem;
  border-radius: 2px;
  margin-bottom: 0.2rem;
}
.iridis-demo__roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
}
.iridis-demo__role {
  padding: 0.6rem 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-height: 64px;
}
.iridis-demo__role-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
}
.iridis-demo__role-hex {
  font-size: 0.65rem;
  font-family: var(--vp-font-family-mono);
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.iridis-demo__json-toggle {
  background: transparent;
  border: 0;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0;
}
.iridis-demo__json {
  margin-top: 0.4rem;
  padding: 0.65rem 0.8rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: auto;
  max-height: 320px;
}
.iridis-demo__json code {
  font-size: 0.75rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}
</style>
