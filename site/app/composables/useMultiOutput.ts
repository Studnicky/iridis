/**
 * One palette, every output format the engine actually has a real emit
 * plugin for — CSS vars, Tailwind, shadcn/ui, MUI, Chakra UI, Panda CSS,
 * UnoCSS, Capacitor/Android, VS Code theme, RDF/OWL, and raw JSON. Two engine
 * runs: the main one uses this site's own role schema (iridis-4..32), the VS
 * Code one uses vscodeRoleSchema16 — ExpandTokens.ts (packages/vscode)
 * requires roles named background/muted/foreground/keyword/type/... that
 * don't exist in this site's schema and throws if they're absent, so it gets
 * its own dedicated pass rather than being bolted onto the main pipeline.
 *
 * Module-singleton (mirrors useThemePreset.ts's pattern) so every Result-stage
 * OutputFormatCard reads the SAME computed outputs without each re-running
 * engine.run() itself — one shared `outputsByKey`, keyed by the same stable
 * strings CarouselSections.ts's OUTPUT_FORMAT_CARDS uses.
 */
import { ref, watch } from 'vue';
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
import { useIridis } from './useIridis.ts';
import type { PickerSeedType } from './types/index.ts';
import { intakeHexHint } from '~/theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '~/theme/PinDerivedRoles.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { logger } from './logger.ts';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import { globalVscodeTheme } from './useVscodeTheme.ts';
import type { SupportedLangType } from '~/theme/Highlighter.ts';

export type OutputRowType = { 'label': string; 'lang': SupportedLangType; 'text': string };

/** Bare, unquoted-key object-literal keys the Shiki JS grammar already
 * differentiates cleanly (property-name vs. string-value scope) — plain
 * JSON's grammar collapses a quoted key onto the same "string" ancestor
 * scope as its value, so keys and strings render identically. Quoting is
 * kept only where a key isn't a valid bare JS identifier. */
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function looseKey(key: string): string {
  return IDENTIFIER_RE.test(key) ? key : JSON.stringify(key);
}

function stringify(v: unknown): string {
  if (typeof v === 'string') {return v;}
  if (v && typeof v === 'object' && 'full' in (v as Record<string, unknown>)) {return String((v as Record<string, unknown>)['full']);}
  return JSON.stringify(v, null, 2);
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

const outputsByKey = ref<Record<string, OutputRowType | undefined>>({});

function buildMainOutputs(schemaName: string, framing: 'dark' | 'light', activeSeeds: readonly (string | PickerSeedType)[]): Record<string, OutputRowType | undefined> {
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
  const pair = roleSchemaByName[schemaName] ?? roleSchemaByName['iridis-16'];
  const st = engine.run({
    'colors':   activeSeeds,
    'contrast': { 'algorithm': 'wcag21', 'level': 'AA' },
    'roles':    pair![framing],
    'runtime':  { 'colorSpace': 'srgb', 'framing': framing }
  });
  const out = st.outputs as Record<string, unknown>;
  const rows: Record<string, OutputRowType | undefined> = {};
  if (out['stylesheet:cssVars']) {rows['cssVars'] = { 'label': 'CSS variables', 'lang': 'css', 'text': stringify(out['stylesheet:cssVars']) };}
  if (out['stylesheet:cssVarsScoped']) {rows['cssVarsScoped'] = { 'label': 'CSS variables (scoped)', 'lang': 'css', 'text': stringify(out['stylesheet:cssVarsScoped']) };}
  if (out['tailwind:theme']) {rows['tailwind'] = { 'label': 'Tailwind', 'lang': 'javascript', 'text': (out['tailwind:theme'] as { 'config': string }).config };}
  if (out['shadcn:theme']) {rows['shadcn'] = { 'label': 'shadcn/ui', 'lang': 'css', 'text': (out['shadcn:theme'] as { 'cssVars': string }).cssVars };}
  if (out['mui:theme']) {rows['mui'] = { 'label': 'MUI', 'lang': 'javascript', 'text': (out['mui:theme'] as { 'config': string }).config };}
  if (out['chakra:theme']) {rows['chakra'] = { 'label': 'Chakra UI', 'lang': 'javascript', 'text': (out['chakra:theme'] as { 'config': string }).config };}
  if (out['panda:theme']) {
    const panda = out['panda:theme'] as { 'pandaConfig': string; 'unoConfig': string };
    rows['panda'] = { 'label': 'Panda CSS', 'lang': 'javascript', 'text': panda.pandaConfig };
    rows['unocss'] = { 'label': 'UnoCSS', 'lang': 'javascript', 'text': panda.unoConfig };
  }
  if (out['capacitor:theme']) {rows['capacitor'] = { 'label': 'Capacitor', 'lang': 'javascript', 'text': stringifyLoose(out['capacitor:theme']) };}
  if (out['capacitor:androidThemeXml']) {rows['androidThemeXml'] = { 'label': 'Android theme.xml', 'lang': 'xml', 'text': out['capacitor:androidThemeXml'] as string };}
  if (out['core:json']) {rows['json'] = { 'label': 'JSON', 'lang': 'javascript', 'text': stringifyLoose(out['core:json']) };}
  if (out['rdf:serialized']) {rows['rdf'] = { 'label': 'RDF (Turtle)', 'lang': 'turtle', 'text': out['rdf:serialized'] as string };}
  return rows;
}

/** vscodeRoleSchema16 only documents dark-mode clamps (see its own header comment), so this pass always themes dark regardless of the site's framing toggle. */
function buildVscodeOutput(activeSeeds: readonly (string | PickerSeedType)[]): OutputRowType | undefined {
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
    'colors':   activeSeeds,
    'contrast': { 'algorithm': 'wcag21', 'level': 'AA' },
    'roles':    vscodeRoleSchema16,
    'runtime':  { 'colorSpace': 'srgb', 'framing': 'dark' }
  });
  const themeJson = (st.outputs as Record<string, unknown>)['vscode:themeJson'];
  if (themeJson === undefined) {return undefined;}
  globalVscodeTheme.value = themeJson as object;
  return { 'label': 'VS Code theme', 'lang': 'javascript', 'text': stringifyLoose(themeJson) };
}

let booted = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Reactive, deterministically-keyed output rows plus the shared VS Code theme used to highlight every CodeBlock — the single entry point every OutputFormatCard reads from. */
export function useMultiOutput(): { 'outputsByKey': typeof outputsByKey } {
  if (!booted) {
    booted = true;
    const { activeSeeds, framing, schemaName } = useIridis();
    function generate(): void {
      try {
        const rows = buildMainOutputs(schemaName.value, framing.value, activeSeeds.value);
        rows['vscode'] = buildVscodeOutput(activeSeeds.value);
        outputsByKey.value = rows;
      } catch (e) {
        logger.error(
          LogBody.create()
            .component('useMultiOutput')
            .operation('generate')
            .status(LOG_STATUS.FAILED)
            .message('Output pipeline failed; keeping the previous outputs')
            .context({ 'error': e instanceof Error ? e.message : String(e) })
            .build()
        );
      }
    }
    function schedule(): void {
      if (timer !== undefined) {clearTimeout(timer);}
      timer = setTimeout(generate, 120);
    }
    generate();
    watch([activeSeeds, framing, schemaName], schedule, { 'deep': true });
  }
  return { 'outputsByKey': outputsByKey };
}
