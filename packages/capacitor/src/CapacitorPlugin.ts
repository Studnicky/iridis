import type {
  MathPrimitiveInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitAndroidThemeXml }    from './tasks/EmitAndroidThemeXml.ts';
import { emitCapacitorSplashScreen } from './tasks/EmitCapacitorSplashScreen.ts';
import { emitCapacitorStatusBar } from './tasks/EmitCapacitorStatusBar.ts';
import { emitCapacitorTheme }     from './tasks/EmitCapacitorTheme.ts';

export class CapacitorPlugin implements PluginInterface {
  readonly name    = 'capacitor';
  readonly version = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      emitCapacitorStatusBar,
      emitCapacitorTheme,
      emitCapacitorSplashScreen,
      emitAndroidThemeXml,
    ];
  }

  math(): readonly MathPrimitiveInterface[] {
    return [];
  }
}

export const capacitorPlugin = new CapacitorPlugin();
