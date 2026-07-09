export type CssVarsOutputInterfaceType = {
  'darkScheme':   string;
  'forcedColors': string;
  'full':         string;
  'map':          Record<string, string>;
  'rootBlock':    string;
  'scopedBlock':  string;
  'wideGamut':    string;
};

export type CssVarsScopedOutputInterfaceType = {
  'blocks':    Record<string, string>;
  'full':      string;
  'wideGamut': Record<string, string>;
};

export type * from './augmentation.ts';
