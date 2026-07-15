// VSCode plugin type definitions.
// Module augmentation on PluginOutputsRegistry / PluginMetadataRegistry
// has been replaced with explicit schema contribution via VscodePlugin.schemas().

import type { ColorRecordInterfaceType } from '@studnicky/iridis';

/** Semantic token rule entry as written to outputs.vscode.semanticTokenRules */
export type SemanticRuleEntryInterfaceType = {
  'fontStyle': string | undefined;
  'foreground': string | undefined;
};

/** VS Code tokenColors rule */
export type TokenColorRuleInterfaceType = {
  'name':     string;
  'scope':    string | string[];
  'settings': {
    'fontStyle'?:  string;
    'foreground'?: string;
  };
};

/** VS Code theme.json shape */
export type ThemeJsonInterfaceType = {
  'colors':               Record<string, string>;
  'name':                 string;
  'semanticHighlighting': true;
  'semanticTokenColors':  Record<string, string | { 'fontStyle'?: string; 'foreground'?: string; }>;
  'tokenColors':          TokenColorRuleInterfaceType[];
  'type':                 'dark' | 'light' | 'hc-dark' | 'hc-light';
};

/**
 * Fields written by vscode emit tasks to state.outputs['vscode'].
 * All fields optional: any single task may be the first or only one in the pipeline.
 */
export type VscodeOutputSlotInterfaceType = {
  'semanticTokenRules'?: Record<string, SemanticRuleEntryInterfaceType>;
  'themeJson'?:          ThemeJsonInterfaceType;
  'workbenchColors'?:    Record<string, string>;
};

/**
 * Fields written by vscode tasks to state.metadata['vscode'].
 */
export type VscodeMetaSlotInterfaceType = {
  'baseTokens'?:         Record<string, ColorRecordInterfaceType>;
  'semanticTokenRules'?: Record<string, SemanticRuleEntryInterfaceType>;
};
