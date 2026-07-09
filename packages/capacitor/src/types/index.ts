export type StatusBarOutputInterfaceType = {
  'backgroundColor': string;
  'overlay':         boolean;
  'style':           'DARK' | 'LIGHT';
};

export type CapacitorThemeOutputInterfaceType = {
  'accent':         string;
  'background':     string;
  'error':          string;
  'info':           string;
  'primary':        string;
  'primaryDark':    string;
  'primaryLight':   string;
  'success':        string;
  'surface':        string;
  'text':           string;
  'textOnAccent':   string;
  'textOnPrimary':  string;
  'warning':        string;
};

export type SplashScreenOutputInterfaceType = {
  'androidSplashResourceName'?: string;
  'backgroundColor':            string;
};

export type * from './augmentation.ts';
