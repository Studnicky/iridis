/** Browser surfaces the preferences bridge reads and writes; callers supply them only after mount. */
export interface PresentationPreferencesTargetInterface {
  readonly 'element': { readonly 'dataset': DOMStringMap };
  readonly 'storage': {
    readonly 'getItem': (key: string) => string | null;
    readonly 'setItem': (key: string, value: string) => void;
  };
}
