import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { CssVarName, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { TailwindOutputInterface } from '../interfaces/TailwindOutputInterface.ts';

import { ColorsShapeRecordEntity } from '../entities/ColorsShapeRecordEntity.ts';
import { EMIT_TAILWIND_THEME_CONSTANTS } from './constants/EmitTailwindThemeConstants.ts';

/**
 * Display-P3 channel triple → CSS Color 4 `color(display-p3 r g b)` at
 * 4dp precision. Returns empty string when the input is `undefined` so
 * callers can branch on length without an extra null check.
 *
 * Local duplicate of the stylesheet plugin's helper rather than a
 * cross-plugin import; the tailwind plugin must not depend on
 * `@studnicky/iridis-stylesheet` (sibling-rank plugins shouldn't form a
 * dep graph between themselves).
 */
class P3 {
  static serialize(p3: ColorRecordInterfaceTypeEntity.Type['displayP3']): string {
    if (p3 === undefined) {return '';}
    const r = p3.r.toFixed(4);
    const g = p3.g.toFixed(4);
    const b = p3.b.toFixed(4);
    return `color(display-p3 ${r} ${g} ${b})`;
  }
}

/**
 * Groups roles into shade scales when the name follows `<root>-<shade>` with a
 * numeric shade value.  Roles that do not match the pattern become flat color
 * strings. If only one member of a candidate group is present it is NOT grouped
 * (kept flat) to avoid single-key nested objects.
 */
class ColorsShape {
  static build(roles: Record<string, ColorRecordInterfaceTypeEntity.Type>): ColorsShapeRecordEntity.Type {
    const groups = new Map<string, Map<string, string>>();
    const flat = new Map<string, string>();
    const roleEntries = Object.entries(roles);

    for (let index = 0; index < roleEntries.length; index += 1) {
      const [role, record] = roleEntries[index]!;
      const match = EMIT_TAILWIND_THEME_CONSTANTS.shadeRolePattern.exec(role);
      const root = match?.[1];
      const shade = match?.[2];
      if (root !== undefined && shade !== undefined && EMIT_TAILWIND_THEME_CONSTANTS.tailwindShades.has(shade)) {
        const shades = groups.get(root) ?? new Map<string, string>();
        shades.set(shade, record.hex);
        groups.set(root, shades);
      } else {
        flat.set(role, record.hex);
      }
    }

    const colors = ColorsShapeRecordEntity.create({});
    const flatEntries = Array.from(flat.entries());
    for (let index = 0; index < flatEntries.length; index += 1) {
      const [role, hex] = flatEntries[index]!;
      Object.defineProperty(colors, role, { 'configurable': true, 'enumerable': true, 'value': hex, 'writable': true });
    }

    const groupEntries = Array.from(groups.entries());
    for (let index = 0; index < groupEntries.length; index += 1) {
      const [root, shades] = groupEntries[index]!;
      const shadeEntries = Array.from(shades.entries());
      if (shadeEntries.length === 1) {
        const [shade, hex] = shadeEntries[0]!;
        Object.defineProperty(colors, `${root}-${shade}`, { 'configurable': true, 'enumerable': true, 'value': hex, 'writable': true });
      } else {
        const shadeScale: Record<string, string> = {};
        for (let shadeIndex = 0; shadeIndex < shadeEntries.length; shadeIndex += 1) {
          const [shade, hex] = shadeEntries[shadeIndex]!;
          Object.defineProperty(shadeScale, shade, { 'configurable': true, 'enumerable': true, 'value': hex, 'writable': true });
        }
        Object.defineProperty(colors, root, { 'configurable': true, 'enumerable': true, 'value': shadeScale, 'writable': true });
      }
    }
    return colors;
  }
}

/**
 * Serializes a colors shape to a JSON-compatible JS object literal string,
 * which is safe to embed in a tailwind.config.js export default.
 */
class ColorsToJs {
  static indentConfigLine(line: string, index: number): string {
    const result = index === 0 ? line : `      ${  line}`;
    return result;
  }

  static serialize(colors: ColorsShapeRecordEntity.Type): string {
    const lines: string[] = ['{'];
    const colorEntries = Object.entries(colors);
    for (let index = 0; index < colorEntries.length; index += 1) {
      const [key, value] = colorEntries[index]!;
      if (typeof value === 'string') {
        lines.push(`  '${key}': '${value}',`);
      } else {
        lines.push(`  '${key}': {`);
        const shadeEntries = Object.entries(value);
        for (let shadeIndex = 0; shadeIndex < shadeEntries.length; shadeIndex += 1) {
          const [shade, hex] = shadeEntries[shadeIndex]!;
          lines.push(`    '${shade}': '${hex}',`);
        }
        lines.push('  },');
      }
    }
    lines.push('}');
    const result = lines.join('\n');
    return result;
  }
}

/**
 * Builds the companion --c-* CSS sheet.
 *
 * For Tailwind v4 CSS-first themes the colors are expressed as custom
 * properties that the `@theme` directive can reference. When any role
 * carries `displayP3` (out-of-sRGB OKLCH input or `intake:p3` origin),
 * an `@supports (color: color(display-p3 0 0 0))` sibling block is
 * appended that re-declares those vars in P3; Tailwind utilities
 * consuming the variable inherit the cascade automatically, so
 * `bg-primary` on a P3-capable browser resolves to the wide-gamut value
 * without any plugin-side work.
 *
 * Browsers without P3 support fall through to the unconditional sRGB
 * declarations. Returns the full cascade as a single newline-joined
 * string; consumers that want only the sRGB layer can use
 * `output.colors` (always hex, always sRGB-safe).
 */
class CssVarsSheet {
  static indent(declaration: string): string {
    const result = `  ${  declaration}`;
    return result;
  }

  static build(
    roles:  Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): string {
    const decls = Object.entries(roles).map(([role, record]) => {
      const varName = CssVarName.from(role, prefix);
      return `  ${varName}: ${record.hex};`;
    });
    const sRgbBlock = `:root {\n${decls.join('\n')}\n}`;

    const p3Decls: string[] = [];
    const roleEntries = Object.entries(roles);
    for (let index = 0; index < roleEntries.length; index += 1) {
      const [role, record] = roleEntries[index]!;
      if (record.displayP3 !== undefined) {
        const varName = CssVarName.from(role, prefix);
        p3Decls.push(`  ${varName}: ${P3.serialize(record.displayP3)};`);
      }
    }
    if (p3Decls.length === 0) {
      return sRgbBlock;
    }

    const indentedP3Declarations = p3Decls.map(CssVarsSheet.indent).join('\n');
    const p3Block = `@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${indentedP3Declarations}\n  }\n}`;
    const result = `${sRgbBlock}\n\n${p3Block}`;
    return result;
  }
}

/**
 * Emit Tailwind theme.colors object and config module from resolved roles.
 * Registered as the `emit:tailwindTheme` pipeline task.
 */
export class EmitTailwindTheme implements TaskInterface {
  readonly 'name' = 'emit:tailwindTheme';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Emit Tailwind theme.colors object and config module from resolved roles',
    'name':        'emit:tailwindTheme',
    'reads':       ['roles', 'metadata'],
    'writes':      ['outputs.tailwind:theme']});

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const prefixRaw = state.metadata.cssVarPrefix;
    const prefix    = typeof prefixRaw === 'string' ? prefixRaw : '--c-';

    const colors  = ColorsShape.build(state.roles);
    const cssVars = CssVarsSheet.build(state.roles, prefix);

    const colorsJs = ColorsToJs.serialize(colors);
    const colorLines = colorsJs.split('\n');
    const indentedColorLines = colorLines.map(ColorsToJs.indentConfigLine).join('\n');
    const config = [
      'export default {',
      '  theme: {',
      '    extend: {',
      `      colors: ${indentedColorLines},`,
      '    },',
      '  },',
      '};'
    ].join('\n');

    const output: TailwindOutputInterface = {
      'colors':  colors,
      'config':  config,
      'cssVars': cssVars
    };

    state.outputs['tailwind:theme'] = output;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitTailwindTheme',
        'context': { 'colorGroups': Object.keys(colors).length },
        'message': 'Emitted Tailwind theme',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}
