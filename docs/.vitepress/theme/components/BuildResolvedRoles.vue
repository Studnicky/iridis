<script setup lang="ts">
/**
 * BuildResolvedRoles.vue
 *
 * Always-visible resolved-roles grid that lives above the BuildPanel's
 * tab strip. Runs the canonical full-pipeline against the current
 * `configStore` state (seed colors + role schema + framing + contrast)
 * and renders one ResolvedRoleCard per role.
 *
 * The image pipeline writes its extracted dominant colors into the
 * same `configStore.paletteColors` — so this grid is the SHARED
 * resolved-roles surface regardless of which input workflow the user
 * is on. Image extraction and seed-color editing both end up here.
 */
import { computed, onMounted, ref, watch } from 'vue';

import { Engine, coreTasks, colorRecordFactory } from '@studnicky/iridis';
import { contrastPlugin }    from '@studnicky/iridis-contrast';
import type {
  ColorRecordInterface,
  PaletteStateInterface,
  RoleSchemaInterface,
} from '@studnicky/iridis/model';

import ResolvedRoleCard      from './ResolvedRoleCard.vue';
import { configStore }       from '../stores/configStore.ts';
import { setLockedRole }     from '../stores/themeDispatcher.ts';
import { roleSchemaByName }  from '../schemas/roleSchemas.ts';

const FULL_PIPELINE: readonly string[] = [
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

const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(contrastPlugin);
engine.pipeline(FULL_PIPELINE);

const state = ref<PaletteStateInterface | null>(null);
const error = ref<string | null>(null);

async function runPipeline(): Promise<void> {
  const pair   = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-32'];
  if (pair === undefined) {
    error.value = `Unknown schema: ${configStore.roleSchema}`;
    return;
  }
  const schema = pair[configStore.framing];
  try {
    const result = await engine.run({
      'colors':   [...configStore.paletteColors],
      'roles':    schema,
      'contrast': { 'level': configStore.contrastLevel, 'algorithm': configStore.contrastAlgorithm },
      'runtime':  { 'framing':  configStore.framing, 'colorSpace': configStore.colorSpace },
    });
    state.value = result;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(() => { void runPipeline(); });

watch(
  () => [
    [...configStore.paletteColors],
    configStore.framing,
    configStore.contrastLevel,
    configStore.contrastAlgorithm,
    configStore.colorSpace,
    configStore.roleSchema,
  ],
  () => { void runPipeline(); },
  { 'deep': true },
);

/* Engine-resolved roles. Locked roles get overridden in `displayRoles`
   below — keep the raw resolution here so the diff-disclosure can show
   the engine output even when the user has pinned a different hex. */
const roles = computed<Record<string, ColorRecordInterface>>(() => state.value?.roles ?? {});

/* Display roles = engine roles with locked hex overrides. The card
   below paints this map; the projector also overrides via the same
   `configStore.lockedRoles`, so the docs theme stays consistent with
   what the user sees in the grid. */
const displayRoles = computed<Record<string, ColorRecordInterface>>(() => {
  const base = roles.value;
  const locks = configStore.lockedRoles ?? {};
  const out: Record<string, ColorRecordInterface> = {};
  for (const [name, record] of Object.entries(base)) {
    const lockedHex = locks[name];
    if (typeof lockedHex === 'string') {
      try {
        out[name] = colorRecordFactory.fromHex(lockedHex);
        continue;
      } catch { /* fall through to base */ }
    }
    out[name] = record;
  }
  return out;
});

/* Active role schema for envelope warnings. */
const activeSchema = computed<RoleSchemaInterface | null>(() => {
  const pair = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-32'];
  if (pair === undefined) return null;
  return pair[configStore.framing];
});

/* Seed lookup: the closest paletteColor by OKLCH distance is treated
   as the "seed" for a role. Best-effort — the engine doesn't expose
   the seed → role assignment explicitly, so this is a reconstruction. */
function seedHexFor(name: string, record: ColorRecordInterface): string | undefined {
  const seeds = configStore.paletteColors;
  if (seeds.length === 0) return undefined;
  let best: { hex: string; dist: number } | null = null;
  for (const hex of seeds) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) continue;
    try {
      const seedRec = colorRecordFactory.fromHex(hex);
      const dL = seedRec.oklch.l - record.oklch.l;
      const dC = seedRec.oklch.c - record.oklch.c;
      const dh = ((seedRec.oklch.h - record.oklch.h + 540) % 360) - 180;
      const dist = dL * dL + dC * dC + (dh / 360) * (dh / 360);
      if (best === null || dist < best.dist) best = { hex, dist };
    } catch { /* skip invalid hex */ }
  }
  void name;
  return best?.hex;
}

/* Envelope warning: when looseEnvelope is on, surface a hint for any
   role whose resolved OKLCH coordinate sits outside the schema-declared
   range. Returns the warning text or undefined. */
function envelopeWarning(name: string, record: ColorRecordInterface): string | undefined {
  if (!configStore.looseEnvelope) return undefined;
  const schema = activeSchema.value;
  if (schema === null) return undefined;
  const role = schema.roles.find((r) => r.name === name);
  if (role === undefined) return undefined;
  const flags: string[] = [];
  const lr = role.lightnessRange;
  const cr = role.chromaRange;
  if (Array.isArray(lr) && (record.oklch.l < lr[0] - 1e-6 || record.oklch.l > lr[1] + 1e-6)) {
    flags.push(`L ${record.oklch.l.toFixed(2)} outside [${lr[0]}, ${lr[1]}]`);
  }
  if (Array.isArray(cr) && (record.oklch.c < cr[0] - 1e-6 || record.oklch.c > cr[1] + 1e-6)) {
    flags.push(`C ${record.oklch.c.toFixed(2)} outside [${cr[0]}, ${cr[1]}]`);
  }
  return flags.length > 0 ? flags.join(' · ') : undefined;
}

function isLocked(name: string): boolean {
  return typeof (configStore.lockedRoles ?? {})[name] === 'string';
}

function onToggleLock(name: string, record: ColorRecordInterface): void {
  if (isLocked(name)) {
    setLockedRole(name, undefined);
  } else {
    setLockedRole(name, record.hex);
  }
}

/* Compute the engine-enforced contrast badge for a role. Looks at
   the WCAG AA / AAA / APCA pair reports and reports the highest
   passing standard, or 'fail' when any required pair fell short. */
function roleBadge(name: string): string {
  if (state.value === null) return '';
  const wcag = state.value.metadata['wcag'] as
    | { 'aa'?:  { 'pairs': readonly { 'foreground': string; 'pass': boolean }[] };
        'aaa'?: { 'pairs': readonly { 'foreground': string; 'pass': boolean }[] };
        'apca'?:{ 'pairs': readonly { 'foreground': string; 'pass': boolean; 'afterLc': number }[] }; }
    | undefined;
  if (wcag === undefined) return '';
  const aa   = wcag.aa  ?.pairs.filter((p) => p.foreground === name) ?? [];
  const aaa  = wcag.aaa ?.pairs.filter((p) => p.foreground === name) ?? [];
  const apca = wcag.apca?.pairs.filter((p) => p.foreground === name) ?? [];
  if (aa.length + aaa.length + apca.length === 0) return '';
  if (aa.length > 0 && !aa.every((p) => p.pass)) return 'fail';
  if (apca.length > 0 && !apca.every((p) => p.pass)) return 'fail';
  if (aaa.length > 0 && aaa.every((p) => p.pass)) return 'AAA';
  if (apca.length > 0) {
    const bronze = apca.every((p) => Math.abs(p.afterLc) >= 75);
    return bronze ? 'APCA·Bronze' : 'APCA';
  }
  return 'AA';
}
</script>

<template>
  <ClientOnly>
    <section class="build-resolved-roles" aria-label="Resolved palette roles">
      <header class="build-resolved-roles__head">
        <span class="build-resolved-roles__label">Resolved roles</span>
        <span class="build-resolved-roles__hint">
          {{ Object.keys(displayRoles).length }} from <code>{{ configStore.roleSchema }}</code> · {{ configStore.framing }} · {{ configStore.contrastLevel }} {{ configStore.contrastAlgorithm }}
          <template v-if="Object.keys(configStore.lockedRoles ?? {}).length > 0">
            · 🔒 {{ Object.keys(configStore.lockedRoles ?? {}).length }} locked
          </template>
          <template v-if="configStore.looseEnvelope">· loose envelope</template>
        </span>
      </header>
      <div v-if="error" class="build-resolved-roles__error">
        <strong>Pipeline error:</strong> {{ error }}
      </div>
      <div v-else-if="Object.keys(displayRoles).length > 0" class="build-resolved-roles__grid">
        <ResolvedRoleCard
          v-for="(record, name) in displayRoles"
          :key="name"
          :name="String(name)"
          :record="record"
          :badge="roleBadge(String(name))"
          :locked="isLocked(String(name))"
          :seed-hex="seedHexFor(String(name), record)"
          :envelope-warning="envelopeWarning(String(name), record)"
          @toggle-lock="onToggleLock(String(name), record)"
        />
      </div>
      <div v-else class="build-resolved-roles__empty">
        No roles resolved yet.
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.build-resolved-roles {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.65rem 0.85rem 0.85rem;
  border-radius: var(--iridis-radius-md, 8px);
  background: color-mix(in oklch, var(--vp-c-bg-soft) 92%, transparent);
  border: 1px solid var(--vp-c-divider);
}
.build-resolved-roles__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.build-resolved-roles__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.build-resolved-roles__hint {
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}
.build-resolved-roles__hint code {
  font-family: inherit;
  background: var(--vp-c-bg);
  padding: 0.05rem 0.3rem;
  border-radius: 2px;
  border: 1px solid var(--vp-c-divider);
}
.build-resolved-roles__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.45rem;
}
.build-resolved-roles__error {
  padding: 0.6rem 0.85rem;
  border-radius: 4px;
  background: color-mix(in oklch, var(--iridis-error, var(--vp-c-text-1)) 12%, transparent);
  border: 1px solid color-mix(in oklch, var(--iridis-error, var(--vp-c-text-1)) 40%, transparent);
  color: var(--iridis-error, var(--vp-c-text-1));
  font-size: 0.85rem;
}
.build-resolved-roles__empty {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  padding: 0.6rem 0;
}
</style>
