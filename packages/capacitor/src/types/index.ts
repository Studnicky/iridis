import type { JSONSchema7Type } from 'json-schema';

export abstract class StatusBarOutputInterfaceType {
  [key: string]: JSONSchema7Type;

  abstract 'backgroundColor': string;
  abstract 'overlay':         JSONSchema7Type;
  abstract 'style':           JSONSchema7Type;
}

export abstract class CapacitorThemeOutputInterfaceType {
  [key: string]: JSONSchema7Type;

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
  [key: string]: JSONSchema7Type;

  abstract 'androidSplashResourceName'?: string;
  abstract 'backgroundColor':            string;
}

export type * from './augmentation.ts';
