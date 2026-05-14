import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { toCssVarName } from '@studnicky/iridis';
import type { CssVarsOutputInterface } from '../types/index.ts';
import { serializeP3 } from '../util/serializeP3.ts';

/**
 * Picks a Windows High Contrast (Forced Colors) system color keyword for
 * a resolved role record. The mapping is driven entirely by the record's
 * `hints.intent` — the schema-declared ontology is the contract; NO
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
 * {@link RoleDefinitionInterface.intent}.
 */
function forcedColorsToken(record: ColorRecordInterface): string {
  switch (record.hints?.intent) {
    case 'text':       return 'CanvasText';
    case 'background': return 'Canvas';
    case 'accent':     return 'Highlight';
    case 'muted':      return 'GrayText';
    case 'critical':   return 'CanvasText';
    case 'positive':   return 'CanvasText';
    case 'link':       return 'LinkText';
    case 'button':     return 'ButtonFace';
    case 'onAccent':   return 'HighlightText';
    case 'onButton':   return 'ButtonText';
    default:           return 'CanvasText';
  }
}

function buildDeclarations(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
): string[] {
  return Object.entries(roles).map(([role, record]) => {
    const varName = toCssVarName(role, prefix);
    return `  ${varName}: ${record.hex};`;
  });
}

function buildRootBlock(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
): string {
  const decls = buildDeclarations(roles, prefix);
  return `:root {\n${decls.join('\n')}\n}`;
}

function buildScopedBlock(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
  scopeAttr: string | undefined,
  scopeName: string,
): string {
  const decls = buildDeclarations(roles, prefix);
  const selector = scopeAttr
    ? `[${scopeAttr}='${scopeName}']`
    : `[data-theme='${scopeName}']`;
  return `${selector} {\n${decls.join('\n')}\n}`;
}

function buildDarkSchemeBlock(
  darkRoles: Record<string, ColorRecordInterface>,
  prefix: string,
): string {
  const decls = buildDeclarations(darkRoles, prefix);
  return `@media (prefers-color-scheme: dark) {\n  :root {\n${decls.map((d) => `  ${d}`).join('\n')}\n  }\n}`;
}

function buildForcedColorsBlock(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
): string {
  const decls = Object.entries(roles).map(([role, record]) => {
    const varName = toCssVarName(role, prefix);
    const token = forcedColorsToken(record);
    return `  ${varName}: ${token};`;
  });
  return `@media (forced-colors: active) {\n  :root {\n${decls.map((d) => `  ${d}`).join('\n')}\n  }\n}`;
}

/**
 * Builds the `@supports (color: color(display-p3 0 0 0))` block that
 * overrides the unconditional sRGB `:root` declarations with their
 * wide-gamut equivalents on P3-capable browsers. ONLY roles whose
 * resolved record has `displayP3` populated (i.e. the input OKLCH lay
 * outside sRGB, or the record arrived through `intake:p3`) are included
 * — sRGB-only roles fall through to the unconditional block.
 *
 * The `@supports` query mirrors the CSS Color 4 §6.5 feature-detection
 * idiom; the cascade then resolves sRGB-only → P3 override →
 * forced-colors override (in that order in the emitted file).
 *
 * Returns an empty string when no role has `displayP3` populated so the
 * caller can omit the block entirely.
 */
function buildWideGamutBlock(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
): string {
  const p3Decls: string[] = [];
  for (const [role, record] of Object.entries(roles)) {
    if (record.displayP3) {
      const varName = toCssVarName(role, prefix);
      p3Decls.push(`  ${varName}: ${serializeP3(record.displayP3)};`);
    }
  }
  if (p3Decls.length === 0) return '';
  return `@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${p3Decls.map((d) => `  ${d}`).join('\n')}\n  }\n}`;
}

function buildVarMap(
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const role of Object.keys(roles)) {
    map[role] = toCssVarName(role, prefix);
  }
  return map;
}


export class EmitCssVars implements TaskInterface {
  readonly name = 'emit:cssVars';

  readonly manifest: TaskManifestInterface = {
    'name':        'emit:cssVars',
    'reads':       ['roles', 'variants', 'metadata'],
    'writes':      ['outputs.cssVars'],
    'description': 'Emit CSS custom property blocks from resolved roles and variants',
  };

  // math() accessor satisfies PluginInterface if ever used standalone — not required here
  // but the class only needs TaskInterface

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    const prefix    = state.metadata['cssVarPrefix'] ?? '--c-';
    const scopeAttr = state.metadata['scopeAttr'];
    const themeName = state.metadata['themeName']    ?? 'default';

    const darkRoles = state.variants['dark'] ?? null;

    const rootBlock    = buildRootBlock(state.roles, prefix);
    const scopedBlock  = buildScopedBlock(state.roles, prefix, scopeAttr, themeName);
    const darkScheme   = darkRoles ? buildDarkSchemeBlock(darkRoles, prefix) : '';
    const forcedColors = buildForcedColorsBlock(state.roles, prefix);
    const wideGamut    = buildWideGamutBlock(state.roles, prefix);

    // Cascade order: sRGB defaults → dark-scheme override → wide-gamut
    // override (P3-capable browsers) → forced-colors override (Windows
    // High Contrast Mode). Later blocks win in the cascade; forced-colors
    // is intentionally last so accessibility tokens override any colored
    // value emitted above them.
    const parts = [rootBlock, darkScheme, wideGamut, forcedColors].filter(Boolean);
    const full  = parts.join('\n\n');
    const map   = buildVarMap(state.roles, prefix);

    const output: CssVarsOutputInterface = {
      'rootBlock':    rootBlock,
      'scopedBlock':  scopedBlock,
      'darkScheme':   darkScheme,
      'forcedColors': forcedColors,
      'wideGamut':    wideGamut,
      'full':         full,
      'map':          map,
    };

    state.outputs['cssVars'] = output;
  }
}

export const emitCssVars = new EmitCssVars();
