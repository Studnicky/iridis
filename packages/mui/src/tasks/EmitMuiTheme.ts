import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { MuiOutputInterfaceType } from '../types/index.ts';

/** MUI's `PaletteColor` shape: base tone plus its light/dark steps and paired text. */
type MuiPaletteColor = {
  'contrastText': string;
  'dark':         string;
  'light':        string;
  'main':         string;
};

/**
 * Builds a single MUI palette color family (primary/secondary/error/...) from
 * a role name, falling back to the engine's `s300`/`s700` shade variants for
 * `light`/`dark` and to the paired `on-<role>` role for `contrastText`.
 *
 * Returns `undefined` when the base role itself is absent — MUI expects a
 * family to be either fully present or omitted, never partially populated
 * with guessed values.
 */
class PaletteFamily {
  static build(
    roles:    Record<string, ColorRecordInterfaceType>,
    variants: Record<string, Record<string, ColorRecordInterfaceType>>,
    role:     string
  ): MuiPaletteColor | undefined {
    const base = roles[role];
    if (base === undefined) {return undefined;}

    const main  = base.hex;
    const light = variants['s300']?.[role]?.hex ?? main;
    const dark  = variants['s700']?.[role]?.hex ?? main;

    const contrastText = roles[`on-${role}`]?.hex ?? roles['text']?.hex ?? '#ffffff';

    return { 'contrastText': contrastText, 'dark': dark, 'light': light, 'main': main };
  }
}

/**
 * Serializes the built palette object to a readable, single-quoted JS object
 * literal string, wrapped as an `export default` module suitable for direct
 * import into `createTheme({ palette })`.
 */
class PaletteToJs {
  static serialize(palette: Record<string, unknown>, indent = 2): string {
    const pad = ' '.repeat(indent);
    const lines: string[] = ['{'];
    for (const [key, value] of Object.entries(palette)) {
      if (typeof value === 'string') {
        lines.push(`${pad}'${key}': '${value}',`);
      } else if (value !== null && typeof value === 'object') {
        const nested = PaletteToJs.serialize(value as Record<string, unknown>, indent + 2);
        lines.push(`${pad}'${key}': ${nested},`);
      }
    }
    lines.push(`${' '.repeat(indent - 2)}}`);
    return lines.join('\n');
  }
}

/**
 * Emit an MUI `createTheme()`-compatible palette object from resolved roles
 * and shade variants. Registered as the `emit:muiTheme` pipeline task.
 */
export class EmitMuiTheme implements TaskInterface {
  readonly 'name' = 'emit:muiTheme';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit an MUI createTheme() palette object from resolved roles and shade variants',
    'name':        'emit:muiTheme',
    'reads':       ['roles', 'variants', 'runtime'],
    'writes':      ['outputs.mui:theme']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const { roles, variants } = state;

    const palette: Record<string, unknown> = {};

    const primary = PaletteFamily.build(roles, variants, 'brand');
    if (primary !== undefined) {palette['primary'] = primary;}

    const secondary = PaletteFamily.build(roles, variants, 'accent-alt')
      ?? PaletteFamily.build(roles, variants, 'brand');
    if (secondary !== undefined) {palette['secondary'] = secondary;}

    const error = PaletteFamily.build(roles, variants, 'error');
    if (error !== undefined) {palette['error'] = error;}

    const warning = PaletteFamily.build(roles, variants, 'warning')
      ?? PaletteFamily.build(roles, variants, 'brand');
    if (warning !== undefined) {palette['warning'] = warning;}

    const info = PaletteFamily.build(roles, variants, 'info')
      ?? PaletteFamily.build(roles, variants, 'brand');
    if (info !== undefined) {palette['info'] = info;}

    const success = PaletteFamily.build(roles, variants, 'success')
      ?? PaletteFamily.build(roles, variants, 'brand');
    if (success !== undefined) {palette['success'] = success;}

    const background: Record<string, string> = {};
    if (roles['background']?.hex !== undefined) {background['default'] = roles['background'].hex;}
    const paper = roles['surface']?.hex ?? roles['bg-soft']?.hex ?? roles['background']?.hex;
    if (paper !== undefined) {background['paper'] = paper;}
    if (Object.keys(background).length > 0) {palette['background'] = background;}

    const text: Record<string, string> = {};
    if (roles['text']?.hex !== undefined) {text['primary'] = roles['text'].hex;}
    const secondaryText = roles['text-subtle']?.hex ?? roles['muted']?.hex ?? roles['text']?.hex;
    if (secondaryText !== undefined) {text['secondary'] = secondaryText;}
    if (Object.keys(text).length > 0) {palette['text'] = text;}

    palette['mode'] = state.runtime.framing ?? 'light';

    const config = [
      'export default {',
      `  palette: ${PaletteToJs.serialize(palette, 4)},`,
      '};'
    ].join('\n');

    const output: MuiOutputInterfaceType = {
      'config':  config,
      'palette': palette
    };

    state.outputs['mui:theme'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitMuiTheme')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Emitted MUI theme palette')
        .context({ 'families': Object.keys(palette).length })
        .build()
    );
  }
}
