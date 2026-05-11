<script setup lang="ts">
/**
 * IridisDemo.vue — split-column live engine demo.
 *
 * Layout:
 *   ┌──────────────────────┬──────────────────────────┐
 *   │ PALETTE (left)       │ OKLCH PICKER (right)     │
 *   │ click to select      │ for the selected color   │
 *   ├──────────────────────┴──────────────────────────┤
 *   │ PrimeVue Tabs:                                  │
 *   │   • Roles schema   — visual editor              │
 *   │   • Resolved roles — swatch grid (read-only)    │
 *   │   • Code           — TS that updates as you edit│
 *   └──────────────────────────────────────────────────┘
 *
 * Tabs, textareas, and the + add / × remove buttons come from PrimeVue;
 * the swatch grid and role tile rendering stay custom because they paint
 * with engine-resolved colors and need ad-hoc layout. The colors[] block
 * in the Code tab is editable via PrimeVue Textarea + json-tology
 * validation; invalid edits keep the prior valid state in effect.
 */

import { computed, onMounted, ref, watch } from 'vue';

import Tabs       from 'primevue/tabs';
import TabList    from 'primevue/tablist';
import Tab        from 'primevue/tab';
import TabPanels  from 'primevue/tabpanels';
import TabPanel   from 'primevue/tabpanel';
import Textarea   from 'primevue/textarea';
import Button     from 'primevue/button';

import { Engine, mathBuiltins, coreTasks, contrastWcag21, colorRecordFactory } from '@studnicky/iridis';
import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterface,
} from '@studnicky/iridis/model';

import IridisPicker        from './IridisPicker.vue';
import RoleSchemaEditor    from './RoleSchemaEditor.vue';
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

const state          = ref<PaletteStateInterface | null>(null);
const error          = ref<string | null>(null);
const selectedSwatch = ref<number>(0);
const activeTab      = ref<string>('resolved');

const localRoleSchemaText = ref<string>('');
const localColorsText     = ref<string>('');
const schemaError         = ref<string | null>(null);
const colorsError         = ref<string | null>(null);

function buildInput(): InputInterface {
  const pair   = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-16'];
  const schema = pair[configStore.framing];
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
  const pair   = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-16'];
  const schema = pair[configStore.framing];
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

/** Inline editor: Role schema textarea (currently unused by the visual
 *  editor tab, but exposed for the validators in case a future
 *  consumer wants the JSON path). */
function onRoleSchemaInput(text: string): void {
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
  const inline = parsed as RoleSchemaInterface;
  (roleSchemaByName as Record<string, RoleSchemaInterface>)[inline.name] = inline;
  configStore.roleSchema = inline.name;
}
void onRoleSchemaInput;

/** Inline editor: colors textarea (Code tab). */
function onColorsInput(text: string): void {
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

const roles       = computed(() => state.value?.roles ?? {} as Record<string, ColorRecordInterface>);
const canAdd      = computed(() => props.allowAdd && configStore.paletteColors.length < props.maxColors);
const canRemove   = computed(() => configStore.paletteColors.length > props.minColors);
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
            <Button
              v-if="allowAdd"
              type="button"
              label="+ add"
              size="small"
              :disabled="!canAdd"
              :aria-label="canAdd ? 'Add color to palette' : 'Palette full'"
              class="iridis-demo__swatch-add"
              @click="addColor"
            />
            <Button
              v-for="(color, idx) in configStore.paletteColors"
              :key="idx"
              :severity="selectedSwatch === idx ? 'primary' : 'secondary'"
              :variant="selectedSwatch === idx ? undefined : 'outlined'"
              size="small"
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
                :aria-label="`remove palette color ${idx + 1}`"
                @click.stop="removeColor(idx)"
              >×</span>
            </Button>
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

      <Tabs v-model:value="activeTab" class="iridis-demo__tabs">
        <TabList>
          <Tab value="resolved">Resolved roles</Tab>
          <Tab value="schema">Role schema</Tab>
          <Tab value="code">Code</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="resolved">
            <div v-if="Object.keys(roles).length > 0" class="iridis-demo__roles">
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
          </TabPanel>

          <TabPanel value="schema">
            <div class="iridis-demo__editor-hint">
              Compose your role schema visually. Each row is a role: name it, optionally tag its intent, set lightness and chroma envelopes, and lock a hue or derive it from another role. Add contrast pairs to require minimum ratios — the engine nudges colors until every pair holds.
            </div>
            <RoleSchemaEditor />
          </TabPanel>

          <TabPanel value="code">
            <div class="iridis-demo__editor-hint">
              Boilerplate updates as you edit. The <code>colors</code> array is editable and validates against
              <code>{ minItems: 1, maxItems: 8, items: hex }</code>. Other lines are derived from your sidebar config.
            </div>
            <pre class="iridis-demo__code"><code>{{ codeText }}</code></pre>
            <label class="iridis-demo__editor-label">colors (editable)</label>
            <Textarea
              :model-value="localColorsText"
              spellcheck="false"
              :rows="3"
              :class="['iridis-demo__textarea', 'iridis-demo__textarea--colors', { 'iridis-demo__textarea--invalid': colorsError !== null }]"
              @update:model-value="(v) => onColorsInput(v ?? '')"
            />
            <div v-if="colorsError" class="iridis-demo__validation">
              {{ colorsError }}
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </ClientOnly>
</template>

<style scoped>
/* Container-query host: child layout decisions derive from the demo's
   own width, not the viewport. The demo packs into the right panel
   (≈ 320–720px) on desktop and into full width (≈ 600–1100px) on narrow
   viewports — same component, two contexts, one set of intrinsic rules. */
.iridis-demo {
  container-type: inline-size;
  container-name: demo;
  margin: 1.25rem 0;
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--iridis-shadow-felt);
  overflow: hidden;
}

.iridis-demo__top {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  padding: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
@container demo (min-width: 540px) {
  .iridis-demo__top {
    grid-template-columns: minmax(0, 1fr) auto;
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
  transition:
    background-color var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
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
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 15%, transparent);
  color: var(--iridis-error, var(--iridis-text, currentColor));
}

/* + add button — PrimeVue Button with iridis chrome layered on top. */
.iridis-demo__swatch-add {
  align-self: flex-start;
}
.iridis-demo__swatch-add :deep(.p-button) {
  background:    color-mix(in oklch, var(--iridis-brand) 20%, var(--vp-c-bg));
  border:        var(--iridis-border-soft);
  border-color:  color-mix(in oklch, var(--iridis-brand) 40%, var(--iridis-divider));
  border-radius: var(--iridis-radius-sm);
  color:         var(--iridis-on-brand);
  box-shadow:    var(--iridis-shadow-felt);
  font-weight:   600;
  font-size:     0.78rem;
  padding:       0.45rem 0.85rem;
}
.iridis-demo__swatch-add :deep(.p-button:hover:not(:disabled)) {
  background:   color-mix(in oklch, var(--iridis-brand) 35%, var(--vp-c-bg));
  border-color: var(--iridis-brand);
  box-shadow:   var(--iridis-shadow-felt-hover);
}

.iridis-demo__error {
  margin: 0;
  padding: 0.65rem 0.85rem;
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 12%, transparent);
  border-bottom: 1px solid color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 40%, transparent);
  color: var(--iridis-error, var(--iridis-text, currentColor));
  font-size: 0.85rem;
}

/* PrimeVue Tabs paint with --p-* tokens (rewired to iridis vars in the
   preset). The override here keeps the small typography + border-bottom
   underline pattern the docs use. */
.iridis-demo__tabs :deep(.p-tablist) {
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0.45rem 0.6rem 0;
}
.iridis-demo__tabs :deep(.p-tab) {
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  color: var(--vp-c-text-2);
}
.iridis-demo__tabs :deep(.p-tab[aria-selected="true"]) {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}
.iridis-demo__tabs :deep(.p-tabpanels),
.iridis-demo__tabs :deep(.p-tabpanel) {
  background: transparent;
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
.iridis-demo__textarea :deep(.p-textarea) {
  width: 100%;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  line-height: 1.5;
  padding: 0.65rem 0.85rem;
  border-radius: 4px;
  resize: vertical;
  min-height: 4rem;
}
.iridis-demo__textarea--invalid :deep(.p-textarea) {
  border-color: var(--iridis-error, var(--iridis-text, currentColor));
  background:   color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 6%, transparent);
}
.iridis-demo__textarea--colors :deep(.p-textarea) {
  min-height: 3.5rem;
}
.iridis-demo__validation {
  margin-top: 0.4rem;
  padding: 0.5rem 0.7rem;
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 10%, transparent);
  border: 1px solid color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 40%, transparent);
  border-radius: 4px;
  color: var(--iridis-error, var(--iridis-text, currentColor));
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
