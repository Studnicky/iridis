<script setup lang="ts">
/**
 * RoleSchemaEditor.vue
 *
 * Visual editor for an iridis role schema. Designers compose a schema
 * row-by-row instead of editing JSON:
 *
 *   - Roles list. Each row: name, intent (dropdown), required, lightness
 *     range slider pair, chroma range slider pair, optional hueOffset
 *     number, optional derivedFrom dropdown (lists other roles).
 *   - Contrast pairs list. Each row: foreground role (dropdown of declared
 *     roles), background role (dropdown), minRatio number, algorithm
 *     (wcag21 / apca).
 *
 * Two-way bound to the configStore-registered active role schema. Edits
 * propagate via roleSchemaByName mutation + configStore.roleSchema swap.
 */

import { computed } from 'vue';

import type { RoleSchemaInterface, RoleDefinitionInterface, ContrastPairInterface, ColorIntentType } from '@studnicky/iridis/model';

import { configStore }      from '../stores/configStore.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const INTENTS: readonly ColorIntentType[] = [
  'base', 'accent', 'muted', 'critical', 'positive', 'neutral', 'surface', 'text',
];

// Active schema — read from the registry by configStore.roleSchema name,
// then pick the variant matching the current framing.
const schema = computed<RoleSchemaInterface>(() => {
  const pair = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-16']!;
  return pair[configStore.framing];
});

const roles = computed(() => [...schema.value.roles]);
const pairs = computed(() => [...(schema.value.contrastPairs ?? [])]);
const roleNames = computed(() => roles.value.map((r) => r.name));

// Mutating helpers — write a new schema object back into the registry,
// then swap configStore.roleSchema to a unique name so reactivity fires.
function commit(next: RoleSchemaInterface): void {
  const name = `custom-${Date.now()}`;
  const named: RoleSchemaInterface = { ...next, 'name': name };
  (roleSchemaByName as Record<string, RoleSchemaInterface>)[name] = named;
  configStore.roleSchema = name;
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
  // Drop any contrast pair that references the removed role.
  const nextPairs = pairs.value.filter((p) => p.foreground !== removed && p.background !== removed);
  commit({ ...schema.value, 'roles': nextRoles, 'contrastPairs': nextPairs });
}

function setRange(idx: number, field: 'lightnessRange' | 'chromaRange', which: 0 | 1, value: number): void {
  const role = roles.value[idx]!;
  const cur = role[field] ?? (field === 'lightnessRange' ? [0, 1] as const : [0, 0.5] as const);
  const next = which === 0 ? [value, cur[1]] as [number, number] : [cur[0], value] as [number, number];
  updateRole(idx, { [field]: next });
}

function toggleHueOffset(idx: number): void {
  const role = roles.value[idx]!;
  if (role.hueOffset !== undefined) {
    const { hueOffset: _drop, ...rest } = role;
    void _drop;
    commit({ ...schema.value, 'roles': roles.value.map((r, i) => i === idx ? rest as RoleDefinitionInterface : r) });
  } else {
    updateRole(idx, { 'hueOffset': 200 });
  }
}

function toggleDerivedFrom(idx: number, value: string): void {
  const role = roles.value[idx]!;
  if (value === '') {
    const { derivedFrom: _drop, ...rest } = role;
    void _drop;
    commit({ ...schema.value, 'roles': roles.value.map((r, i) => i === idx ? rest as RoleDefinitionInterface : r) });
  } else {
    updateRole(idx, { 'derivedFrom': value });
  }
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
          <button type="button" class="role-editor__add" @click="addRole">+ add role</button>
        </header>
        <div class="role-editor__roles">
          <article v-for="(role, idx) in roles" :key="idx" class="role-editor__role">
            <div class="role-editor__role-row">
              <input
                type="text" class="role-editor__name"
                :value="role.name" placeholder="role name" spellcheck="false"
                @input="(e) => updateRole(idx, { 'name': (e.target as HTMLInputElement).value })"
              />
              <select
                class="role-editor__intent"
                :value="role.intent ?? ''"
                @change="(e) => updateRole(idx, { 'intent': ((e.target as HTMLSelectElement).value || undefined) as ColorIntentType | undefined })"
              >
                <option value="">no intent</option>
                <option v-for="i in INTENTS" :key="i" :value="i">{{ i }}</option>
              </select>
              <label class="role-editor__required">
                <input type="checkbox" :checked="role.required ?? false"
                       @change="(e) => updateRole(idx, { 'required': (e.target as HTMLInputElement).checked })" />
                required
              </label>
              <button type="button" class="role-editor__remove" :disabled="roles.length <= 1"
                      :aria-label="`remove ${role.name}`" @click="removeRole(idx)">×</button>
            </div>
            <div class="role-editor__ranges">
              <label>
                <span>lightness</span>
                <span class="role-editor__range">
                  <input type="number" min="0" max="1" step="0.01"
                         :value="(role.lightnessRange?.[0] ?? 0).toFixed(2)"
                         @input="(e) => setRange(idx, 'lightnessRange', 0, Number((e.target as HTMLInputElement).value))" />
                  <span>→</span>
                  <input type="number" min="0" max="1" step="0.01"
                         :value="(role.lightnessRange?.[1] ?? 1).toFixed(2)"
                         @input="(e) => setRange(idx, 'lightnessRange', 1, Number((e.target as HTMLInputElement).value))" />
                </span>
              </label>
              <label>
                <span>chroma</span>
                <span class="role-editor__range">
                  <input type="number" min="0" max="0.5" step="0.01"
                         :value="(role.chromaRange?.[0] ?? 0).toFixed(2)"
                         @input="(e) => setRange(idx, 'chromaRange', 0, Number((e.target as HTMLInputElement).value))" />
                  <span>→</span>
                  <input type="number" min="0" max="0.5" step="0.01"
                         :value="(role.chromaRange?.[1] ?? 0.5).toFixed(2)"
                         @input="(e) => setRange(idx, 'chromaRange', 1, Number((e.target as HTMLInputElement).value))" />
                </span>
              </label>
              <label>
                <span>derived from</span>
                <select
                  :value="role.derivedFrom ?? ''"
                  @change="(e) => toggleDerivedFrom(idx, (e.target as HTMLSelectElement).value)"
                >
                  <option value="">— none —</option>
                  <option v-for="r in roleNames.filter((n, i) => i !== idx)" :key="r" :value="r">{{ r }}</option>
                </select>
              </label>
              <label>
                <span>hue lock</span>
                <span class="role-editor__hue">
                  <input type="checkbox" :checked="role.hueOffset !== undefined"
                         @change="toggleHueOffset(idx)" />
                  <input v-if="role.hueOffset !== undefined" type="number" min="0" max="359"
                         :value="Math.round(role.hueOffset)"
                         @input="(e) => updateRole(idx, { 'hueOffset': Number((e.target as HTMLInputElement).value) })" />
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
          <button type="button" class="role-editor__add" :disabled="roles.length < 2" @click="addPair">+ add pair</button>
        </header>
        <p v-if="pairs.length === 0" class="role-editor__empty">No contrast pairs declared yet — add one to enforce a minimum ratio between two roles.</p>
        <div class="role-editor__pairs">
          <article v-for="(pair, idx) in pairs" :key="idx" class="role-editor__pair">
            <label>
              <span>foreground</span>
              <select :value="pair.foreground" @change="(e) => updatePair(idx, { 'foreground': (e.target as HTMLSelectElement).value })">
                <option v-for="r in roleNames" :key="r" :value="r">{{ r }}</option>
              </select>
            </label>
            <label>
              <span>on</span>
              <select :value="pair.background" @change="(e) => updatePair(idx, { 'background': (e.target as HTMLSelectElement).value })">
                <option v-for="r in roleNames" :key="r" :value="r">{{ r }}</option>
              </select>
            </label>
            <label>
              <span>min ratio</span>
              <input type="number" min="1" max="100" step="0.5" :value="pair.minRatio"
                     @input="(e) => updatePair(idx, { 'minRatio': Number((e.target as HTMLInputElement).value) })" />
            </label>
            <label>
              <span>via</span>
              <select :value="pair.algorithm ?? 'wcag21'" @change="(e) => updatePair(idx, { 'algorithm': (e.target as HTMLSelectElement).value as 'wcag21' | 'apca' })">
                <option value="wcag21">WCAG 2.1</option>
                <option value="apca">APCA</option>
              </select>
            </label>
            <button type="button" class="role-editor__remove" :aria-label="`remove pair ${idx + 1}`" @click="removePair(idx)">×</button>
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
.role-editor__add {
  padding: 0.3rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 600;
  background: color-mix(in oklch, var(--iridis-brand) 20%, var(--vp-c-bg));
  border: var(--iridis-border-soft);
  border-color: color-mix(in oklch, var(--iridis-brand) 40%, var(--iridis-divider));
  border-radius: var(--iridis-radius-sm);
  color: var(--iridis-on-brand);
  cursor: pointer;
  box-shadow: var(--iridis-shadow-felt);
}
.role-editor__add:hover:not(:disabled) {
  background: color-mix(in oklch, var(--iridis-brand) 35%, var(--vp-c-bg));
  border-color: var(--iridis-brand);
  box-shadow: var(--iridis-shadow-felt-hover);
}
.role-editor__add:disabled { opacity: 0.4; cursor: not-allowed; }

/* === Shape language ===
   - Cards (sections, role + pair containers): radius-md (10px)
   - Input pills (text/select/number): radius-sm (6px)
   - Action × buttons: 50% (perfect circle)
   - + add buttons: radius-sm
   All sit on flex-wrap rows so they reflow at any width without overlap.
*/

.role-editor__roles,
.role-editor__pairs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.role-editor__role,
.role-editor__pair {
  padding: 0.6rem 0.7rem;
  background: var(--vp-c-bg);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  box-shadow: var(--iridis-shadow-felt);
}

/* Role HEAD row — name/intent/required/remove. Flex-wrap so the row
   gracefully breaks into multiple lines when the panel is narrow. */
.role-editor__role-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.55rem;
}
.role-editor__role-row > .role-editor__name {
  flex: 1 1 9rem;
  min-width: 7rem;
}
.role-editor__role-row > .role-editor__intent {
  flex: 0 1 7rem;
  min-width: 5.5rem;
}
.role-editor__role-row > .role-editor__required {
  flex: 0 0 auto;
}
.role-editor__role-row > .role-editor__remove {
  flex: 0 0 auto;
  margin-left: auto;
}

/* All input pills share the same radius and chrome. */
.role-editor__name,
.role-editor__intent,
.role-editor__role-row input,
.role-editor__role-row select,
.role-editor__pair input:not([type="checkbox"]),
.role-editor__pair select,
.role-editor__ranges input:not([type="checkbox"]),
.role-editor__ranges select {
  padding: 0.32rem 0.45rem;
  background: var(--vp-c-bg-soft);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-sm);
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--vp-c-text-1);
  min-width: 0;
  box-sizing: border-box;
}
.role-editor__required {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  padding: 0.25rem 0.5rem;
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-sm);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  user-select: none;
}
.role-editor__required input { margin: 0; }

/* × remove — squircle, consistent size, business-card chrome. */
.role-editor__remove {
  width: 1.6rem;
  height: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--iridis-card-border);
  border-radius: var(--iridis-radius);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  box-shadow: var(--iridis-card-shadow);
  transition: background var(--iridis-transition), color var(--iridis-transition), box-shadow var(--iridis-transition);
}
.role-editor__remove:hover:not(:disabled) {
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 18%, transparent);
  color: var(--iridis-error, var(--iridis-text, currentColor));
  box-shadow: var(--iridis-card-shadow-hover);
}
.role-editor__remove:disabled { opacity: 0.3; cursor: not-allowed; }

/* Ranges grid — auto-fill keeps tiles ≥ 12rem so they wrap cleanly. */
.role-editor__ranges {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.5rem;
}
.role-editor__ranges label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
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
.role-editor__range input { flex: 1 1 0; min-width: 0; max-width: 4.5rem; }
.role-editor__hue input[type="number"] { flex: 1 1 0; min-width: 0; max-width: 4.5rem; }
.role-editor__hue input[type="checkbox"] { margin: 0; flex: 0 0 auto; }

/* Pair row — flex-wrap so columns become rows on narrow widths. */
.role-editor__pair {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.5rem;
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
  flex: 1 1 6rem;
  min-width: 5.5rem;
}
.role-editor__pair > .role-editor__remove {
  align-self: end;
  margin-bottom: 0.05rem;
  flex: 0 0 auto;
}

.role-editor__empty {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin: 0.3rem 0;
}
</style>
