import type { ChakraOutputInterfaceType } from '@studnicky/iridis-chakra';
import type { MuiOutputInterfaceType } from '@studnicky/iridis-mui';
import type { PandaOutputInterfaceType } from '@studnicky/iridis-panda';
import type { ShadcnOutputInterfaceType } from '@studnicky/iridis-shadcn';
import type { TailwindOutputInterfaceType } from '@studnicky/iridis-tailwind';

import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import { chakraPlugin } from '@studnicky/iridis-chakra';
import { muiPlugin } from '@studnicky/iridis-mui';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { rdfPlugin } from '@studnicky/iridis-rdf';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
/**
 * One palette, every output format the engine actually has a real emit
 * plugin for — CSS vars, Tailwind, shadcn/ui, MUI, Chakra UI, Panda CSS,
 * UnoCSS, Capacitor/Android, RDF/OWL, and raw JSON. The VS Code tier demo owns
 * VS Code generation because it accepts the exact structured role sets that the
 * VS Code palette contract requires; arbitrary site picker seeds do not.
 *
 * Module-singleton (mirrors useThemePreset.ts's pattern) so every Stylesheets-stage
 * OutputFormatCard reads the SAME computed outputs without each re-running
 * engine.run() itself — one shared `outputsByKey`, keyed by the same stable
 * strings outputFormatCards.ts's OUTPUT_FORMAT_CARDS uses.
 */
import * as VueModule from 'vue';

import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { debounce } from '~/utils/debounce.ts';

import type { DerivationConfigType, PickerSeedType } from './types/index.ts';
import type { OutputRowType } from './types/outputRow.ts';

import { OUTPUT_FORMATTING_PATTERNS } from './constants/OutputFormattingPatterns.ts';
import { contrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { logger } from './logger.ts';
import { optionalContrastStages } from './optionalContrastStages.ts';
import { pickerSeedInputs } from './pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from './requiredColorStages.ts';
import { spliceOptionalStages } from './spliceOptionalStages.ts';
import { DEFAULT_SCHEMA_NAME } from './types/index.ts';
import { useIridis } from './useIridis.ts';
import { VARIANT_CONFIG } from './variantConfig.ts';

/** Bare, unquoted-key object-literal keys the Shiki JS grammar already
 * differentiates cleanly (property-name vs. string-value scope) — plain
 * JSON's grammar collapses a quoted key onto the same "string" ancestor
 * scope as its value, so keys and strings render identically. Quoting is
 * kept only where a key isn't a valid bare JS identifier. */
class LooseKeyOperation {
  static run(key: string): string {
    return OUTPUT_FORMATTING_PATTERNS.IDENTIFIER.test(key) ? key : JSON.stringify(key);
  }
}

const looseKey = LooseKeyOperation.run;

class StringifyOperation {
  static run(v: unknown): string {
    if (typeof v === 'string') {return v;}
    if (v !== null && typeof v === 'object' && 'full' in v) {return String(v.full);}
    return JSON.stringify(v, null, 2);
  }
}

const stringify = StringifyOperation.run;

class StringifyLooseOperation {
  static run(v: unknown, depth = 0): string {
    if (v !== null && typeof v === 'object' && 'full' in v) {return JSON.stringify(String(v.full));}
    if (v === null || typeof v !== 'object') {return JSON.stringify(v);}
    const pad = '  '.repeat(depth + 1);
    const closePad = '  '.repeat(depth);
    if (Array.isArray(v)) {
      if (v.length === 0) {return '[]';}
      const items = v.map((item) => { const result = `${pad}${stringifyLoose(item, depth + 1)}`; return result; }).join(',\n');
      return `[\n${items}\n${closePad}]`;
    }
    const entries = Object.entries(v);
    if (entries.length === 0) {return '{}';}
    const lines = entries.map(([key, value]) => { const result = `${pad}${looseKey(key)}: ${stringifyLoose(value, depth + 1)}`; return result; }).join(',\n');
    return `{\n${lines}\n${closePad}}`;
  }
}

const stringifyLoose = StringifyLooseOperation.run;

class OutputSlot {
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static isStringRecord(value: unknown): value is Record<string, string> {
    return OutputSlot.isRecord(value) && Object.values(value).every((member) => {return typeof member === 'string';});
  }

  private static isNestedStringRecord(value: unknown): value is Record<string, Record<string, string>> {
    return OutputSlot.isRecord(value) && Object.values(value).every(OutputSlot.isStringRecord);
  }

  private static isTailwind(value: unknown): value is TailwindOutputInterfaceType {
    return OutputSlot.isRecord(value)
      && OutputSlot.isRecord(value.colors)
      && Object.values(value.colors).every((member) => {return typeof member === 'string' || OutputSlot.isStringRecord(member);})
      && typeof value.config === 'string'
      && typeof value.cssVars === 'string';
  }

  private static isShadcn(value: unknown): value is ShadcnOutputInterfaceType {
    return OutputSlot.isRecord(value)
      && OutputSlot.isStringRecord(value.colors)
      && typeof value.cssVars === 'string';
  }

  private static isMui(value: unknown): value is MuiOutputInterfaceType {
    return OutputSlot.isRecord(value)
      && OutputSlot.isRecord(value.palette)
      && typeof value.config === 'string';
  }

  private static isChakra(value: unknown): value is ChakraOutputInterfaceType {
    return OutputSlot.isRecord(value)
      && OutputSlot.isNestedStringRecord(value.colors)
      && typeof value.config === 'string';
  }

  private static isPanda(value: unknown): value is PandaOutputInterfaceType {
    return OutputSlot.isRecord(value)
      && OutputSlot.isStringRecord(value.colors)
      && typeof value.pandaConfig === 'string'
      && typeof value.unoConfig === 'string';
  }

  static chakra(value: unknown): ChakraOutputInterfaceType {
    if (OutputSlot.isChakra(value)) {return value;}
    throw new TypeError('Output slot chakra:theme must provide a string config');
  }

  static mui(value: unknown): MuiOutputInterfaceType {
    if (OutputSlot.isMui(value)) {return value;}
    throw new TypeError('Output slot mui:theme must provide a string config');
  }

  static panda(value: unknown): PandaOutputInterfaceType {
    if (OutputSlot.isPanda(value)) {return value;}
    throw new TypeError('Output slot panda:theme must provide string pandaConfig and unoConfig fields');
  }

  static shadcn(value: unknown): ShadcnOutputInterfaceType {
    if (OutputSlot.isShadcn(value)) {return value;}
    throw new TypeError('Output slot shadcn:theme must provide string cssVars');
  }

  static string(value: unknown, slotName: string): string {
    if (typeof value === 'string') {return value;}
    throw new TypeError(`Output slot ${slotName} must be a string`);
  }

  static tailwind(value: unknown): TailwindOutputInterfaceType {
    if (OutputSlot.isTailwind(value)) {return value;}
    throw new TypeError('Output slot tailwind:theme must provide a string config');
  }

}

const outputsByKey = VueModule.ref<Record<string, OutputRowType | undefined>>({});

/** Slots the strictness-selected optional contrast stage into REQUIRED_COLOR_STAGES right after enforce:contrast — same shared builder useIridis.ts's live pipeline uses. */
class ColorStages {
  static build(strictness: number): string[] {
    const result = spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(strictness));
    return result;
  }
}

class MainOutputs {
  static build(
    schemaName: string, framing: 'dark' | 'light', activeSeeds: readonly PickerSeedType[],
    contrastStrictness: number, derivationConfig: DerivationConfigType, semanticHuesEnabled: boolean,
    cvdCorrect: boolean, colorSpace: 'srgb' | 'displayP3'
  ): Record<string, OutputRowType | undefined> {
    const engine = createColorEngine();
    engine.adopt(stylesheetPlugin);
    engine.adopt(tailwindPlugin);
    engine.adopt(shadcnPlugin);
    engine.adopt(muiPlugin);
    engine.adopt(chakraPlugin);
    engine.adopt(pandaPlugin);
    engine.adopt(capacitorPlugin);
    engine.adopt(rdfPlugin);
    engine.pipeline([
      ...ColorStages.build(contrastStrictness),
      'emit:cssVars', 'emit:cssVarsScoped', 'emit:tailwindTheme', 'emit:json',
      'emit:shadcnTheme', 'emit:muiTheme', 'emit:chakraTheme', 'emit:pandaTheme',
      'emit:capacitorStatusBar', 'emit:capacitorSplashScreen', 'emit:capacitorTheme', 'emit:androidThemeXml',
      'reason:annotate', 'reason:serialize'
    ]);
    const pair = roleSchemaByName[schemaName] ?? roleSchemaByName[DEFAULT_SCHEMA_NAME];
    if (pair === undefined) {throw new RangeError(`No role schema is registered for ${schemaName} or ${DEFAULT_SCHEMA_NAME}`);}
    const roles = pair[framing];
    const st = engine.run({
      'bypass':   undefined,
      'colors':   pickerSeedInputs(activeSeeds),
      'contrast': contrastConfigFor(contrastStrictness, cvdCorrect),
      'emit':     undefined,
      'maxColors': undefined,
      'metadata': { 'core:variantConfig': VARIANT_CONFIG, 'derivation:config': derivationConfig, 'derivation:semanticHuesEnabled': semanticHuesEnabled },
      'roles':    roles,
      'runtime':  { 'colorSpace': colorSpace, 'extra': undefined, 'framing': framing }
    });
    const out = st.outputs;
    const rows: Record<string, OutputRowType | undefined> = {};
    const cssVariables = out['stylesheet:cssVars'];
    if (cssVariables !== undefined) {rows.cssVars = { 'label': 'CSS variables', 'lang': 'css', 'text': stringify(cssVariables) };}
    const scopedCssVariables = out['stylesheet:cssVarsScoped'];
    if (scopedCssVariables !== undefined) {rows.cssVarsScoped = { 'label': 'CSS variables (scoped)', 'lang': 'css', 'text': stringify(scopedCssVariables) };}
    const tailwindTheme = out['tailwind:theme'];
    if (tailwindTheme !== undefined) {rows.tailwind = { 'label': 'Tailwind', 'lang': 'javascript', 'text': OutputSlot.tailwind(tailwindTheme).config };}
    const shadcnTheme = out['shadcn:theme'];
    if (shadcnTheme !== undefined) {rows.shadcn = { 'label': 'shadcn/ui', 'lang': 'css', 'text': OutputSlot.shadcn(shadcnTheme).cssVars };}
    const muiTheme = out['mui:theme'];
    if (muiTheme !== undefined) {rows.mui = { 'label': 'MUI', 'lang': 'javascript', 'text': OutputSlot.mui(muiTheme).config };}
    const chakraTheme = out['chakra:theme'];
    if (chakraTheme !== undefined) {rows.chakra = { 'label': 'Chakra UI', 'lang': 'javascript', 'text': OutputSlot.chakra(chakraTheme).config };}
    const pandaTheme = out['panda:theme'];
    if (pandaTheme !== undefined) {
      const panda = OutputSlot.panda(pandaTheme);
      rows.panda = { 'label': 'Panda CSS', 'lang': 'javascript', 'text': panda.pandaConfig };
      rows.unocss = { 'label': 'UnoCSS', 'lang': 'javascript', 'text': panda.unoConfig };
    }
    const capacitorTheme = out['capacitor:theme'];
    if (capacitorTheme !== undefined) {rows.capacitor = { 'label': 'Capacitor', 'lang': 'javascript', 'text': stringifyLoose(capacitorTheme) };}
    const androidThemeXml = out['capacitor:androidThemeXml'];
    if (androidThemeXml !== undefined) {rows.androidThemeXml = { 'label': 'Android theme.xml', 'lang': 'xml', 'text': OutputSlot.string(androidThemeXml, 'capacitor:androidThemeXml') };}
    const jsonOutput = out['core:json'];
    if (jsonOutput !== undefined) {rows.json = { 'label': 'JSON', 'lang': 'javascript', 'text': stringifyLoose(jsonOutput) };}
    const serializedRdf = out['rdf:serialized'];
    if (serializedRdf !== undefined) {rows.rdf = { 'label': 'RDF (Turtle)', 'lang': 'turtle', 'text': OutputSlot.string(serializedRdf, 'rdf:serialized') };}
    return rows;
  }
}

let activated = false;
let observeStarted = false;

/**
 * The full `engine.run()` output pass is genuinely expensive — deferring it
 * until the Stylesheets stage has
 * actually scrolled into view (or is about to) means a visit that never
 * reaches Stylesheets never pays for them at all, and the reactive `watch` below (which
 * would otherwise re-run the pass on every seed/framing/schema change
 * site-wide) doesn't even start ticking until then either.
 */
class ActivateOperation {
  static run(): void {
    if (activated) {return;}
    activated = true;
    const { activeSeeds, colorSpace, contrastStrictness, cvdCorrect, derivationConfig, framing, schemaName, semanticHuesEnabled } = useIridis();
    function generate(): void {
      try {
        const rows = MainOutputs.build(
          schemaName.value, framing.value, activeSeeds.value,
          contrastStrictness.value, derivationConfig.value, semanticHuesEnabled.value,
          cvdCorrect.value, colorSpace.value
        );
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
    const schedule = debounce(generate, 120);
    generate();
    VueModule.watch([activeSeeds, framing, schemaName, contrastStrictness, derivationConfig, semanticHuesEnabled, cvdCorrect, colorSpace], schedule, { 'deep': true });
  }
}

const activate = ActivateOperation.run;

/** Starts observing the Stylesheets stage's own section (`#result`) — a generous `rootMargin` pre-warms generation just before the user actually scrolls it into view, rather than the instant it's technically on-screen. Falls back to immediate activation if IntersectionObserver/the target element aren't available (SSR, or an unexpected DOM shape). */
class ObserveResultVisibilityOperation {
  static run(): void {
    if (observeStarted) {return;}
    observeStarted = true;
    VueModule.onMounted(() => {
      if (activated) {return;}
      if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') {
        activate();
        return;
      }
      const target = document.getElementById('result');
      if (target === null) {
        activate();
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => { const result = entry.isIntersecting; return result; })) {
          observer.disconnect();
          activate();
        }
      }, { 'rootMargin': '400px' });
      observer.observe(target);
    });
  }
}

const observeResultVisibility = ObserveResultVisibilityOperation.run;

/** Reactive, deterministically-keyed output rows — the single entry point every OutputFormatCard reads from. Generation starts only when the Stylesheets stage is about to be visible (see observeResultVisibility). */
class UseMultiOutputOperation {
  static run(): { 'outputsByKey': typeof outputsByKey } {
    observeResultVisibility();
    return { 'outputsByKey': outputsByKey };
  }
}

export const useMultiOutput = UseMultiOutputOperation.run;
