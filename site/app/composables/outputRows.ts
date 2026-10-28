import type { Engine, PaletteStateInterface } from '@studnicky/iridis';

import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import { chakraPlugin } from '@studnicky/iridis-chakra';
import { muiPlugin } from '@studnicky/iridis-mui';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { rdfPlugin } from '@studnicky/iridis-rdf';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';

import type { OutputKeyEntity } from './entities/OutputKeyEntity.ts';

import { EmittedOutputsEntity } from './entities/EmittedOutputsEntity.ts';
import { OutputRowEntity } from './entities/OutputRowEntity.ts';

/** Output plugins, emit tasks, and the rows read from one engine run. */
export class OutputRows {
  public static readonly tasks = [
    'emit:cssVars', 'emit:cssVarsScoped', 'emit:tailwindTheme', 'emit:json',
    'emit:shadcnTheme', 'emit:muiTheme', 'emit:chakraTheme', 'emit:pandaTheme',
    'emit:capacitorStatusBar', 'emit:capacitorSplashScreen', 'emit:capacitorTheme', 'emit:androidThemeXml',
    'reason:annotate', 'reason:serialize'
  ];

  public static adopt(engine: Engine): void {
    engine.adopt(stylesheetPlugin);
    engine.adopt(tailwindPlugin);
    engine.adopt(shadcnPlugin);
    engine.adopt(muiPlugin);
    engine.adopt(chakraPlugin);
    engine.adopt(pandaPlugin);
    engine.adopt(capacitorPlugin);
    engine.adopt(rdfPlugin);
  }

  public static build(outputs: PaletteStateInterface['outputs']): Map<OutputKeyEntity.Type, OutputRowEntity.Type> {
    const output = EmittedOutputsEntity.intake(outputs);
    const rows = new Map<OutputKeyEntity.Type, OutputRowEntity.Type>();
    const cssVariables = output['stylesheet:cssVars'];
    if (cssVariables !== undefined) {rows.set('cssVars', OutputRows.row('CSS variables', 'css', cssVariables.full));}
    const scopedCssVariables = output['stylesheet:cssVarsScoped'];
    if (scopedCssVariables !== undefined) {rows.set('cssVarsScoped', OutputRows.row('CSS variables (scoped)', 'css', scopedCssVariables.full));}
    const tailwindTheme = output['tailwind:theme'];
    if (tailwindTheme !== undefined) {rows.set('tailwind', OutputRows.row('Tailwind', 'javascript', tailwindTheme.config));}
    const shadcnTheme = output['shadcn:theme'];
    if (shadcnTheme !== undefined) {rows.set('shadcn', OutputRows.row('shadcn/ui', 'css', shadcnTheme.cssVars));}
    const muiTheme = output['mui:theme'];
    if (muiTheme !== undefined) {rows.set('mui', OutputRows.row('MUI', 'javascript', muiTheme.config));}
    const chakraTheme = output['chakra:theme'];
    if (chakraTheme !== undefined) {rows.set('chakra', OutputRows.row('Chakra UI', 'javascript', chakraTheme.config));}
    const pandaTheme = output['panda:theme'];
    if (pandaTheme !== undefined) {
      rows.set('panda', OutputRows.row('Panda CSS', 'javascript', pandaTheme.pandaConfig));
      rows.set('unocss', OutputRows.row('UnoCSS', 'javascript', pandaTheme.unoConfig));
    }
    const capacitorTheme = output['capacitor:theme'];
    if (capacitorTheme !== undefined) {rows.set('capacitor', OutputRows.row('Capacitor', 'javascript', JSON.stringify(capacitorTheme, null, 2)));}
    const androidThemeXml = output['capacitor:androidThemeXml'];
    if (androidThemeXml !== undefined) {rows.set('androidThemeXml', OutputRows.row('Android theme.xml', 'xml', androidThemeXml));}
    const jsonOutput = output['core:json'];
    if (jsonOutput !== undefined) {rows.set('json', OutputRows.row('JSON', 'javascript', JSON.stringify(jsonOutput, null, 2)));}
    const serializedRdf = output['rdf:serialized'];
    if (serializedRdf !== undefined) {rows.set('rdf', OutputRows.row('RDF (Turtle)', 'turtle', serializedRdf));}
    return rows;
  }

  private static row(label: string, language: string, text: string): OutputRowEntity.Type {
    const result = OutputRowEntity.create({ 'label': label, 'language': language, 'text': text });
    return result;
  }
}
