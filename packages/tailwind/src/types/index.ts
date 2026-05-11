export interface TailwindOutputInterface {
  readonly 'colors':  Record<string, string | Record<string, string>>;
  readonly 'cssVars': string;
  readonly 'config':  string;
}
