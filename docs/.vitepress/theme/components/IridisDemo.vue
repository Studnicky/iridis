<script setup lang="ts">
/**
 * IridisDemo.vue — split-column live engine demo.
 *
 * Layout:
 *   ┌──────────────────────┬──────────────────────────┐
 *   │ PALETTE (left)       │ OKLCH PICKER (right)     │
 *   │ click to select      │ for the selected color   │
 *   ├──────────────────────┴──────────────────────────┤
 *   │ Tabs:                                            │
 *   │   • Roles schema   — JSON, editable in-line      │
 *   │   • Resolved roles — swatch grid (read-only)     │
 *   │   • Code           — TS that updates as you edit │
 *   └──────────────────────────────────────────────────┘
 *
 * Editable surfaces (Roles schema textarea + colors[] in Code tab) are
 * validated via json-tology against canonical schemas. Invalid edits do
 * not propagate; the prior valid state stays in effect and an error
 * banner surfaces the validation reason. Valid edits mutate configStore
 * and propagate to every other demo + the docs theme on the next tick.
 */

import { computed, onMounted, ref, watch } from 'vue';

import { Engine, mathBuiltins, coreTasks, contrastWcag21, colorRecordFactory } from '@studnicky/iridis';
import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterface,
} from '@studnicky/iridis/model';

import IridisPicker        from './IridisPicker.vue';
import { configStore }     from '../stores/configStore.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';
import { validateColorsArray, validateRoleSchema } from '../validators/inlineValidation.ts';

const props = withDefaults(defineProps<{
  'pipeline':       readonly string[];
  'showRoles'?:     boolean;
  'allowAdd'?:      boolean;
  'minColors'?:     number;
  'maxColors'?:     number;
}>(), {
  'showRoles':  true,
  'allowAdd':   true,
  'minColors':  1,
  'maxColors':  8,
});

const state         = ref<PaletteStateInterface | null>(null);
const error         = ref<string | null>(null);
const selectedSwatch = ref<number>(0);
const activeTab     = ref<'schema' | 'resolved' | 'code'>('resolved');

// Editable in-line state (Roles schema text + colors text)
const localRoleSchemaText = ref<string>('');
const localColorsText     = ref<string>('');
const schemaError         = ref<string | null>(null);
const colorsError         = ref<string | null>(null);

function buildInput(): InputInterface {
  const schema = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['minimal'];
  return {
    'colors':   configStore.paletteColors,
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
  syncEditableFromConfig();
  runPipeline();
});

watch(
  () => [
    [...configStore.paletteColors],
    configStore.framing,
    configStore.contrastLevel,
    configStore.contrastAlgorithm,
    configStore.colorSpace,
    configStore.roleSchema,
    props.pipeline,
  ],
  () => {
    syncEditableFromConfig();
    runPipeline();
  },
  { 'deep': true },
);

function syncEditableFromConfig(): void {
  const schema = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['minimal'];
  localRoleSchemaText.value = JSON.stringify(schema, null, 2);
  localColorsText.value     = JSON.stringify(configStore.paletteColors, null, 2);
}

function setColor(idx: number, value: string): void {
  const next = [...configStore.paletteColors];
  next[idx] = value;
  configStore.paletteColors = next;
}

function addColor(): void {
  if (configStore.paletteColors.length >= props.maxColors) return;
  configStore.paletteColors = [...configStore.paletteColors, '#888888'];
  selectedSwatch.value = configStore.paletteColors.length - 1;
}

function removeColor(idx: number): void {
  if (configStore.paletteColors.length <= props.minColors) return;
  const next = [...configStore.paletteColors];
  next.splice(idx, 1);
  configStore.paletteColors = next;
  if (selectedSwatch.value >= configStore.paletteColors.length) {
    selectedSwatch.value = Math.max(0, configStore.paletteColors.length - 1);
  }
}

function selectSwatch(idx: number): void {
  selectedSwatch.value = idx;
}

function onPickerUpdate(value: string): void {
  setColor(selectedSwatch.value, value);
}

// === Inline editor: Role schema textarea ===
function onRoleSchemaInput(e: Event): void {
  const text = (e.target as HTMLTextAreaElement).value;
  localRoleSchemaText.value = text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    schemaError.value = `JSON parse: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }
  const err = validateRoleSchema(parsed);
  if (err !== null) {
    schemaError.value = err;
    return;
  }
  schemaError.value = null;
  // Valid → register the new schema under its name and switch to it so it
  // propagates through the configStore-driven pipeline.
  const inline = parsed as RoleSchemaInterface;
  (roleSchemaByName as Record<string, RoleSchemaInterface>)[inline.name] = inline;
  configStore.roleSchema = inline.name;
}

// === Inline editor: colors textarea (Code tab) ===
function onColorsInput(e: Event): void {
  const text = (e.target as HTMLTextAreaElement).value;
  localColorsText.value = text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    colorsError.value = `JSON parse: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }
  const err = validateColorsArray(parsed);
  if (err !== null) {
    colorsError.value = err;
    return;
  }
  colorsError.value = null;
  configStore.paletteColors = [...(parsed as string[])];
}

// === Computed views ===
const roles   = computed(() => state.value?.roles  ?? {} as Record<string, ColorRecordInterface>);
const canAdd    = computed(() => props.allowAdd && configStore.paletteColors.length < props.maxColors);
const canRemove = computed(() => configStore.paletteColors.length > props.minColors);
const selectedHex = computed(() => configStore.paletteColors[selectedSwatch.value] ?? '#888888');

function backgroundRole(): ColorRecordInterface | null {
  const r = roles.value;
  return r['background'] ?? r['canvas'] ?? r['surface'] ?? null;
}

function contrastFor(role: ColorRecordInterface): number | null {
  const bg = backgroundRole();
  if (!bg || bg === role) return null;
  return contrastWcag21.apply(role, bg) as number;
}

function contrastBadge(ratio: number | null): string {
  if (ratio === null) return '';
  if (ratio >= 7)   return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3)   return 'AA-Lg';
  return 'fail';
}

function fmtOklch(c: ColorRecordInterface): string {
  return `L ${c.oklch.l.toFixed(2)} · C ${c.oklch.c.toFixed(2)} · H ${Math.round(c.oklch.h)}`;
}

function safeOnRoleColor(role: ColorRecordInterface): string {
  const white = colorRecordFactory.fromHex('#ffffff');
  const black = colorRecordFactory.fromHex('#000000');
  const onWhite = contrastWcag21.apply(white, role) as number;
  const onBlack = contrastWcag21.apply(black, role) as number;
  return onWhite >= onBlack ? '#ffffff' : '#0a0a0a';
}

const codeText = computed(() => {
  const colors = JSON.stringify(configStore.paletteColors);
  const lines: string[] = [
    "import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';",
    "",
    "const engine = new Engine();",
    "for (const m of mathBuiltins) engine.math.register(m);",
    "for (const t of coreTasks)    engine.tasks.register(t);",
    "",
    `engine.pipeline(${JSON.stringify([...props.pipeline], null, 2).replace(/\n/g, '\n  ')});`,
    "",
    "const state = await engine.run({",
    `  'colors':   ${colors},`,
    "  'roles':    yourRoleSchema,",
    `  'contrast': { 'level': '${configStore.contrastLevel}', 'algorithm': '${configStore.contrastAlgorithm}' },`,
    `  'runtime':  { 'framing': '${configStore.framing}', 'colorSpace': '${configStore.colorSpace}' },`,
    "});",
    "",
    "console.log(state.roles);",
  ];
  return lines.join('\n');
});
</script>

<template>
  <ClientOnly>
    <div class="iridis-demo">
      <!-- Top: split column. Palette left, picker right. -->
      <div class="iridis-demo__top">
        <div class="iridis-demo__palette">
          <div class="iridis-demo__col-header">
            <span class="iridis-demo__label">Palette ({{ configStore.paletteColors.length }})</span>
            <span class="iridis-demo__hint">click to edit</span>
          </div>
          <div class="iridis-demo__swatch-grid">
            <button
              v-if="allowAdd"
              type="button"
              class="iridis-demo__swatch-add"
              :disabled="!canAdd"
              :aria-label="canAdd ? 'Add color to palette' : 'Palette full'"
              @click="addColor"
            >+ add</button>
            <button
              v-for="(color, idx) in configStore.paletteColors"
              :key="idx"
              type="button"
              :class="['iridis-demo__swatch', { 'iridis-demo__swatch--selected': selectedSwatch === idx }]"
              :aria-label="`select palette color ${idx + 1} (${color})`"
              :aria-pressed="selectedSwatch === idx"
              @click="selectSwatch(idx)"
            >
              <span class="iridis-demo__swatch-chip" :style="{ background: color }" />
              <code class="iridis-demo__swatch-hex">{{ color }}</code>
              <span
                v-if="canRemove"
                class="iridis-demo__swatch-remove"
                role="button"
                tabindex="-1"
                :aria-label="`remove palette color ${idx + 1}`"
                @click.stop="removeColor(idx)"
              >×</span>
            </button>
          </div>
        </div>

        <div class="iridis-demo__picker">
          <div class="iridis-demo__col-header">
            <span class="iridis-demo__label">Picker</span>
            <span class="iridis-demo__hint">color {{ selectedSwatch + 1 }}</span>
          </div>
          <IridisPicker :model-value="selectedHex" @update:model-value="onPickerUpdate" />
        </div>
      </div>

      <div v-if="error" class="iridis-demo__error">
        <strong>Pipeline error:</strong> {{ error }}
      </div>

      <!-- Bottom: tabs -->
      <div class="iridis-demo__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :class="['iridis-demo__tab', { 'iridis-demo__tab--active': activeTab === 'resolved' }]"
          :aria-selected="activeTab === 'resolved'"
          @click="activeTab = 'resolved'"
        >Resolved roles</button>
        <button
          type="button"
          role="tab"
          :class="['iridis-demo__tab', { 'iridis-demo__tab--active': activeTab === 'schema' }]"
          :aria-selected="activeTab === 'schema'"
          @click="activeTab = 'schema'"
        >Role schema</button>
        <button
          type="button"
          role="tab"
          :class="['iridis-demo__tab', { 'iridis-demo__tab--active': activeTab === 'code' }]"
          :aria-selected="activeTab === 'code'"
          @click="activeTab = 'code'"
        >Code</button>
      </div>

      <!-- Tab: Resolved roles -->
      <div v-show="activeTab === 'resolved' && Object.keys(roles).length > 0" class="iridis-demo__panel">
        <div class="iridis-demo__roles">
          <div
            v-for="(c, name) in roles"
            :key="name"
            class="iridis-demo__role"
            :style="{ background: c.hex }"
          >
            <div class="iridis-demo__role-head">
              <span class="iridis-demo__role-name" :style="{ color: safeOnRoleColor(c) }">{{ name }}</span>
              <span
                v-if="contrastFor(c) !== null"
                class="iridis-demo__role-badge"
                :style="{ color: safeOnRoleColor(c), borderColor: safeOnRoleColor(c) + '55' }"
                :title="`contrast vs background: ${contrastFor(c)?.toFixed(2)}:1`"
              >{{ contrastBadge(contrastFor(c)) }}</span>
            </div>
            <span class="iridis-demo__role-hex" :style="{ color: safeOnRoleColor(c) }">{{ c.hex }}</span>
            <span class="iridis-demo__role-coords" :style="{ color: safeOnRoleColor(c) + 'b0' }">{{ fmtOklch(c) }}</span>
          </div>
        </div>
      </div>

      <!-- Tab: Role schema (editable) -->
      <div v-show="activeTab === 'schema'" class="iridis-demo__panel">
        <div class="iridis-demo__editor-hint">
          Edit the role schema. Validates against <code>RoleSchemaSchema</code> via json-tology — invalid edits do not propagate.
        </div>
        <textarea
          class="iridis-demo__textarea"
          :class="{ 'iridis-demo__textarea--invalid': schemaError !== null }"
          :value="localRoleSchemaText"
          spellcheck="false"
          rows="14"
          @input="onRoleSchemaInput"
        />
        <div v-if="schemaError" class="iridis-demo__validation">
          {{ schemaError }}
        </div>
      </div>

      <!-- Tab: Code (mostly read-only, with an editable colors block) -->
      <div v-show="activeTab === 'code'" class="iridis-demo__panel">
        <div class="iridis-demo__editor-hint">
          Boilerplate updates as you edit. The <code>colors</code> array is editable and validates against
          <code>{ minItems: 1, maxItems: 8, items: hex }</code>. Other lines are derived from your sidebar config.
        </div>
        <pre class="iridis-demo__code"><code>{{ codeText }}</code></pre>
        <label class="iridis-demo__editor-label">colors (editable)</label>
        <textarea
          class="iridis-demo__textarea iridis-demo__textarea--colors"
          :class="{ 'iridis-demo__textarea--invalid': colorsError !== null }"
          :value="localColorsText"
          spellcheck="false"
          rows="3"
          @input="onColorsInput"
        />
        <div v-if="colorsError" class="iridis-demo__validation">
          {{ colorsError }}
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.iridis-demo {
  margin: 1.25rem 0;
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--iridis-shadow-felt);
  overflow: hidden;
}

.iridis-demo__top {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.25rem;
  padding: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

@media (max-width: 720px) {
  .iridis-demo__top {
    grid-template-columns: 1fr;
  }
}

.iridis-demo__col-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.55rem;
}
.iridis-demo__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.iridis-demo__hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-style: italic;
}
.iridis-demo__swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-content: flex-start;
}
.iridis-demo__swatch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.55rem 0.3rem 0.3rem;
  background: var(--vp-c-bg);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-sm);
  cursor: pointer;
  box-shadow: var(--iridis-shadow-felt);
  transition: border-color 120ms, box-shadow 120ms, transform 120ms;
}
.iridis-demo__swatch:hover {
  border-color: var(--vp-c-text-2);
  box-shadow: var(--iridis-shadow-felt-hover);
  transform: translateY(-1px);
}
.iridis-demo__swatch--selected {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--iridis-shadow-felt-hover), 0 0 0 1px var(--vp-c-brand-1);
}
.iridis-demo__swatch-chip {
  display: inline-block;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}
.iridis-demo__swatch-hex {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}
.iridis-demo__swatch-remove {
  width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  color: var(--vp-c-text-3);
  border-radius: 2px;
  cursor: pointer;
}
.iridis-demo__swatch-remove:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.iridis-demo__swatch-add {
  padding: 0.45rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  background: color-mix(in oklch, var(--iridis-brand) 20%, var(--vp-c-bg));
  border: var(--iridis-border-soft);
  border-color: color-mix(in oklch, var(--iridis-brand) 40%, var(--iridis-divider));
  border-radius: var(--iridis-radius-sm);
  color: var(--iridis-on-brand);
  cursor: pointer;
  align-self: flex-start;
  box-shadow: var(--iridis-shadow-felt);
  transition: transform 120ms, box-shadow 120ms, background 120ms;
}
.iridis-demo__swatch-add:hover:not(:disabled) {
  background: color-mix(in oklch, var(--iridis-brand) 35%, var(--vp-c-bg));
  border-color: var(--iridis-brand);
  box-shadow: var(--iridis-shadow-felt-hover);
  transform: translateY(-1px);
}
.iridis-demo__swatch-add:active:not(:disabled) { box-shadow: var(--iridis-shadow-pressed); transform: translateY(0); }
.iridis-demo__swatch-add:disabled { opacity: 0.4; cursor: not-allowed; }

.iridis-demo__error {
  margin: 0;
  padding: 0.65rem 0.85rem;
  background: rgba(239, 68, 68, 0.12);
  border-bottom: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-size: 0.85rem;
}

.iridis-demo__tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.45rem 0.6rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.iridis-demo__tab {
  padding: 0.4rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.iridis-demo__tab:hover { color: var(--vp-c-text-1); }
.iridis-demo__tab--active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}

.iridis-demo__panel {
  padding: 1rem;
}

.iridis-demo__roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.5rem;
}
.iridis-demo__role {
  padding: 0.7rem 0.85rem;
  border-radius: var(--iridis-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.10);
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-height: 82px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -10px 14px rgba(0, 0, 0, 0.22),
    0 1px 2px rgba(0, 0, 0, 0.18),
    0 4px 12px -4px rgba(0, 0, 0, 0.25);
}
.iridis-demo__role-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}
.iridis-demo__role-name {
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.iridis-demo__role-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  padding: 0.05rem 0.35rem;
  border-radius: 2px;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.iridis-demo__role-hex,
.iridis-demo__role-coords {
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.iridis-demo__role-coords { font-size: 0.6rem; }

.iridis-demo__editor-hint {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.5rem;
  line-height: 1.45;
}
.iridis-demo__editor-hint code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  padding: 0.05rem 0.3rem;
  border-radius: 2px;
}
.iridis-demo__editor-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0.85rem 0 0.35rem;
}
.iridis-demo__textarea {
  width: 100%;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  line-height: 1.5;
  padding: 0.65rem 0.85rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-1);
  resize: vertical;
  min-height: 4rem;
}
.iridis-demo__textarea--invalid {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.06);
}
.iridis-demo__textarea--colors {
  min-height: 3.5rem;
}
.iridis-demo__validation {
  margin-top: 0.4rem;
  padding: 0.5rem 0.7rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  color: #ef4444;
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  white-space: pre-wrap;
}

.iridis-demo__code {
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: auto;
  max-height: 320px;
}
.iridis-demo__code code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
  white-space: pre;
}
</style>
