import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import type { TailwindOutputInterface } from '../types/index.ts';

/** Regex that matches roles following the `<root>-<shade>` pattern where shade is numeric. */
const SHADE_ROLE_RE = /^(.+)-(\d+)$/;

/** Standard Tailwind shade values (50–950). Used to validate shade grouping. */
const TAILWIND_SHADES = new Set([
  '50', '100', '150', '200', '250', '300', '350', '400',
  '450', '500', '550', '600', '650', '700', '750', '800',
  '850', '900', '950',
]);

type ColorsShape = Record<string, string | Record<string, string>>;

function toCssVarName(role: string, prefix: string): string {
  const kebab = role.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
  return `${prefix}${kebab}`;
}

/**
 * Groups roles into shade scales when the name follows `<root>-<shade>` with a
 * numeric shade value.  Roles that do not match the pattern become flat color
 * strings. If only one member of a candidate group is present it is NOT grouped
 * (kept flat) to avoid single-key nested objects.
 */
function buildColorsShape(roles: Record<string, ColorRecordInterface>): ColorsShape {
  // Collect candidate groups: root → { shade → hex }
  const groups: Record<string, Record<string, string>> = {};
  const flat:   Record<string, string>                 = {};

  for (const [role, record] of Object.entries(roles)) {
    const match = SHADE_ROLE_RE.exec(role);
    if (match && TAILWIND_SHADES.has(match[2] ?? '')) {
      const root  = match[1] as string;
      const shade = match[2] as string;
      if (!groups[root]) groups[root] = {};
      (groups[root] as Record<string, string>)[shade] = record.hex;
    } else {
      flat[role] = record.hex;
    }
  }

  const colors: ColorsShape = {};

  // Flat roles first
  for (const [role, hex] of Object.entries(flat)) {
    colors[role] = hex;
  }

  // Grouped shade scales
  for (const [root, shades] of Object.entries(groups)) {
    if (Object.keys(shades).length === 1) {
      // Single member — fold into flat
      const [[shade, hex]] = Object.entries(shades) as [[string, string]];
      colors[`${root}-${shade}`] = hex;
    } else {
      colors[root] = shades;
    }
  }

  return colors;
}

/**
 * Serialize the colors shape to a JSON-compatible JS object literal string,
 * which is safe to embed in a tailwind.config.js export default.
 */
function serializeColorsToJs(colors: ColorsShape): string {
  const lines: string[] = ['{'];
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string') {
      lines.push(`  '${key}': '${value}',`);
    } else {
      lines.push(`  '${key}': {`);
      for (const [shade, hex] of Object.entries(value)) {
        lines.push(`    '${shade}': '${hex}',`);
      }
      lines.push('  },');
    }
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Builds the companion --c-* CSS sheet.
 * For Tailwind v4 CSS-first themes the colors are expressed as custom properties
 * that the @theme directive can reference.
 */
function buildCssVarsSheet(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
): string {
  const decls = Object.entries(roles).map(([role, record]) => {
    const varName = toCssVarName(role, prefix);
    return `  ${varName}: ${record.hex};`;
  });
  return `:root {\n${decls.join('\n')}\n}`;
}

export class EmitTailwindTheme implements TaskInterface {
  readonly 'name' = 'emit:tailwindTheme';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:tailwindTheme',
    'reads':       ['roles', 'metadata'],
    'writes':      ['outputs.tailwind'],
    'description': 'Emit Tailwind theme.colors object and config module from resolved roles',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const prefix = typeof state.metadata['cssVarPrefix'] === 'string'
      ? state.metadata['cssVarPrefix']
      : '--c-';

    const colors  = buildColorsShape(state.roles);
    const cssVars = buildCssVarsSheet(state.roles, prefix);

    const colorsJs = serializeColorsToJs(colors);
    const config   = [
      'export default {',
      '  theme: {',
      '    extend: {',
      `      colors: ${colorsJs.split('\n').map((l, i) => i === 0 ? l : `      ${l}`).join('\n')},`,
      '    },',
      '  },',
      '};',
    ].join('\n');

    const output: TailwindOutputInterface = {
      'colors':  colors,
      'cssVars': cssVars,
      'config':  config,
    };

    state.outputs['tailwind'] = output;

    ctx.logger.debug(
      'EmitTailwindTheme',
      'run',
      `Emitted Tailwind theme with ${Object.keys(colors).length} color group(s)`,
    );
  }
}

export const emitTailwindTheme = new EmitTailwindTheme();
