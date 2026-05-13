import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { toCssVarName } from '@studnicky/iridis';
import type { CssVarsOutputInterface } from '../types/index.ts';

/**
 * Picks a forced-colors system color keyword based on the role name's semantic intent.
 * Windows High Contrast maps sRGB-approximate colors to system tokens; roles with
 * "text" intent map to CanvasText, background/surface roles map to Canvas, etc.
 */
function forcedColorsToken(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes('text') || lower.includes('label') || lower.includes('caption')) {
    return 'CanvasText';
  }
  if (lower.includes('link') || lower.includes('anchor')) {
    return 'LinkText';
  }
  if (lower.includes('accent') || lower.includes('highlight') || lower.includes('selected')) {
    return 'Highlight';
  }
  if (lower.includes('on-accent') || lower.includes('on-highlight')) {
    return 'HighlightText';
  }
  if (lower.includes('button') || lower.includes('action') || lower.includes('interactive')) {
    return 'ButtonFace';
  }
  if (lower.includes('on-button') || lower.includes('on-action')) {
    return 'ButtonText';
  }
  // surface / background / base / muted → Canvas (the page background)
  return 'Canvas';
}

function serializeP3(p3: ColorRecordInterface['displayP3']): string {
  if (!p3) return '';
  const r = (p3.r / 255).toFixed(4);
  const g = (p3.g / 255).toFixed(4);
  const b = (p3.b / 255).toFixed(4);
  return `color(display-p3 ${r} ${g} ${b})`;
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
  const decls = Object.entries(roles).map(([role, _record]) => {
    const varName = toCssVarName(role, prefix);
    const token = forcedColorsToken(role);
    return `  ${varName}: ${token};`;
  });
  return `@media (forced-colors: active) {\n  :root {\n${decls.map((d) => `  ${d}`).join('\n')}\n  }\n}`;
}

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
  return `@supports (color: color(display-p3 1 1 1)) {\n  :root {\n${p3Decls.map((d) => `  ${d}`).join('\n')}\n  }\n}`;
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

    const parts = [rootBlock, darkScheme, forcedColors, wideGamut].filter(Boolean);
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
