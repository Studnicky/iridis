import type {
  CapacitorThemeOutputInterface,
  SplashScreenOutputInterface,
  StatusBarOutputInterface,
} from './index.ts';

declare module '@studnicky/iridis' {
  interface PluginOutputsRegistry {
    'capacitor': {
      'statusBar'?:       StatusBarOutputInterface;
      'splashScreen'?:    SplashScreenOutputInterface;
      'theme'?:           CapacitorThemeOutputInterface;
      'androidThemeXml'?: string;
    };
  }

  interface PluginMetadataRegistry {
    'capacitor': {
      'statusBarOverlay'?:          boolean;
      'splashRole'?:                string;
      'androidSplashResourceName'?: string;
    };
  }
}
