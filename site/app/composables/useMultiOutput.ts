import { InputInterfaceTypeEntity } from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import { chakraPlugin } from '@studnicky/iridis-chakra';
import { muiPlugin } from '@studnicky/iridis-mui';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { rdfPlugin } from '@studnicky/iridis-rdf';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import { JsonValue } from '@studnicky/types/browser';
import * as VueModule from 'vue';

import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { debounce } from '~/utils/debounce.ts';

import { ContrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { MultiOutputEntity } from './entities/MultiOutputEntity.ts';
import { MultiOutputRequestEntity } from './entities/MultiOutputRequestEntity.ts';
import { OutputRowInterfaceTypeEntity } from './entities/OutputRowInterfaceTypeEntity.ts';
import { logger } from './logger.ts';
import { optionalContrastStages } from './optionalContrastStages.ts';
import { pickerSeedInputs } from './pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from './requiredColorStages.ts';
import { roleSchemaFor } from './roleSchemaFor.ts';
import { spliceOptionalStages } from './spliceOptionalStages.ts';
import { useIridis } from './useIridis.ts';
import { VARIANT_CONFIG } from './variantConfig.ts';

/** One palette, every real output emitter: CSS, component libraries, mobile, RDF, and JSON. */
const outputsByKey = VueModule.ref<Record<string, OutputRowInterfaceTypeEntity.Type | undefined>>({});

class ColorStages {
  static build(strictness: number): string[] {
    const result = spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(strictness));
    return result;
  }
}

class MainOutputs {
  static row(label: string, language: string, text: string): OutputRowInterfaceTypeEntity.Type {
    const result = OutputRowInterfaceTypeEntity.create({ 'label': label, 'language': language, 'text': text });
    return result;
  }

  static build(request: MultiOutputRequestEntity.Type): Record<string, OutputRowInterfaceTypeEntity.Type | undefined> {
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
      ...ColorStages.build(request.contrastStrictness),
      'emit:cssVars', 'emit:cssVarsScoped', 'emit:tailwindTheme', 'emit:json',
      'emit:shadcnTheme', 'emit:muiTheme', 'emit:chakraTheme', 'emit:pandaTheme',
      'emit:capacitorStatusBar', 'emit:capacitorSplashScreen', 'emit:capacitorTheme', 'emit:androidThemeXml',
      'reason:annotate', 'reason:serialize'
    ]);
    const input = InputInterfaceTypeEntity.intake(request.input);
    const state = engine.run(input);
    const output = MultiOutputEntity.intake(state.outputs);
    const rows: Record<string, OutputRowInterfaceTypeEntity.Type | undefined> = {};
    const cssVariables = output['stylesheet:cssVars'];
    if (cssVariables !== undefined) {rows.cssVars = MainOutputs.row('CSS variables', 'css', cssVariables.full);}
    const scopedCssVariables = output['stylesheet:cssVarsScoped'];
    if (scopedCssVariables !== undefined) {rows.cssVarsScoped = MainOutputs.row('CSS variables (scoped)', 'css', scopedCssVariables.full);}
    const tailwindTheme = output['tailwind:theme'];
    if (tailwindTheme !== undefined) {rows.tailwind = MainOutputs.row('Tailwind', 'javascript', tailwindTheme.config);}
    const shadcnTheme = output['shadcn:theme'];
    if (shadcnTheme !== undefined) {rows.shadcn = MainOutputs.row('shadcn/ui', 'css', shadcnTheme.cssVars);}
    const muiTheme = output['mui:theme'];
    if (muiTheme !== undefined) {rows.mui = MainOutputs.row('MUI', 'javascript', muiTheme.config);}
    const chakraTheme = output['chakra:theme'];
    if (chakraTheme !== undefined) {rows.chakra = MainOutputs.row('Chakra UI', 'javascript', chakraTheme.config);}
    const pandaTheme = output['panda:theme'];
    if (pandaTheme !== undefined) {
      rows.panda = MainOutputs.row('Panda CSS', 'javascript', pandaTheme.pandaConfig);
      rows.unocss = MainOutputs.row('UnoCSS', 'javascript', pandaTheme.unoConfig);
    }
    const capacitorTheme = output['capacitor:theme'];
    if (capacitorTheme !== undefined) {rows.capacitor = MainOutputs.row('Capacitor', 'javascript', JSON.stringify(capacitorTheme, null, 2));}
    const androidThemeXml = output['capacitor:androidThemeXml'];
    if (androidThemeXml !== undefined) {rows.androidThemeXml = MainOutputs.row('Android theme.xml', 'xml', androidThemeXml);}
    const jsonOutput = output['core:json'];
    if (jsonOutput !== undefined) {rows.json = MainOutputs.row('JSON', 'javascript', JSON.stringify(jsonOutput, null, 2));}
    const serializedRdf = output['rdf:serialized'];
    if (serializedRdf !== undefined) {rows.rdf = MainOutputs.row('RDF (Turtle)', 'turtle', serializedRdf);}
    return rows;
  }
}

let activated = false;
let observeStarted = false;

class ActivateOperation {
  static run(): void {
    if (activated) {return;}
    activated = true;
    const { activeSeeds, colorSpace, contrastStrictness, cvdCorrect, derivationConfig, framing, schemaName, semanticHuesEnabled } = useIridis();
    function generate(): void {
      try {
        const pair = roleSchemaByName[schemaName.value];
        if (pair === undefined) {
          throw new RangeError(`No role schema is registered for ${schemaName.value}`);
        }
        const selected = framing.value === 'dark' ? pair.dark : pair.light;
        const roles = roleSchemaFor(selected);
        const input = InputInterfaceTypeEntity.create({
          'colors':   pickerSeedInputs(activeSeeds.value),
          'contrast': ContrastConfigFor.forStrictness(contrastStrictness.value, cvdCorrect.value ? ContrastConfigFor.correctingCvd : ContrastConfigFor.advisoryCvd),
          'metadata': {
            'core:variantConfig':              JsonValue.from(VARIANT_CONFIG),
            'derivation:config':               JsonValue.from(derivationConfig.value),
            'derivation:semanticHuesEnabled':  JsonValue.from(semanticHuesEnabled.value)
          },
          'roles':   roles,
          'runtime': { 'colorSpace': colorSpace.value, 'framing': String(framing.value) }
        });
        const request = MultiOutputRequestEntity.create({ 'contrastStrictness': contrastStrictness.value, 'input': input });
        outputsByKey.value = MainOutputs.build(request);
      } catch (error) {
        logger.error(LogBody.create({
          'component': 'useMultiOutput',
          'context': {},
          'message': 'Output pipeline failed',
          'operation': 'generate',
          'status': LOG_STATUS.FAILED
        }));
        throw error;
      }
    }
    const schedule = debounce(generate, 120);
    generate();
    VueModule.watch([activeSeeds, framing, schemaName, contrastStrictness, derivationConfig, semanticHuesEnabled, cvdCorrect, colorSpace], schedule, { 'deep': true });
  }
}

const activate = ActivateOperation.run;

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
        if (entries.some((entry) => { return entry.isIntersecting; })) {
          observer.disconnect();
          activate();
        }
      }, { 'rootMargin': '400px' });
      observer.observe(target);
    });
  }
}

const observeResultVisibility = ObserveResultVisibilityOperation.run;

class UseMultiOutputOperation {
  static run(): { 'outputsByKey': typeof outputsByKey } {
    observeResultVisibility();
    const result = { 'outputsByKey': outputsByKey };
    return result;
  }
}

export const useMultiOutput = UseMultiOutputOperation.run;
