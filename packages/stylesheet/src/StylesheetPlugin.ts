import type {
  PluginInterface,
  PluginSchemaContributionInterfaceType,
  TaskInterface
} from '@studnicky/iridis';

import { CSS_VARS_OUTPUT_SCHEMAS } from './constants/CssVarsOutputSchemas.ts';
import { emitCssVars }             from './tasks/EmitCssVars.ts';
import { emitCssVarsScoped }       from './tasks/EmitCssVarsScoped.ts';

class StylesheetPlugin implements PluginInterface {
  readonly 'name'    = 'stylesheet';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitCssVars, emitCssVarsScoped];
  }

  schemas(): PluginSchemaContributionInterfaceType {
    return {
      'metadata': undefined,
      'outputs': {
        'stylesheet:cssVars':       CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS,
        'stylesheet:cssVarsScoped': CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS_SCOPED
      }
    };
  }
}

export const stylesheetPlugin = new StylesheetPlugin();
