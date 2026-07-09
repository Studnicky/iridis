<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Engine, coreTasks } from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import { chakraPlugin } from '@studnicky/iridis-chakra';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { muiPlugin } from '@studnicky/iridis-mui';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { vscodePlugin, vscodeRoleSchema16 } from '@studnicky/iridis-vscode';
import { useIridis } from '~/composables/useIridis.ts';
import { intakeHexHint } from '~/theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '~/theme/PinDerivedRoles.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { logger } from '~/composables/logger.ts';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import type { SupportedLangType } from '~/theme/Highlighter.ts';

/**
 * One palette, every output format the engine actually has a real emit
 * plugin for — CSS vars, Tailwind, shadcn/ui, MUI, Chakra UI, Panda CSS,
 * UnoCSS, Capacitor/Android, VS Code theme, and raw JSON. Two engine runs:
 * the main one uses this site's own role schema (iridis-4..32), the VS Code
 * one uses vscodeRoleSchema16 — ExpandTokens.ts (packages/vscode) requires
 * roles named background/muted/foreground/keyword/type/... that don't exist
 * in this site's schema and throws if they're absent, so it gets its own
 * dedicated pass rather than being bolted onto the main pipeline.
 */
type OutputRowType = { 'label': string; 'lang': SupportedLangType; 'text': string };

const { activeSeeds, framing, schemaName } = useIridis();
const outputs = ref<OutputRowType[]>([]);
const vscodeTheme = ref<object>({});

function stringify(v: unknown): string {
  if (typeof v === 'string') {return v;}
  if (v && typeof v === 'object' && 'full' in (v as Record<string, unknown>)) {return String((v as Record<string, unknown>)['full']);}
  return JSON.stringify(v, null, 2);
}

/** Bare, unquoted-key object-literal keys the Shiki JS grammar already
 * differentiates cleanly (property-name vs. string-value scope) — plain
 * JSON's grammar collapses a quoted key onto the same "string" ancestor
 * scope as its value, so keys and strings render identically. Quoting is
 * kept only where a key isn't a valid bare JS identifier. */
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function looseKey(key: string): string {
  return IDENTIFIER_RE.test(key) ? key : JSON.stringify(key);
}

function stringifyLoose(v: unknown, depth = 0): string {
  if (v && typeof v === 'object' && 'full' in (v as Record<string, unknown>)) {return JSON.stringify(String((v as Record<string, unknown>)['full']));}
  if (v === null || typeof v !== 'object') {return JSON.stringify(v);}
  const pad = '  '.repeat(depth + 1);
  const closePad = '  '.repeat(depth);
  if (Array.isArray(v)) {
    if (v.length === 0) {return '[]';}
    const items = v.map((item) => `${pad}${stringifyLoose(item, depth + 1)}`).join(',\n');
    return `[\n${items}\n${closePad}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0) {return '{}';}
  const lines = entries.map(([k, val]) => `${pad}${looseKey(k)}: ${stringifyLoose(val, depth + 1)}`).join(',\n');
  return `{\n${lines}\n${closePad}}`;
}

function buildMainOutputs(): OutputRowType[] {
  const engine = new Engine();
  for (const t of coreTasks) {engine.tasks.register(t);}
  engine.tasks.register(intakeHexHint);
  engine.tasks.register(pinDerivedRoles);
  engine.adopt(contrastPlugin);
  engine.adopt(stylesheetPlugin);
  engine.adopt(tailwindPlugin);
  engine.adopt(shadcnPlugin);
  engine.adopt(muiPlugin);
  engine.adopt(chakraPlugin);
  engine.adopt(pandaPlugin);
  engine.adopt(capacitorPlugin);
  engine.pipeline([
    'intake:hexHint', 'resolve:roles', 'pin:derivedRoles', 'expand:family', 'enforce:contrast',
    'emit:cssVars', 'emit:cssVarsScoped', 'emit:tailwindTheme', 'emit:json',
    'emit:shadcnTheme', 'emit:muiTheme', 'emit:chakraTheme', 'emit:pandaTheme',
    'emit:capacitorStatusBar', 'emit:capacitorSplashScreen', 'emit:capacitorTheme', 'emit:androidThemeXml'
  ]);
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-16'];
  const st = engine.run({
    'colors':   activeSeeds.value,
    'contrast': { 'algorithm': 'wcag21', 'level': 'AA' },
    'roles':    pair![framing.value],
    'runtime':  { 'colorSpace': 'srgb', 'framing': framing.value }
  });
  const out = st.outputs as Record<string, unknown>;
  const rows: OutputRowType[] = [];
  if (out['stylesheet:cssVars']) {rows.push({ 'label': 'CSS variables', 'lang': 'css', 'text': stringify(out['stylesheet:cssVars']) });}
  if (out['stylesheet:cssVarsScoped']) {rows.push({ 'label': 'CSS variables (scoped)', 'lang': 'css', 'text': stringify(out['stylesheet:cssVarsScoped']) });}
  if (out['tailwind:theme']) {rows.push({ 'label': 'Tailwind', 'lang': 'javascript', 'text': (out['tailwind:theme'] as { 'config': string }).config });}
  if (out['shadcn:theme']) {rows.push({ 'label': 'shadcn/ui', 'lang': 'css', 'text': (out['shadcn:theme'] as { 'cssVars': string }).cssVars });}
  if (out['mui:theme']) {rows.push({ 'label': 'MUI', 'lang': 'javascript', 'text': (out['mui:theme'] as { 'config': string }).config });}
  if (out['chakra:theme']) {rows.push({ 'label': 'Chakra UI', 'lang': 'javascript', 'text': (out['chakra:theme'] as { 'config': string }).config });}
  if (out['panda:theme']) {
    const panda = out['panda:theme'] as { 'pandaConfig': string; 'unoConfig': string };
    rows.push({ 'label': 'Panda CSS', 'lang': 'javascript', 'text': panda.pandaConfig });
    rows.push({ 'label': 'UnoCSS', 'lang': 'javascript', 'text': panda.unoConfig });
  }
  if (out['capacitor:theme']) {rows.push({ 'label': 'Capacitor', 'lang': 'javascript', 'text': stringifyLoose(out['capacitor:theme']) });}
  if (out['capacitor:androidThemeXml']) {rows.push({ 'label': 'Android theme.xml', 'lang': 'xml', 'text': out['capacitor:androidThemeXml'] as string });}
  if (out['core:json']) {rows.push({ 'label': 'JSON', 'lang': 'javascript', 'text': stringifyLoose(out['core:json']) });}
  return rows;
}

/** vscodeRoleSchema16 only documents dark-mode clamps (see its own header comment), so this pass always themes dark regardless of the site's framing toggle. */
function buildVscodeOutput(): OutputRowType | undefined {
  const engine = new Engine();
  for (const t of coreTasks) {engine.tasks.register(t);}
  engine.tasks.register(intakeHexHint);
  engine.adopt(contrastPlugin);
  engine.adopt(vscodePlugin);
  engine.pipeline([
    'intake:hexHint', 'resolve:roles', 'expand:family', 'enforce:contrast',
    'vscode:expandTokens', 'vscode:applyModifiers', 'emit:vscodeSemanticRules', 'emit:vscodeUiPalette', 'emit:vscodeThemeJson'
  ]);
  const st = engine.run({
    'colors':   activeSeeds.value,
    'contrast': { 'algorithm': 'wcag21', 'level': 'AA' },
    'roles':    vscodeRoleSchema16,
    'runtime':  { 'colorSpace': 'srgb', 'framing': 'dark' }
  });
  const themeJson = (st.outputs as Record<string, unknown>)['vscode:themeJson'];
  if (themeJson === undefined) {return undefined;}
  vscodeTheme.value = themeJson as object;
  return { 'label': 'VS Code theme', 'lang': 'javascript', 'text': stringifyLoose(themeJson) };
}

function generate(): void {
  try {
    const rows = buildMainOutputs();
    const vscodeRow = buildVscodeOutput();
    if (vscodeRow) {rows.push(vscodeRow);}
    outputs.value = rows;
  } catch (e) {
    logger.error(
      LogBody.create()
        .component('MultiOutput')
        .operation('generate')
        .status(LOG_STATUS.FAILED)
        .message('Output pipeline failed; keeping the previous outputs')
        .context({ 'error': e instanceof Error ? e.message : String(e) })
        .build()
    );
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(): void {
  if (timer !== undefined) {clearTimeout(timer);}
  timer = setTimeout(generate, 120);
}
generate();
watch([activeSeeds, framing, schemaName], schedule, { 'deep': true });

const tabItems = computed(() => outputs.value.map((o, i) => ({ 'label': o.label, 'value': String(i) })));
const active = ref<string>('0');
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">What you came here for</span>
        <span />
      </div>
    </template>
    <div class="space-y-3">
      <p class="text-sm text-muted">
        Every output format with a real emit plugin — one palette, {{ outputs.length }} targets.
      </p>
      <UTabs
        v-model="active"
        :items="tabItems"
        :content="false"
        class="output-tabs"
        :ui="{ indicator: 'hidden' }"
      />
      <CodeBlock
        :code="outputs[Number(active)]?.text || ''"
        :lang="outputs[Number(active)]?.lang || 'json'"
        :vscode-theme="vscodeTheme"
      />
      <p class="text-[10px] text-dimmed">
        Highlighted by Shiki, colored by this site's own VS Code theme output — not a static theme.
      </p>
    </div>
  </UCard>
</template>

<style scoped>
/* Full labels over truncation — let the tab list wrap onto as many rows as
   it needs instead of clipping ("CSS variab...") or scrolling sideways.
   Reka UI's sliding TabsIndicator only tracks a single row (it computes an
   x-offset/width, not a per-row position) — it drifts and overlaps once
   tabs wrap onto row 2+, so it's hidden (see :ui="{indicator:'hidden'}" on
   the component) and each trigger paints its own active background here
   instead, which is correct regardless of how many rows there are. */
.output-tabs :deep([role='tablist']) {
  flex-wrap: wrap;
  height: auto;
  width: auto;
}
.output-tabs :deep([role='tab']) {
  flex: none;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.output-tabs :deep([role='tab'][data-state='active']) {
  background: var(--ui-primary);
  color: var(--ui-bg);
}
</style>
