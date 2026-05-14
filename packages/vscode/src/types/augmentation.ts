import type { ColorRecordInterface } from '@studnicky/iridis';

/** Semantic token rule entry as written to outputs.vscode.semanticTokenRules */
export interface SemanticRuleEntryInterface {
  'foreground'?: string;
  'fontStyle'?:  string;
}

/** VS Code tokenColors rule */
export interface TokenColorRuleInterface {
  'name':     string;
  'scope':    string | readonly string[];
  'settings': {
    'foreground'?: string;
    'fontStyle'?:  string;
  };
}

/** VS Code theme.json shape */
export interface ThemeJsonInterface {
  'name':                 string;
  'type':                 'dark' | 'light' | 'hc-dark' | 'hc-light';
  'semanticHighlighting': true;
  'colors':               Record<string, string>;
  'semanticTokenColors':  Record<string, string | { 'foreground'?: string; 'fontStyle'?: string }>;
  'tokenColors':          TokenColorRuleInterface[];
}

/**
 * Fields written by vscode emit tasks to state.outputs['vscode'].
 * All fields optional: any single task may be the first or only one in the pipeline.
 */
export interface VscodeOutputSlotInterface {
  'workbenchColors'?:    Record<string, string>;
  'semanticTokenRules'?: Record<string, SemanticRuleEntryInterface>;
  'themeJson'?:          ThemeJsonInterface;
}

/**
 * Fields written by vscode tasks to state.metadata['vscode'].
 * Written by: ExpandTokens (baseTokens), ApplyModifiers (semanticTokenRules).
 *
 * `baseTokens` carries full {@link ColorRecordInterface} entries — NOT
 * pre-serialised hex strings — so downstream emit tasks
 * (`EmitVscodeThemeJson`, `EmitVscodeSemanticRules`) can decide per slot
 * whether to emit the sRGB hex or the wide-gamut `color(display-p3 r g b)`
 * form based on whether the record carries `displayP3`. Math primitives
 * applied by `ExpandTokens` / `ApplyModifiers` (lighten, mixHsl,
 * ensureContrast, ...) re-derive `displayP3` through
 * `colorRecordFactory.fromOklch` so the wide-gamut signal survives the
 * derivation chain when applicable.
 */
export interface VscodeMetaSlotInterface {
  'baseTokens'?:         Record<string, ColorRecordInterface>;
  'semanticTokenRules'?: Record<string, SemanticRuleEntryInterface>;
}

declare module '@studnicky/iridis' {
  interface PluginOutputsRegistry {
    'vscode': VscodeOutputSlotInterface;
  }

  interface PluginMetadataRegistry {
    'vscode': VscodeMetaSlotInterface;
  }
}
