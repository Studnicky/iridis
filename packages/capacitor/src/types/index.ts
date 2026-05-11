export interface StatusBarOutputInterface {
  readonly 'backgroundColor': string;
  readonly 'style':           'DARK' | 'LIGHT';
  readonly 'overlay':         boolean;
}

export interface CapacitorThemeOutputInterface {
  readonly 'primary':        string;
  readonly 'primaryDark':    string;
  readonly 'primaryLight':   string;
  readonly 'accent':         string;
  readonly 'background':     string;
  readonly 'surface':        string;
  readonly 'error':          string;
  readonly 'warning':        string;
  readonly 'success':        string;
  readonly 'info':           string;
  readonly 'text':           string;
  readonly 'textOnPrimary':  string;
  readonly 'textOnAccent':   string;
}

export interface SplashScreenOutputInterface {
  readonly 'backgroundColor':            string;
  readonly 'androidSplashResourceName'?: string;
}
