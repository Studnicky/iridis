import { InputInterfaceTypeEntity } from '@studnicky/iridis';
import { JsonValue } from '@studnicky/types/browser';

import type { SchemaPair } from '../composables/types/index.ts';

import { ContrastConfigFor } from '../composables/contrastConfigFor.ts';
import { createColorEngine } from '../composables/createColorEngine.ts';
import { optionalContrastStages } from '../composables/optionalContrastStages.ts';
import { pickerSeedInputs } from '../composables/pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from '../composables/requiredColorStages.ts';
import { spliceOptionalStages } from '../composables/spliceOptionalStages.ts';
import { DEFAULT_DERIVATION_CONFIG } from '../composables/types/index.ts';
import { VARIANT_CONFIG } from '../composables/variantConfig.ts';
import { roleSchemaByName } from './RoleSchemaByName.ts';
import { Tokens } from './Tokens.ts';

/** Produces the optional static snapshot of the site's default engine-resolved theme. */
export class DefaultThemeCss {
  private static readonly baseSelector = 'html:root, html:root.dark, html:root:not(.dark)';
  private static readonly seeds = [
    { 'hex': '#7c3aed', 'role': undefined },
    { 'hex': '#06b6d4', 'role': undefined },
    { 'hex': '#f59e0b', 'role': undefined },
    { 'hex': '#ec4899', 'role': undefined }
  ];

  private static schemaPair(): SchemaPair {
    const entries = Object.entries(roleSchemaByName);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry?.[0] === 'iridis-32') {
        const pair = entry[1];
        return pair;
      }
    }
    throw new RangeError('No role schema is registered for iridis-32');
  }

  private static generateDarkFrame(): string {
    const engine = createColorEngine();
    engine.pipeline(spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(2)));
    const pair = DefaultThemeCss.schemaPair();
    const state = engine.run(InputInterfaceTypeEntity.create({
      'colors':   pickerSeedInputs(DefaultThemeCss.seeds),
      'contrast': ContrastConfigFor.forStrictness(2, ContrastConfigFor.correctingCvd),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DEFAULT_DERIVATION_CONFIG),
        'derivation:semanticHuesEnabled': JsonValue.from(true)
      },
      'roles':   pair.dark,
      'runtime': { 'colorSpace': 'srgb', 'framing': 'dark' }
    }));
    const maps = Tokens.extractEngineMaps(state);
    const css = Tokens.toCssText(Tokens.mapFromEngine(maps.roles, maps.scales));
    const themedCss = css.replace(DefaultThemeCss.baseSelector, 'html:root.dark');
    return themedCss;
  }

  private static generateLightFrame(): string {
    const engine = createColorEngine();
    engine.pipeline(spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(2)));
    const pair = DefaultThemeCss.schemaPair();
    const state = engine.run(InputInterfaceTypeEntity.create({
      'colors':   pickerSeedInputs(DefaultThemeCss.seeds),
      'contrast': ContrastConfigFor.forStrictness(2, ContrastConfigFor.correctingCvd),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DEFAULT_DERIVATION_CONFIG),
        'derivation:semanticHuesEnabled': JsonValue.from(true)
      },
      'roles':   pair.light,
      'runtime': { 'colorSpace': 'srgb', 'framing': 'light' }
    }));
    const maps = Tokens.extractEngineMaps(state);
    const css = Tokens.toCssText(Tokens.mapFromEngine(maps.roles, maps.scales));
    const themedCss = css.replace(DefaultThemeCss.baseSelector, 'html:root, html:root:not(.dark)');
    return themedCss;
  }

  static generate(): string {
    const light = DefaultThemeCss.generateLightFrame();
    const dark = DefaultThemeCss.generateDarkFrame();
    const themeCss = `${light  }\n${  dark}`;
    return themeCss;
  }
}
