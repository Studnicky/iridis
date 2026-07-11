<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Engine, coreTasks } from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import { chakraPlugin } from '@studnicky/iridis-chakra';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { muiPlugin } from '@studnicky/iridis-mui';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { rdfPlugin } from '@studnicky/iridis-rdf';
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
 * UnoCSS, Capacitor/Android, VS Code theme, RDF/OWL, and raw JSON. Two engine runs:
 * the main one uses this site's own role schema (iridis-4..32), the VS Code
 * one uses vscodeRoleSchema16 — ExpandTokens.ts (packages/vscode) requires
 * roles named background/muted/foreground/keyword/type/... that don't exist
 * in this site's schema and throws if they're absent, so it gets its own
 * dedicated pass rather than being bolted onto the main pipeline.
 */
type OutputRowType = { 'label': string; 'lang': SupportedLangType; 'text': string };

const { activeSeeds, framing, schemaName } = useIridis();
const outputs = ref<OutputRowType[]>([]);
import { globalVscodeTheme } from '~/composables/useVscodeTheme';

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
  engine.adopt(rdfPlugin);
  engine.pipeline([
    'intake:hexHint', 'resolve:roles', 'pin:derivedRoles', 'expand:family', 'enforce:contrast',
    'emit:cssVars', 'emit:cssVarsScoped', 'emit:tailwindTheme', 'emit:json',
    'emit:shadcnTheme', 'emit:muiTheme', 'emit:chakraTheme', 'emit:pandaTheme',
    'emit:capacitorStatusBar', 'emit:capacitorSplashScreen', 'emit:capacitorTheme', 'emit:androidThemeXml',
    'reason:annotate', 'reason:serialize'
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
  if (out['rdf:serialized']) {rows.push({ 'label': 'RDF (Turtle)', 'lang': 'turtle', 'text': out['rdf:serialized'] as string });}
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
  globalVscodeTheme.value = themeJson as object;
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
      <BalancedWrap :items="tabItems" :min-width="120" :gap="8" class="mb-4">
        <template #default="{ item, index: i }">
          <button
            type="button"
            class="flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors"
            :class="String(i) === active ? 'bg-primary text-[var(--ui-primary-contrast)] shadow-[0_0_12px_color-mix(in_oklch,var(--ui-primary)_50%,transparent)]' : 'bg-elevated/50 text-muted hover:text-highlighted hover:bg-elevated'"
            @click="active = String(i)"
          >
            {{ item.label }}
          </button>
        </template>
      </BalancedWrap>
      <CodeBlock
        :code="outputs[Number(active)]?.text || ''"
        :lang="outputs[Number(active)]?.lang || 'json'"
        :vscode-theme="globalVscodeTheme"
      />
      <p class="text-[10px] text-dimmed">
        Highlighted by Shiki, colored by this site's own VS Code theme output — not a static theme.
      </p>
    </div>

    <LearnMoreSection :title="`Learn more: why one palette becomes ${outputs.length} outputs`" value="multi-output-detail">
      <p>
        Every tab above comes from the same <span class="font-mono text-xs">engine.run()</span> call you saw in
        Pipeline — the palette is resolved to roles exactly once, then a set of emit tasks reads that resolved
        <span class="font-mono text-xs">state.roles</span> and writes it into a consumer-shaped format. The engine
        never re-derives colors per output; it derives once and lets emit tasks translate. That's the same
        engine-emits, tokens-cascade pattern this site uses on itself: the chrome around this card, the sidebar,
        the syntax colors in the code block above, all read <span class="font-mono text-xs">--iridis-*</span> CSS
        variables written by the same kind of pass as the <span class="font-mono text-xs">CSS variables</span> and
        <span class="font-mono text-xs">CSS variables (scoped)</span> tabs.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        The three-layer cascade
      </h4>
      <p class="mt-2 text-sm text-muted">
        <span class="font-medium">Engine pass</span> — the pipeline above resolves seed colors to named roles and
        writes every registered emit task's slot into <span class="font-mono text-xs">state.outputs</span>.
        <span class="font-medium"> Token write</span> — a small mapper (this site's own
        <span class="font-mono text-xs">applyConfigToDocument</span>, analogous to the
        <span class="font-mono text-xs">CSS variables</span> tab) copies resolved roles onto
        <span class="font-mono text-xs">documentElement.style</span> under names the consumer chose, not names the
        engine chose. <span class="font-medium"> Framework cascade</span> — your existing stylesheet, Tailwind
        config, or component library (shadcn/ui, MUI, Chakra, Panda) references those variables with
        <span class="font-mono text-xs">var()</span> and repaints. None of the three layers imports the others;
        they agree only on variable names.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        Aliases make one schema serve every output
      </h4>
      <p class="mt-2 text-sm text-muted">
        A role schema declares names like <span class="font-mono text-xs">brand</span> or
        <span class="font-mono text-xs">accent</span>; a consumer's tokens are named whatever that consumer already
        calls them. Rather than hard-coding one role name into an emit plugin, each output tab's plugin resolves a
        <span class="font-mono text-xs">candidates</span> chain — first declared role name that exists in
        <span class="font-mono text-xs">state.roles</span> wins — so the same <span class="font-mono text-xs">iridis-4</span>
        through <span class="font-mono text-xs">iridis-32</span> schemas that drive the <span class="font-mono text-xs">Tailwind</span>
        tab also drive <span class="font-mono text-xs">shadcn/ui</span>, <span class="font-mono text-xs">MUI</span>,
        <span class="font-mono text-xs">Chakra UI</span>, and the <span class="font-mono text-xs">Panda CSS</span> /
        <span class="font-mono text-xs">UnoCSS</span> pair without each plugin knowing about the others' token
        naming.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        The VS Code and RDF tabs run a second pass
      </h4>
      <p class="mt-2 text-sm text-muted">
        Most tabs above share one <span class="font-mono text-xs">engine.run()</span> because they read the same role
        schema. The <span class="font-mono text-xs">VS Code theme</span> tab is a second, dedicated engine instance:
        the VS Code plugin's token expansion needs roles named <span class="font-mono text-xs">background</span>,
        <span class="font-mono text-xs">muted</span>, <span class="font-mono text-xs">keyword</span>, and friends
        that this site's own schema doesn't declare, so it runs its own pipeline against
        <span class="font-mono text-xs">vscodeRoleSchema16</span> and always themes dark. The
        <span class="font-mono text-xs">RDF (Turtle)</span> tab, by contrast, rides the main pipeline: after roles
        resolve and contrast is enforced, <span class="font-mono text-xs">reason:annotate</span> writes the palette
        as RDF triples (an n3 <span class="font-mono text-xs">Store</span>, colors and roles as subjects and
        predicates) and <span class="font-mono text-xs">reason:serialize</span> turns that graph into the Turtle
        text rendered above — the same resolved roles as every other tab, reasoned over instead of templated.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        Fallbacks still matter off this page
      </h4>
      <p class="mt-2 text-sm text-muted">
        This demo re-runs the engine synchronously on every palette change, so every tab is always current. A real
        app's token-write layer should still declare <span class="font-mono text-xs">:root</span> fallback values
        for the variables it writes — SSR, the pre-hydration paint, and any error path all need a value before the
        engine's first run completes. Reasonable defaults that match your dark/light framing cost one CSS block and
        mean the page never goes blank waiting on JavaScript.
      </p>
    </LearnMoreSection>
  </UCard>
</template>


