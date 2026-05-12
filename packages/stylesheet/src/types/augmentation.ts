import type {
  CssVarsOutputInterface,
  CssVarsScopedOutputInterface,
} from './index.ts';

declare module '@studnicky/iridis' {
  interface PluginOutputsRegistry {
    'cssVars':       CssVarsOutputInterface;
    'cssVarsScoped': CssVarsScopedOutputInterface;
  }

  interface PluginMetadataRegistry {
    'cssVarPrefix': string;
    'scopeAttr':    string;
    'themeName':    string;
    'scopePrefix':  string;
  }
}
