import {
  type ColorRecordInterfaceTypeEntity,
  CssVarName,
  type PaletteStateInterface,
  type PipelineContextInterface,
  type TaskInterface,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';

import type { CssVarsOutputInterface } from '../interfaces/CssVarsOutputInterface.ts';

import { CssAttributeSelector } from '../util/CssAttributeSelector.ts';
import { CssCustomPropertyPrefix } from '../util/CssCustomPropertyPrefix.ts';
import { P3Serializer } from '../util/P3Serializer.ts';

/**
 * Picks a Windows High Contrast (Forced Colors) system color keyword for
 * a resolved role record. The mapping is driven entirely by the record's
 * `hints.intent`; the schema-declared ontology is the contract; NO
 * substring inference happens on role names.
 *
 * Intent → system-token mapping (CSS Color 4 §6 / WHCM spec):
 *   text       → CanvasText
 *   background → Canvas
 *   accent     → Highlight
 *   muted      → GrayText      (WHCM token for de-emphasised content)
 *   critical   → CanvasText    (forced-colors strips colour state; legibility wins)
 *   positive   → CanvasText    (forced-colors strips colour state; legibility wins)
 *   link       → LinkText
 *   button     → ButtonFace
 *   onAccent   → HighlightText
 *   onButton   → ButtonText
 *
 * When `hints.intent` is missing (role schema declared no intent) the
 * mapping FALLS SAFE to `CanvasText` so text-shaped roles in undeclared
 * schemas remain legible against a default Canvas background rather
 * than disappearing into it. Roles that need a different forced-colors
 * mapping MUST declare an `intent` on the schema; see
 * {@link RoleDefinitionInterfaceType.intent}.
 */
class ForcedColorsToken {
  static readonly #tokens = new Map<string, string>([
    ['accent', 'Highlight'], ['background', 'Canvas'], ['button', 'ButtonFace'],
    ['critical', 'CanvasText'], ['link', 'LinkText'], ['muted', 'GrayText'],
    ['onAccent', 'HighlightText'], ['onButton', 'ButtonText'], ['positive', 'CanvasText'], ['text', 'CanvasText']
  ]);

  static resolve(record: ColorRecordInterfaceTypeEntity.Type): string {
    const result = ForcedColorsToken.#tokens.get(record.hints?.intent ?? '') ?? 'CanvasText';
    return result;
  }
}

class Declarations {
  static build(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): string[] {
    const result = Object.entries(roles).map(([role, record]) => {
      const varName = CssVarName.from(role, prefix);
      return `  ${varName}: ${record.hex};`;
    });
    return result;
  }
}

class RootBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): string {
    const decls = Declarations.build(roles, prefix);
    return `:root {\n${decls.join('\n')}\n}`;
  }
}

class ScopedBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string,
    scopeAttr: string | undefined,
    scopeName: string
  ): string {
    const decls = Declarations.build(roles, prefix);
    const selector = CssAttributeSelector.from(scopeAttr ?? 'data-theme', scopeName);
    return `${selector} {\n${decls.join('\n')}\n}`;
  }
}

class IndentedDeclarations {
  static join(declarations: readonly string[]): string {
    const lines: string[] = [];
    for (let index = 0; index < declarations.length; index += 1) {
      const declaration = declarations[index];
      if (declaration !== undefined) { lines.push(['  ', declaration].join('')); }
    }
    const result = lines.join('\n');
    return result;
  }
}

class DarkSchemeBlock {
  static build(
    darkRoles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): string {
    const decls = Declarations.build(darkRoles, prefix);
    return `@media (prefers-color-scheme: dark) {\n  :root {\n${IndentedDeclarations.join(decls)}\n  }\n}`;
  }
}

class ForcedColorsBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): string {
    const decls = Object.entries(roles).map(([role, record]) => {
      const varName = CssVarName.from(role, prefix);
      const token = ForcedColorsToken.resolve(record);
      return `  ${varName}: ${token};`;
    });
    return `@media (forced-colors: active) {\n  :root {\n${IndentedDeclarations.join(decls)}\n  }\n}`;
  }
}

/**
 * Builds the `@supports (color: color(display-p3 0 0 0))` block that
 * overrides the unconditional sRGB `:root` declarations with their
 * wide-gamut equivalents on P3-capable browsers. ONLY roles whose
 * resolved record has `displayP3` populated (i.e. the input OKLCH lay
 * outside sRGB, or the record arrived through `intake:p3`) are included
 * (sRGB-only roles fall through to the unconditional block).
 *
 * The `@supports` query mirrors the CSS Color 4 §6.5 feature-detection
 * idiom; the cascade then resolves sRGB-only → P3 override →
 * forced-colors override (in that order in the emitted file).
 *
 * Returns an empty string when no role has `displayP3` populated so the
 * caller can omit the block entirely.
 */
class WideGamutBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): string {
    const p3Decls: string[] = [];
    const entries = Object.entries(roles);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        const [role, record] = entry;
        if (record.displayP3 !== undefined) {
          const varName = CssVarName.from(role, prefix);
          p3Decls.push(`  ${varName}: ${P3Serializer.serialize(record.displayP3)};`);
        }
      }
    }
    if (p3Decls.length === 0) {return '';}
    return `@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${IndentedDeclarations.join(p3Decls)}\n  }\n}`;
  }
}

class VarMap {
  static build(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix: string
  ): Record<string, string> {
    const map: Record<string, string> = {};
    const rolesNames = Object.keys(roles);
    for (let index = 0; index < rolesNames.length; index += 1) {
      const role = rolesNames[index];
      if (role !== undefined) {
        Object.defineProperty(map, role, {
          'configurable': true,
          'enumerable':   true,
          'value':        CssVarName.from(role, prefix),
          'writable':     true
        });
      }
    }
    return map;
  }
}

class EmitCssVars implements TaskInterface {
  readonly name = 'emit:cssVars';

  readonly manifest: TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Emit CSS custom property blocks from resolved roles and variants',
    'name':        'emit:cssVars',
    'reads':       ['roles', 'variants', 'metadata'],
    'writes':      ['outputs.stylesheet:cssVars']
  });

  // math() accessor satisfies PluginInterface if ever used standalone; not required here
  // but the class only needs TaskInterface

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const prefix = CssCustomPropertyPrefix.from(
      typeof state.metadata.cssVarPrefix === 'string' ? state.metadata.cssVarPrefix : undefined
    );
    const scopeAttr = typeof state.metadata.scopeAttr   === 'string' ? state.metadata.scopeAttr   : undefined;
    const themeName = typeof state.metadata.themeName   === 'string' ? state.metadata.themeName   : 'default';

    const darkRoles = state.variants.dark;

    const rootBlock    = RootBlock.build(state.roles, prefix);
    const scopedBlock  = ScopedBlock.build(state.roles, prefix, scopeAttr, themeName);
    const darkScheme   = darkRoles !== undefined ? DarkSchemeBlock.build(darkRoles, prefix) : '';
    const forcedColors = ForcedColorsBlock.build(state.roles, prefix);
    const wideGamut    = WideGamutBlock.build(state.roles, prefix);

    // Cascade order: sRGB defaults → dark-scheme override → wide-gamut
    // override (P3-capable browsers) → forced-colors override (Windows
    // High Contrast Mode). Later blocks win in the cascade; forced-colors
    // is intentionally last so accessibility tokens override any colored
    // value emitted above them.
    const parts = [rootBlock, darkScheme, wideGamut, forcedColors].filter(Boolean);
    const full  = parts.join('\n\n');
    const map   = VarMap.build(state.roles, prefix);

    const output: CssVarsOutputInterface = {
      'darkScheme':   darkScheme,
      'forcedColors': forcedColors,
      'full':         full,
      'map':          map,
      'rootBlock':    rootBlock,
      'scopedBlock':  scopedBlock,
      'wideGamut':    wideGamut
    };

    state.outputs['stylesheet:cssVars'] = output;
  }
}

export const emitCssVars = new EmitCssVars();
