import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { toCssVarName } from '@studnicky/iridis';

import type { CssVarsOutputInterfaceType } from '../types/index.ts';

import { P3Serializer } from '../util/serializeP3.ts';

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
function forcedColorsToken(record: ColorRecordInterfaceType): string {
  switch (record.hints?.intent) {
    case 'accent':     return 'Highlight';
    case 'background': return 'Canvas';
    case 'button':     return 'ButtonFace';
    case 'critical':   return 'CanvasText';
    case 'link':       return 'LinkText';
    case 'muted':      return 'GrayText';
    case 'onAccent':   return 'HighlightText';
    case 'onButton':   return 'ButtonText';
    case 'positive':   return 'CanvasText';
    case 'text':       return 'CanvasText';
    default:           return 'CanvasText';
  }
}

class Declarations {
  static build(
    roles: Record<string, ColorRecordInterfaceType>,
    prefix: string
  ): string[] {
    const result = Object.entries(roles).map(([role, record]) => {
      const varName = toCssVarName(role, prefix);
      return `  ${varName}: ${record.hex};`;
    });
    return result;
  }
}

class RootBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceType>,
    prefix: string
  ): string {
    const decls = Declarations.build(roles, prefix);
    return `:root {\n${decls.join('\n')}\n}`;
  }
}

class ScopedBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceType>,
    prefix: string,
    scopeAttr: string | undefined,
    scopeName: string
  ): string {
    const decls = Declarations.build(roles, prefix);
    const selector = typeof scopeAttr === 'string' && scopeAttr.length > 0
      ? `[${scopeAttr}='${scopeName}']`
      : `[data-theme='${scopeName}']`;
    return `${selector} {\n${decls.join('\n')}\n}`;
  }
}

class DarkSchemeBlock {
  static build(
    darkRoles: Record<string, ColorRecordInterfaceType>,
    prefix: string
  ): string {
    const decls = Declarations.build(darkRoles, prefix);
    return `@media (prefers-color-scheme: dark) {\n  :root {\n${decls.map((d) => { const result = `  ${d}`; return result; }).join('\n')}\n  }\n}`;
  }
}

class ForcedColorsBlock {
  static build(
    roles: Record<string, ColorRecordInterfaceType>,
    prefix: string
  ): string {
    const decls = Object.entries(roles).map(([role, record]) => {
      const varName = toCssVarName(role, prefix);
      const token = forcedColorsToken(record);
      return `  ${varName}: ${token};`;
    });
    return `@media (forced-colors: active) {\n  :root {\n${decls.map((d) => { const result = `  ${d}`; return result; }).join('\n')}\n  }\n}`;
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
    roles: Record<string, ColorRecordInterfaceType>,
    prefix: string
  ): string {
    const p3Decls: string[] = [];
    for (const [role, record] of Object.entries(roles)) {
      if (record.displayP3 !== undefined) {
        const varName = toCssVarName(role, prefix);
        p3Decls.push(`  ${varName}: ${P3Serializer.serialize(record.displayP3)};`);
      }
    }
    if (p3Decls.length === 0) {return '';}
    return `@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${p3Decls.map((d) => { const result = `  ${d}`; return result; }).join('\n')}\n  }\n}`;
  }
}

class VarMap {
  static build(
    roles: Record<string, ColorRecordInterfaceType>,
    prefix: string
  ): Record<string, string> {
    const map: Record<string, string> = {};
    for (const role of Object.keys(roles)) {
      map[role] = toCssVarName(role, prefix);
    }
    return map;
  }
}

class EmitCssVars implements TaskInterface {
  readonly name = 'emit:cssVars';

  readonly manifest: TaskManifestInterfaceType = {
    'description': 'Emit CSS custom property blocks from resolved roles and variants',
    'name':        'emit:cssVars',
    'reads':       ['roles', 'variants', 'metadata'],
    'writes':      ['outputs.stylesheet:cssVars']
  };

  // math() accessor satisfies PluginInterface if ever used standalone; not required here
  // but the class only needs TaskInterface

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    const prefix    = typeof state.metadata.cssVarPrefix === 'string' ? state.metadata.cssVarPrefix : '--c-';
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

    const output: CssVarsOutputInterfaceType = {
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
