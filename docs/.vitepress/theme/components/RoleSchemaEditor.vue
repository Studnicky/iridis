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

import { computed, ref } from 'vue';

import Button from 'primevue/button';

const COLLAPSE_KEY = 'iridis-role-editor-collapse';
const rolesOpen = ref<boolean>(true);
const pairsOpen = ref<boolean>(true);

if (typeof window !== 'undefined') {
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    if (raw !== null) {
      const persisted = JSON.parse(raw) as { 'roles'?: boolean; 'pairs'?: boolean };
      if (typeof persisted.roles === 'boolean') rolesOpen.value = persisted.roles;
      if (typeof persisted.pairs === 'boolean') pairsOpen.value = persisted.pairs;
    }
  } catch { /* noop */ }
}

function persistCollapse(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify({
      'roles': rolesOpen.value,
      'pairs': pairsOpen.value,
    }));
  } catch { /* noop */ }
}

function toggleRoles(): void {
  rolesOpen.value = !rolesOpen.value;
  persistCollapse();
}
function togglePairs(): void {
  pairsOpen.value = !pairsOpen.value;
  persistCollapse();
}

import type { RoleSchemaInterface, RoleDefinitionInterface, ContrastPairInterface, ColorIntentType } from '@studnicky/iridis/model';

import RoleCard from './RoleCard.vue';
import PairCard from './PairCard.vue';

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
  const pair = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-32']!;
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
      <section class="role-editor__section" :class="{ 'role-editor__section--collapsed': !rolesOpen }">
        <header class="role-editor__head">
          <button
            type="button"
            class="role-editor__toggle"
            :aria-expanded="rolesOpen"
            :aria-controls="'role-editor-roles-body'"
            :title="rolesOpen ? 'Collapse roles section' : 'Expand roles section'"
            @click="toggleRoles"
          >
            <span class="role-editor__chevron" :class="{ 'role-editor__chevron--open': rolesOpen }" aria-hidden="true">▸</span>
            <h3 title="Each role becomes a CSS variable (--c-{name}) and a slot in `state.roles`. The engine resolves the input palette into these roles by nudging colors into the declared OKLCH envelopes.">Roles</h3>
            <span class="role-editor__count">({{ roles.length }})</span>
          </button>
          <Button
            type="button"
            label="+ add role"
            size="small"
            class="role-editor__add"
            title="Append a new role to the schema with default lightness 0.40–0.60 and chroma 0–0.10. The dispatcher publishes a new custom-<timestamp> schema and swaps the active pointer."
            @click="addRole"
          />
        </header>
        <div v-show="rolesOpen" id="role-editor-roles-body" class="role-editor__grid">
          <RoleCard
            v-for="(role, idx) in roles"
            :key="idx"
            :role="role"
            :intent-options="intentOptions"
            :derived-from-options="derivedFromOptions"
            :removable="roles.length > 1"
            @update:name="(v) => updateRole(idx, { 'name': v })"
            @update:intent="(v) => setIntent(idx, v)"
            @update:required="(v) => updateRole(idx, { 'required': v })"
            @update:range="(field, which, value) => setRange(idx, field, which, value)"
            @update:derived-from="(v) => toggleDerivedFrom(idx, v)"
            @update:hue-lock="(enabled) => toggleHueOffset(idx, enabled)"
            @update:hue-offset="(v) => updateRole(idx, { 'hueOffset': v })"
            @remove="removeRole(idx)"
          />
        </div>
      </section>

      <!-- Contrast pairs -->
      <section class="role-editor__section" :class="{ 'role-editor__section--collapsed': !pairsOpen }">
        <header class="role-editor__head">
          <button
            type="button"
            class="role-editor__toggle"
            :aria-expanded="pairsOpen"
            :aria-controls="'role-editor-pairs-body'"
            :title="pairsOpen ? 'Collapse contrast pairs section' : 'Expand contrast pairs section'"
            @click="togglePairs"
          >
            <span class="role-editor__chevron" :class="{ 'role-editor__chevron--open': pairsOpen }" aria-hidden="true">▸</span>
            <h3 title="Each contrast pair declares a minimum legibility contract the engine MUST enforce. enforce:contrast nudges colors along the lightness axis until every pair holds.">Contrast pairs</h3>
            <span class="role-editor__count">({{ pairs.length }})</span>
          </button>
          <Button
            type="button"
            label="+ add pair"
            size="small"
            class="role-editor__add"
            :disabled="roles.length < 2"
            title="Add a new contrast pair. Disabled until the schema has at least two roles to pair."
            @click="addPair"
          />
        </header>
        <p v-if="pairsOpen && pairs.length === 0" class="role-editor__empty">No contrast pairs declared yet — add one to enforce a minimum ratio between two roles.</p>
        <div v-show="pairsOpen" id="role-editor-pairs-body" class="role-editor__grid">
          <PairCard
            v-for="(pair, idx) in pairs"
            :key="idx"
            :pair="pair"
            :role-options="derivedFromOptions"
            :algorithm-options="algorithmOptions"
            @update:foreground="(v) => updatePair(idx, { 'foreground': v })"
            @update:background="(v) => updatePair(idx, { 'background': v })"
            @update:min-ratio="(v) => updatePair(idx, { 'minRatio': v })"
            @update:algorithm="(v) => updatePair(idx, { 'algorithm': v })"
            @remove="removePair(idx)"
          />
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

/* Section-title toggle: chevron + heading + count, clickable as one
   target. Mirrors the way VitePress sidebar groups collapse to their
   title. localStorage-persisted so the user's open/closed choice
   survives reloads. */
.role-editor__toggle {
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}
.role-editor__toggle:hover h3,
.role-editor__toggle:hover .role-editor__count {
  color: var(--iridis-brand, var(--vp-c-brand-1));
}
.role-editor__chevron {
  display: inline-block;
  font-size: 0.72rem;
  line-height: 1;
  color: var(--vp-c-text-3);
  transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: 35% 50%;
}
.role-editor__chevron--open {
  transform: rotate(90deg);
}
.role-editor__count {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-weight: 500;
}
.role-editor__section--collapsed .role-editor__head {
  margin-bottom: 0;
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

/* Card grid — auto-fill columns reflow 1/2/3-wide as the drawer
   expands. minmax(16rem, 1fr) keeps cards legible at 320 px panels
   and stops them sprawling on wide monitors. */
.role-editor__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.6rem;
  min-width: 0;
}

.role-editor__empty {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin: 0.3rem 0;
}
</style>
