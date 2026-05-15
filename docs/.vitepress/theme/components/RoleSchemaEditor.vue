<script setup lang="ts">
/**
 * RoleSchemaEditor.vue
 *
 * Visual editor for an iridis role schema. Designers compose a schema
 * row-by-row instead of editing JSON.
 *
 * All inputs are PrimeVue primitives (InputText, Select, Checkbox,
 * InputNumber, Button); the surrounding role-card containers stay
 * div-based with iridis chrome (business-card shadow + radius). The
 * PrimeVue components inherit their color tokens from the iridisPreset
 * so they re-tint when the active palette changes.
 *
 * Two-way bound to the configStore-registered active role schema.
 * Edits propagate via roleSchemaByName mutation + configStore.roleSchema
 * swap.
 */

import { computed } from 'vue';

import InputText   from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select      from 'primevue/select';
import Checkbox    from 'primevue/checkbox';
import Button      from 'primevue/button';

import type { RoleSchemaInterface, RoleDefinitionInterface, ContrastPairInterface, ColorIntentType } from '@studnicky/iridis/model';

import { configStore }      from '../stores/configStore.ts';
import { editRoleSchema }   from '../stores/themeDispatcher.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

/* Canonical 10-value `ColorIntentType` union (post-R1.6). The picker
   surfaces these in tier order: core ontology first, signal-family next,
   interaction-family last. */
const INTENTS: readonly ColorIntentType[] = [
  'text', 'background', 'accent', 'muted',
  'critical', 'positive',
  'link', 'button', 'onAccent', 'onButton',
];

const intentOptions = [
  { 'label': 'no intent', 'value': '' },
  ...INTENTS.map((i): { 'label': string; 'value': string } => ({ 'label': i, 'value': i })),
];

const algorithmOptions = [
  { 'label': 'WCAG 2.1', 'value': 'wcag21' },
  { 'label': 'APCA',     'value': 'apca'   },
];

const schema = computed<RoleSchemaInterface>(() => {
  const pair = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-16']!;
  return pair[configStore.framing];
});

const roles = computed(() => [...schema.value.roles]);
const pairs = computed(() => [...(schema.value.contrastPairs ?? [])]);
const roleNames = computed(() => roles.value.map((r) => r.name));

const derivedFromOptions = computed(() => roleNames.value.map((n) => ({ 'label': n, 'value': n })));

/* The editor never mutates the registry directly. Every change builds a
   fresh `RoleSchemaInterface` and dispatches it through the theme
   dispatcher, which registers a `custom-<timestamp>` pair and swaps the
   active pointer atomically. The dispatcher owns the pair shape so
   downstream consumers (`applyConfigToDocument`, `IridisDemo`) always
   see a complete `{ dark, light }` entry. */
function commit(next: RoleSchemaInterface): void {
  editRoleSchema(next);
}

function updateRole(idx: number, patch: Partial<RoleDefinitionInterface>): void {
  const nextRoles = roles.value.map((r, i): RoleDefinitionInterface => i === idx ? { ...r, ...patch } : r);
  commit({ ...schema.value, 'roles': nextRoles });
}

function addRole(): void {
  const next: RoleDefinitionInterface = {
    'name':           `role${roles.value.length + 1}`,
    'required':       false,
    'lightnessRange': [0.40, 0.60],
    'chromaRange':    [0, 0.10],
  };
  commit({ ...schema.value, 'roles': [...roles.value, next] });
}

function removeRole(idx: number): void {
  if (roles.value.length <= 1) return;
  const removed = roles.value[idx]!.name;
  const nextRoles = roles.value.filter((_, i) => i !== idx);
  const nextPairs = pairs.value.filter((p) => p.foreground !== removed && p.background !== removed);
  commit({ ...schema.value, 'roles': nextRoles, 'contrastPairs': nextPairs });
}

function setRange(idx: number, field: 'lightnessRange' | 'chromaRange', which: 0 | 1, value: number): void {
  const role = roles.value[idx]!;
  const cur = role[field] ?? (field === 'lightnessRange' ? [0, 1] as const : [0, 0.5] as const);
  const next = which === 0 ? [value, cur[1]] as [number, number] : [cur[0], value] as [number, number];
  updateRole(idx, { [field]: next });
}

function toggleHueOffset(idx: number, enabled: boolean): void {
  const role = roles.value[idx]!;
  if (!enabled) {
    const { hueOffset: _drop, ...rest } = role;
    void _drop;
    commit({ ...schema.value, 'roles': roles.value.map((r, i) => i === idx ? rest as RoleDefinitionInterface : r) });
  } else {
    updateRole(idx, { 'hueOffset': 200 });
  }
}

function toggleDerivedFrom(idx: number, value: string): void {
  const role = roles.value[idx]!;
  if (value === '' || value === null || value === undefined) {
    const { derivedFrom: _drop, ...rest } = role;
    void _drop;
    commit({ ...schema.value, 'roles': roles.value.map((r, i) => i === idx ? rest as RoleDefinitionInterface : r) });
  } else {
    updateRole(idx, { 'derivedFrom': value });
  }
}

function setIntent(idx: number, value: string): void {
  const next = (value === '' || value === null || value === undefined) ? undefined : value as ColorIntentType;
  updateRole(idx, { 'intent': next });
}

function addPair(): void {
  if (roles.value.length < 2) return;
  const next: ContrastPairInterface = {
    'foreground': roles.value[0]!.name,
    'background': roles.value[1]!.name,
    'minRatio':   4.5,
    'algorithm':  'wcag21',
  };
  commit({ ...schema.value, 'contrastPairs': [...pairs.value, next] });
}

function updatePair(idx: number, patch: Partial<ContrastPairInterface>): void {
  const nextPairs = pairs.value.map((p, i): ContrastPairInterface => i === idx ? { ...p, ...patch } : p);
  commit({ ...schema.value, 'contrastPairs': nextPairs });
}

function removePair(idx: number): void {
  const nextPairs = pairs.value.filter((_, i) => i !== idx);
  commit({ ...schema.value, 'contrastPairs': nextPairs });
}
</script>

<template>
  <ClientOnly>
    <div class="role-editor">
      <!-- Roles -->
      <section class="role-editor__section">
        <header class="role-editor__head">
          <h3>Roles</h3>
          <Button
            type="button"
            label="+ add role"
            size="small"
            class="role-editor__add"
            @click="addRole"
          />
        </header>
        <div class="role-editor__roles">
          <article v-for="(role, idx) in roles" :key="idx" class="role-editor__role">
            <div class="role-editor__role-row">
              <InputText
                :model-value="role.name"
                placeholder="role name"
                spellcheck="false"
                size="small"
                class="role-editor__name"
                @update:model-value="(v) => updateRole(idx, { 'name': v ?? '' })"
              />
              <Select
                :model-value="role.intent ?? ''"
                :options="intentOptions"
                option-label="label"
                option-value="value"
                size="small"
                class="role-editor__intent"
                @update:model-value="(v) => setIntent(idx, v)"
              />
              <label class="role-editor__required">
                <Checkbox
                  :model-value="role.required ?? false"
                  binary
                  @update:model-value="(v) => updateRole(idx, { 'required': Boolean(v) })"
                />
                required
              </label>
              <Button
                type="button"
                icon-pos="left"
                severity="secondary"
                size="small"
                class="role-editor__remove"
                :disabled="roles.length <= 1"
                :aria-label="`remove ${role.name}`"
                @click="removeRole(idx)"
              >
                <span aria-hidden="true">×</span>
              </Button>
            </div>
            <div class="role-editor__ranges">
              <label>
                <span>lightness</span>
                <span class="role-editor__range">
                  <InputNumber
                    :model-value="role.lightnessRange?.[0] ?? 0"
                    :min="0" :max="1" :step="0.01"
                    :max-fraction-digits="2"
                    :show-buttons="false"
                    size="small"
                    @update:model-value="(v) => setRange(idx, 'lightnessRange', 0, Number(v ?? 0))"
                  />
                  <span>→</span>
                  <InputNumber
                    :model-value="role.lightnessRange?.[1] ?? 1"
                    :min="0" :max="1" :step="0.01"
                    :max-fraction-digits="2"
                    :show-buttons="false"
                    size="small"
                    @update:model-value="(v) => setRange(idx, 'lightnessRange', 1, Number(v ?? 1))"
                  />
                </span>
              </label>
              <label>
                <span>chroma</span>
                <span class="role-editor__range">
                  <InputNumber
                    :model-value="role.chromaRange?.[0] ?? 0"
                    :min="0" :max="0.5" :step="0.01"
                    :max-fraction-digits="2"
                    :show-buttons="false"
                    size="small"
                    @update:model-value="(v) => setRange(idx, 'chromaRange', 0, Number(v ?? 0))"
                  />
                  <span>→</span>
                  <InputNumber
                    :model-value="role.chromaRange?.[1] ?? 0.5"
                    :min="0" :max="0.5" :step="0.01"
                    :max-fraction-digits="2"
                    :show-buttons="false"
                    size="small"
                    @update:model-value="(v) => setRange(idx, 'chromaRange', 1, Number(v ?? 0.5))"
                  />
                </span>
              </label>
              <label>
                <span>derived from</span>
                <Select
                  :model-value="role.derivedFrom ?? ''"
                  :options="[{ 'label': '— none —', 'value': '' }, ...derivedFromOptions.filter((o) => o.value !== role.name)]"
                  option-label="label"
                  option-value="value"
                  size="small"
                  @update:model-value="(v) => toggleDerivedFrom(idx, String(v ?? ''))"
                />
              </label>
              <label>
                <span>hue lock</span>
                <span class="role-editor__hue">
                  <Checkbox
                    :model-value="role.hueOffset !== undefined"
                    binary
                    @update:model-value="(v) => toggleHueOffset(idx, Boolean(v))"
                  />
                  <InputNumber
                    v-if="role.hueOffset !== undefined"
                    :model-value="Math.round(role.hueOffset)"
                    :min="0" :max="359"
                    :show-buttons="false"
                    size="small"
                    @update:model-value="(v) => updateRole(idx, { 'hueOffset': Number(v ?? 0) })"
                  />
                </span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <!-- Contrast pairs -->
      <section class="role-editor__section">
        <header class="role-editor__head">
          <h3>Contrast pairs</h3>
          <Button
            type="button"
            label="+ add pair"
            size="small"
            class="role-editor__add"
            :disabled="roles.length < 2"
            @click="addPair"
          />
        </header>
        <p v-if="pairs.length === 0" class="role-editor__empty">No contrast pairs declared yet — add one to enforce a minimum ratio between two roles.</p>
        <div class="role-editor__pairs">
          <article v-for="(pair, idx) in pairs" :key="idx" class="role-editor__pair">
            <label>
              <span>foreground</span>
              <Select
                :model-value="pair.foreground"
                :options="derivedFromOptions"
                option-label="label"
                option-value="value"
                size="small"
                @update:model-value="(v) => updatePair(idx, { 'foreground': String(v ?? '') })"
              />
            </label>
            <label>
              <span>on</span>
              <Select
                :model-value="pair.background"
                :options="derivedFromOptions"
                option-label="label"
                option-value="value"
                size="small"
                @update:model-value="(v) => updatePair(idx, { 'background': String(v ?? '') })"
              />
            </label>
            <label>
              <span>min ratio</span>
              <InputNumber
                :model-value="pair.minRatio"
                :min="1" :max="100" :step="0.5"
                :max-fraction-digits="1"
                :show-buttons="false"
                size="small"
                @update:model-value="(v) => updatePair(idx, { 'minRatio': Number(v ?? 1) })"
              />
            </label>
            <label>
              <span>via</span>
              <Select
                :model-value="pair.algorithm ?? 'wcag21'"
                :options="algorithmOptions"
                option-label="label"
                option-value="value"
                size="small"
                @update:model-value="(v) => updatePair(idx, { 'algorithm': String(v ?? 'wcag21') as 'wcag21' | 'apca' })"
              />
            </label>
            <Button
              type="button"
              severity="secondary"
              size="small"
              class="role-editor__remove"
              :aria-label="`remove pair ${idx + 1}`"
              @click="removePair(idx)"
            >
              <span aria-hidden="true">×</span>
            </Button>
          </article>
        </div>
      </section>
    </div>
  </ClientOnly>
</template>

<style scoped>
.role-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.role-editor__section {
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  box-shadow: var(--iridis-shadow-felt);
}
.role-editor__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}
.role-editor__head h3 {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0;
  padding: 0;
  border: 0;
}

/* + add button — iridis chrome on top of PrimeVue Button. */
.role-editor__add :deep(.p-button) {
  padding: 0.3rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 600;
  background:    color-mix(in oklch, var(--iridis-brand) 20%, var(--vp-c-bg));
  border:        var(--iridis-border-soft);
  border-color:  color-mix(in oklch, var(--iridis-brand) 40%, var(--iridis-divider));
  border-radius: var(--iridis-radius-sm);
  color:         var(--iridis-on-brand);
  box-shadow:    var(--iridis-shadow-felt);
}
.role-editor__add :deep(.p-button:hover:not(:disabled)) {
  background:   color-mix(in oklch, var(--iridis-brand) 35%, var(--vp-c-bg));
  border-color: var(--iridis-brand);
  box-shadow:   var(--iridis-shadow-felt-hover);
}

.role-editor__roles,
.role-editor__pairs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.role-editor__role,
.role-editor__pair {
  padding: 0.65rem 0.75rem;
  background: var(--vp-c-bg);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  box-shadow: var(--iridis-shadow-felt);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

/* Header row — name, intent, required toggle, remove. Single line at any
   panel width; the name input flexes, secondary controls stay compact. */
.role-editor__role-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.4rem;
  align-items: center;
  min-width: 0;
}
.role-editor__role-row > .role-editor__name {
  flex: 1 1 auto;
  min-width: 0;
}
.role-editor__role-row > .role-editor__intent {
  flex: 0 0 7rem;
}
.role-editor__role-row > .role-editor__required {
  flex: 0 0 auto;
}
.role-editor__role-row > .role-editor__remove {
  flex: 0 0 auto;
}

/* Shared input chrome — PrimeVue paints color via --p-*, this layer
   matches the mono font + small footprint the editor expects. */
.role-editor__role :deep(.p-inputtext),
.role-editor__role :deep(.p-select-label),
.role-editor__role :deep(.p-inputnumber-input),
.role-editor__pair :deep(.p-inputtext),
.role-editor__pair :deep(.p-select-label),
.role-editor__pair :deep(.p-inputnumber-input) {
  padding: 0.32rem 0.45rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  border-radius: var(--iridis-radius-sm);
  /* `text-transform: uppercase` lives on the legend `<span>`s only, not
     the wrapping <label>, so inputs and dropdown labels render at their
     authored case (e.g. role names like `background`, not `BACKGROUND`). */
  text-transform: none;
}

.role-editor__required {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  padding: 0.25rem 0.55rem;
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-sm);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

/* × remove — PrimeVue Button shrunk to squircle icon-only square. */
.role-editor__remove :deep(.p-button) {
  width: 1.6rem;
  height: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--iridis-radius);
  background: var(--vp-c-bg-soft);
  border: var(--iridis-card-border);
  color: var(--vp-c-text-3);
  font-size: 1rem;
  line-height: 1;
  box-shadow: var(--iridis-card-shadow);
}
.role-editor__remove :deep(.p-button:hover:not(:disabled)) {
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 18%, transparent);
  color:      var(--iridis-error, var(--iridis-text, currentColor));
  box-shadow: var(--iridis-card-shadow-hover);
}
.role-editor__remove :deep(.p-button:disabled) { opacity: 0.3; cursor: not-allowed; }

/* Constraints bar — single horizontal row holding L range, C range,
   derived-from select, and the optional hue lock. Labels above values;
   uppercase scoped to the legend `<span>` only. Items wrap as a group
   so a narrow panel doesn't tear individual controls apart. */
.role-editor__ranges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 0.85rem;
  align-items: end;
}
.role-editor__ranges > label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 0 1 auto;
}
.role-editor__ranges > label > span:first-child {
  font-size: 0.62rem;
  color: var(--vp-c-text-3);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.role-editor__range,
.role-editor__hue {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}
.role-editor__range :deep(.p-inputnumber),
.role-editor__hue   :deep(.p-inputnumber) {
  flex: 0 0 4.25rem;
  min-width: 0;
}
.role-editor__range > span {
  /* The `→` separator stays at its authored case regardless of the
     legend-span uppercase rule above. */
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  text-transform: none;
}
/* The derived-from <Select> needs full-width inside its label cell so
   long role names don't truncate to BACK… / ON-B…. */
.role-editor__ranges > label > :deep(.p-select) {
  width: 9rem;
}

.role-editor__pair {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  grid-template-areas:
    'fg fg     remove'
    'on on     remove'
    'ratio via via';
  align-items: end;
  gap: 0.5rem 0.5rem;
}
.role-editor__pair label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.62rem;
  color: var(--vp-c-text-3);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  min-width: 0;
}
.role-editor__pair > label:nth-of-type(1) { grid-area: fg; }
.role-editor__pair > label:nth-of-type(2) { grid-area: on; }
.role-editor__pair > label:nth-of-type(3) { grid-area: ratio; }
.role-editor__pair > label:nth-of-type(4) { grid-area: via; }
.role-editor__pair > .role-editor__remove {
  grid-area: remove;
  align-self: end;
}
.role-editor__pair :deep(.p-select),
.role-editor__pair :deep(.p-inputnumber) {
  width: 100%;
  min-width: 0;
}
.role-editor__pair :deep(.p-select-label) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-editor__empty {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin: 0.3rem 0;
}
</style>
