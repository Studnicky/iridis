import { InputEntity } from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import { chakraPlugin } from '@studnicky/iridis-chakra';
import { muiPlugin } from '@studnicky/iridis-mui';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { rdfPlugin } from '@studnicky/iridis-rdf';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import * as VueModule from 'vue';

import { debounce } from '~/utils/debounce.ts';

import { COLOR_PIPELINE } from './colorPipeline.ts';
import { createColorEngine } from './createColorEngine.ts';
import { MultiOutputEntity } from './entities/MultiOutputEntity.ts';
import { MultiOutputRequestEntity } from './entities/MultiOutputRequestEntity.ts';
import { OutputRowEntity } from './entities/OutputRowEntity.ts';
import { PaletteResolveRequestEntity } from './entities/PaletteResolveRequestEntity.ts';
import { logger } from './logger.ts';
import { PaletteResolve } from './paletteResolve.ts';
import { useIridis } from './useIridis.ts';

/** One palette, every real output emitter: CSS, component libraries, mobile, RDF, and JSON. */
const outputsByKey = VueModule.ref<Record<string, OutputRowEntity.Type | undefined>>({});

class MainOutputs {
  static row(label: string, language: string, text: string): OutputRowEntity.Type {
    const result = OutputRowEntity.create({ 'label': label, 'language': language, 'text': text });
    return result;
  }

  static build(request: MultiOutputRequestEntity.Type): Record<string, OutputRowEntity.Type | undefined> {
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
      ...COLOR_PIPELINE,
      'emit:cssVars', 'emit:cssVarsScoped', 'emit:tailwindTheme', 'emit:json',
      'emit:shadcnTheme', 'emit:muiTheme', 'emit:chakraTheme', 'emit:pandaTheme',
      'emit:capacitorStatusBar', 'emit:capacitorSplashScreen', 'emit:capacitorTheme', 'emit:androidThemeXml',
      'reason:annotate', 'reason:serialize'
    ]);
    const input = InputEntity.intake(request.input);
    const state = engine.run(input);
    const output = MultiOutputEntity.intake(state.outputs);
    const rows: Record<string, OutputRowEntity.Type | undefined> = {};
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
    const { activeSeeds, colorSpace, contrastStrictness, cvdMode, enableStrictCompliance, framing, nonMandatoryLevel, schemaName } = useIridis();
    function generate(): void {
      try {
        const input = PaletteResolve.input(PaletteResolveRequestEntity.create({
          'colorSpace': colorSpace.value,
          'cvdMode': cvdMode.value,
          'enableStrictCompliance': enableStrictCompliance.value,
          'framing': framing.value,
          'nonMandatoryLevel': nonMandatoryLevel.value,
          'schemaName': schemaName.value,
          'seeds': PaletteResolve.seeds(activeSeeds.value),
          'strictness': contrastStrictness.value
        }));
        const request = MultiOutputRequestEntity.create({ 'input': input });
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
    VueModule.watch([activeSeeds, framing, schemaName, contrastStrictness, cvdMode, enableStrictCompliance, nonMandatoryLevel, colorSpace], schedule, { 'deep': true });
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
