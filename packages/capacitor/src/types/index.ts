export abstract class StatusBarOutputInterfaceType {
  abstract 'backgroundColor': string;
  abstract 'overlay':         boolean;
  abstract 'style':           'DARK' | 'LIGHT';
}

export abstract class CapacitorThemeOutputInterfaceType {
  abstract 'accent':         string;
  abstract 'background':     string;
  abstract 'error':          string;
  abstract 'info':           string;
  abstract 'primary':        string;
  abstract 'primaryDark':    string;
  abstract 'primaryLight':   string;
  abstract 'success':        string;
  abstract 'surface':        string;
  abstract 'text':           string;
  abstract 'textOnAccent':   string;
  abstract 'textOnPrimary':  string;
  abstract 'warning':        string;
}

export abstract class SplashScreenOutputInterfaceType {
  abstract 'androidSplashResourceName': string | undefined;
  abstract 'backgroundColor':            string;
}

export type * from './augmentation.ts';
