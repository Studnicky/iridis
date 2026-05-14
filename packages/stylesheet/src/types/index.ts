export interface CssVarsOutputInterface {
  readonly 'rootBlock':    string;
  readonly 'scopedBlock':  string;
  readonly 'darkScheme':   string;
  readonly 'forcedColors': string;
  readonly 'wideGamut':    string;
  readonly 'full':         string;
  readonly 'map':          Record<string, string>;
}

export interface CssVarsScopedOutputInterface {
  readonly 'blocks':    Record<string, string>;
  readonly 'wideGamut': Record<string, string>;
  readonly 'full':      string;
}

export type * from './augmentation.ts';
