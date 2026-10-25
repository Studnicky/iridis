import './types/augmentation.ts';
import { CapacitorPlugin } from './CapacitorPlugin.ts';

export { CapacitorPlugin };
export { CapacitorOutputsEntity } from './entities/CapacitorOutputsEntity.ts';
export const capacitorPlugin = new CapacitorPlugin();

export { emitAndroidThemeXml }       from './tasks/EmitAndroidThemeXml.ts';
export { emitCapacitorSplashScreen } from './tasks/EmitCapacitorSplashScreen.ts';
export { emitCapacitorStatusBar }    from './tasks/EmitCapacitorStatusBar.ts';
export { emitCapacitorTheme }        from './tasks/EmitCapacitorTheme.ts';
export type {
  CapacitorThemeOutputEntity,
  SplashScreenOutputEntity,
  StatusBarOutputEntity
} from './types/index.ts';
