/**
 * Stylesheet plugin output shapes.
 *
 * Each interface describes a slot written into `state.outputs.cssVars*` by
 * the matching `emit:cssVars*` task.
 */

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
  readonly 'blocks': Record<string, string>;
  readonly 'full':   string;
}
