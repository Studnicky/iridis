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
 */
export interface VscodeMetaSlotInterface {
  'baseTokens'?:         Record<string, string>;
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
