<script setup lang="ts">
/**
 * IridisDemo.vue
 *
 * Live engine instance for embedding in markdown pages. Each demo carries
 * its own input row of color pickers — the user can pick colors and
 * progressively add more (up to 8) directly inside the example.
 *
 * Color source resolution:
 *   1. If `localSeeds` prop is provided: use it as the initial value (and
 *      treat it as the demo's starting point — still locally editable).
 *   2. Otherwise: initialize from configStore.seedColors.
 *
 * Once the user touches the local pickers, the demo runs on the local set.
 * A "Reset to global" button reverts to the sidebar config.
 *
 * Reactive: any change to local colors OR any change to global config
 * (framing / contrast / role schema / colorSpace) re-runs the pipeline.
 */

import { computed, onMounted, ref, watch } from 'vue';

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
} from '@studnicky/iridis/model';

import { configStore }      from '../stores/configStore.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const props = withDefaults(defineProps<{
  'pipeline':       readonly string[];
  'showColors'?:    boolean;
  'showRoles'?:     boolean;
  'showJson'?:      boolean;
  'localSeeds'?:    readonly string[];
  'allowAdd'?:      boolean;
  'minColors'?:     number;
  'maxColors'?:     number;
}>(), {
  'showColors': true,
  'showRoles':  true,
  'showJson':   false,
  'localSeeds': undefined,
  'allowAdd':   true,
  'minColors':  1,
  'maxColors':  8,
});

// Local color state. Starts as a clone of localSeeds (if given) or the
// global seeds. The user touches `local` instead of mutating the prop.
const local = ref<string[]>([
  ...(props.localSeeds ?? configStore.seedColors),
]);
const useGlobal = ref<boolean>(props.localSeeds === undefined);

// If the user hasn't overridden local yet AND no localSeeds prop was given,
// keep the local in sync with the global config so changes from the sidebar
// flow into this demo.
watch(
  () => [...configStore.seedColors],
  (next) => {
    if (useGlobal.value) {
      local.value = [...next];
    }
  },
  { 'deep': true },
);

const state = ref<PaletteStateInterface | null>(null);
const error = ref<string | null>(null);

function buildInput(): InputInterface {
  const schema = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['minimal'];
  return {
    'colors':   local.value,
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

onMounted(() => { runPipeline(); });

watch(
  () => [
    [...local.value],
    configStore.framing,
    configStore.contrastLevel,
    configStore.contrastAlgorithm,
    configStore.colorSpace,
    configStore.roleSchema,
    props.pipeline,
  ],
  () => runPipeline(),
  { 'deep': true },
);

function setColor(idx: number, value: string): void {
  useGlobal.value = false;
  const next = [...local.value];
  next[idx] = value;
  local.value = next;
}

function addColor(): void {
  if (local.value.length >= props.maxColors) return;
  useGlobal.value = false;
  // Default the new picker to a mid-gray so the user can see it appear,
  // then immediately edit it.
  local.value = [...local.value, '#888888'];
}

function removeColor(idx: number): void {
  if (local.value.length <= props.minColors) return;
  useGlobal.value = false;
  const next = [...local.value];
  next.splice(idx, 1);
  local.value = next;
}

function resetToGlobal(): void {
  useGlobal.value = true;
  local.value = [...configStore.seedColors];
}

const colors  = computed(() => state.value?.colors ?? []);
const roles   = computed(() => state.value?.roles  ?? {} as Record<string, ColorRecordInterface>);
const outputsJson = computed(() => state.value === null ? '' : JSON.stringify(state.value.outputs, null, 2));
const isLocal = computed(() => !useGlobal.value);
const canAdd  = computed(() => props.allowAdd && local.value.length < props.maxColors);
const canRemove = computed(() => local.value.length > props.minColors);

const jsonOpen = ref(false);
</script>

<template>
  <ClientOnly>
    <div class="iridis-demo">
      <!-- Input row: per-demo color pickers -->
      <div class="iridis-demo__input">
        <div class="iridis-demo__input-header">
          <span class="iridis-demo__label">Seeds ({{ local.length }})</span>
          <button
            v-if="isLocal"
            type="button"
            class="iridis-demo__reset"
            title="Revert to the seeds in the sidebar config"
            @click="resetToGlobal"
          >reset to global</button>
          <span v-else class="iridis-demo__hint">linked to sidebar config</span>
        </div>
        <div class="iridis-demo__pickers">
          <div v-for="(color, idx) in local" :key="idx" class="iridis-demo__picker">
            <input
              type="color"
              :value="color"
              :aria-label="`seed ${idx + 1}`"
              @input="setColor(idx, ($event.target as HTMLInputElement).value)"
            />
            <code class="iridis-demo__picker-hex">{{ color }}</code>
            <button
              type="button"
              class="iridis-demo__remove"
              :disabled="!canRemove"
              :aria-label="`remove seed ${idx + 1}`"
              @click="removeColor(idx)"
            >×</button>
          </div>
          <button
            v-if="allowAdd"
            type="button"
            class="iridis-demo__add"
            :disabled="!canAdd"
            @click="addColor"
          >+ add color</button>
        </div>
      </div>

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
.iridis-demo__input {
  margin-bottom: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.iridis-demo__input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.45rem;
}
.iridis-demo__hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-style: italic;
}
.iridis-demo__pickers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.iridis-demo__picker {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.4rem 0.25rem 0.25rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.iridis-demo__picker input[type="color"] {
  width: 2rem;
  height: 1.6rem;
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.iridis-demo__picker-hex {
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  text-transform: lowercase;
  letter-spacing: 0;
}
.iridis-demo__remove {
  width: 1.2rem;
  height: 1.2rem;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--vp-c-text-3);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 2px;
}
.iridis-demo__remove:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.iridis-demo__remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.iridis-demo__add {
  padding: 0.35rem 0.65rem;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  cursor: pointer;
}
.iridis-demo__add:hover:not(:disabled) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  border-style: solid;
}
.iridis-demo__add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.iridis-demo__reset {
  background: transparent;
  border: 0;
  color: var(--vp-c-brand-1);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0;
}
.iridis-demo__reset:hover {
  text-decoration: underline;
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
