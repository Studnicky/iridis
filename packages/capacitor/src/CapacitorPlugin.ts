import type {
  PluginInterface,
  PluginSchemaContributionInterfaceType,
  TaskInterface
} from '@studnicky/iridis';

import { CAPACITOR_OUTPUT_SCHEMAS } from './constants/CapacitorOutputSchemas.ts';
import { emitAndroidThemeXml }       from './tasks/EmitAndroidThemeXml.ts';
import { emitCapacitorSplashScreen } from './tasks/EmitCapacitorSplashScreen.ts';
import { emitCapacitorStatusBar }    from './tasks/EmitCapacitorStatusBar.ts';
import { emitCapacitorTheme }        from './tasks/EmitCapacitorTheme.ts';

export class CapacitorPlugin implements PluginInterface {
  readonly 'name'    = 'capacitor';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      emitCapacitorStatusBar,
      emitCapacitorTheme,
      emitCapacitorSplashScreen,
      emitAndroidThemeXml
    ];
  }

  schemas(): PluginSchemaContributionInterfaceType {
    return {
      'metadata': undefined,
      'outputs': {
        'capacitor:androidThemeXml': CAPACITOR_OUTPUT_SCHEMAS.androidThemeXml,
        'capacitor:splashScreen':    CAPACITOR_OUTPUT_SCHEMAS.splashScreen,
        'capacitor:statusBar':       CAPACITOR_OUTPUT_SCHEMAS.statusBar,
        'capacitor:theme':           CAPACITOR_OUTPUT_SCHEMAS.theme
      }
    };
  }
}
