import type { SchemaPairType } from '../composables/types/index.ts';

import { contrastConfigFor } from '../composables/contrastConfigFor.ts';
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

  private static schemaPair(): SchemaPairType {
    for (const [name, pair] of Object.entries(roleSchemaByName)) {
      if (name === 'iridis-32') {return pair;}
    }
    throw new RangeError('No role schema is registered for iridis-32');
  }

  private static generateFrame(framing: 'dark' | 'light'): string {
    const engine = createColorEngine();
    engine.pipeline(spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(2)));
    const pair = DefaultThemeCss.schemaPair();
    const state = engine.run({
      'bypass':   undefined,
      'colors':   pickerSeedInputs(DefaultThemeCss.seeds),
      'contrast': contrastConfigFor(2, true),
      'emit':     undefined,
      'maxColors': undefined,
      'metadata': {
        'core:variantConfig': VARIANT_CONFIG,
        'derivation:config': DEFAULT_DERIVATION_CONFIG,
        'derivation:semanticHuesEnabled': true
      },
      'roles':   framing === 'dark' ? pair.dark : pair.light,
      'runtime': { 'colorSpace': 'srgb', 'extra': undefined, 'framing': framing }
    });
    const maps = Tokens.extractEngineMaps(state);
    const css = Tokens.toCssText(Tokens.mapFromEngine(maps.roles, maps.scales));
    const selector = framing === 'dark' ? 'html:root.dark' : 'html:root, html:root:not(.dark)';
    return css.replace(DefaultThemeCss.baseSelector, selector);
  }

  static generate(): string {
    const light = DefaultThemeCss.generateFrame('light');
    const dark = DefaultThemeCss.generateFrame('dark');
    return `${light}\n${dark}`;
  }
}
