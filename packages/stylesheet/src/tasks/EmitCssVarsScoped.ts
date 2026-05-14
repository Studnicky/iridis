import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { toCssVarName } from '@studnicky/iridis';
import type { CssVarsScopedOutputInterface } from '../types/index.ts';
import { serializeP3 } from '../util/serializeP3.ts';

function buildScopedCategoryBlock(
  category:    string,
  roles:       Record<string, ColorRecordInterface>,
  prefix:      string,
  scopePrefix: string,
): string {
  const decls = Object.entries(roles).map(([role, record]) => {
    const varName = toCssVarName(role, prefix);
    return `  ${varName}: ${record.hex};`;
  });
  const selector = `[data-${scopePrefix}='${category}']`;
  return `${selector} {\n${decls.join('\n')}\n}`;
}

/**
 * Builds the `@supports (color: color(display-p3 0 0 0))` block that
 * overrides the unconditional sRGB scoped declarations with their
 * wide-gamut equivalents on P3-capable browsers. ONLY roles whose
 * resolved record has `displayP3` populated are included; sRGB-only
 * roles fall through to the unconditional scoped block.
 *
 * Mirrors {@link import('./EmitCssVars.ts').EmitCssVars} cascade
 * treatment but scopes the inner `:root`-style block to the same
 * `[data-<scopePrefix>='<category>']` selector the sRGB block uses, so
 * the P3 override resolves under the same scope.
 *
 * Returns an empty string when no role in the category has `displayP3`
 * populated so the caller can omit the block entirely.
 */
function buildScopedWideGamutBlock(
  category:    string,
  roles:       Record<string, ColorRecordInterface>,
  prefix:      string,
  scopePrefix: string,
): string {
  const p3Decls: string[] = [];
  for (const [role, record] of Object.entries(roles)) {
    if (record.displayP3) {
      const varName = toCssVarName(role, prefix);
      p3Decls.push(`  ${varName}: ${serializeP3(record.displayP3)};`);
    }
  }
  if (p3Decls.length === 0) return '';
  const selector = `[data-${scopePrefix}='${category}']`;
  return `@supports (color: color(display-p3 0 0 0)) {\n  ${selector} {\n${p3Decls.map((d) => `  ${d}`).join('\n')}\n  }\n}`;
}

/**
 * Emits per-category scoped CSS blocks.
 * Reads state.metadata.scopePrefix (string) to build [data-<scopePrefix>='<category>'] selectors.
 * Categories are derived from state.variants keys (e.g. 'dark', 'brand-A', 'brand-B').
 * The root roles are emitted under the 'default' category key.
 *
 * Wide-gamut handling — for any category whose records carry `displayP3`,
 * a sibling `@supports (color: color(display-p3 0 0 0))` block is emitted
 * scoping the P3 declarations under the SAME `[data-<scopePrefix>='...']`
 * selector. Browsers without P3 support fall through to the sRGB block;
 * the cascade naturally resolves the P3 override above the sRGB base when
 * supported. Categories with no P3 records emit no `@supports` block.
 */
export class EmitCssVarsScoped implements TaskInterface {
  readonly 'name' = 'emit:cssVarsScoped';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:cssVarsScoped',
    'reads':       ['roles', 'variants', 'metadata'],
    'writes':      ['outputs.cssVarsScoped'],
    'description': 'Emit per-category scoped CSS custom property blocks for Vue/Capacitor use cases',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const prefix      = state.metadata['cssVarPrefix'] ?? '--c-';
    const scopePrefix = state.metadata['scopePrefix']  ?? 'theme';

    const blocks:    Record<string, string> = {};
    const wideGamut: Record<string, string> = {};

    // Root roles go under 'default'.
    blocks['default']    = buildScopedCategoryBlock('default', state.roles, prefix, scopePrefix);
    const defaultP3      = buildScopedWideGamutBlock('default', state.roles, prefix, scopePrefix);
    if (defaultP3.length > 0) {
      wideGamut['default'] = defaultP3;
    }

    // Each variant key becomes a scoped block (and possibly a P3 sibling).
    for (const [variantName, variantRoles] of Object.entries(state.variants)) {
      blocks[variantName] = buildScopedCategoryBlock(variantName, variantRoles, prefix, scopePrefix);
      const variantP3     = buildScopedWideGamutBlock(variantName, variantRoles, prefix, scopePrefix);
      if (variantP3.length > 0) {
        wideGamut[variantName] = variantP3;
      }
    }

    // Cascade order per category: sRGB scoped block → P3 @supports override.
    // Categories without a P3 sibling fall through to sRGB on every browser.
    const parts: string[] = [];
    for (const category of Object.keys(blocks)) {
      parts.push(blocks[category] as string);
      const p3 = wideGamut[category];
      if (p3) parts.push(p3);
    }
    const full = parts.join('\n\n');

    const output: CssVarsScopedOutputInterface = {
      'blocks':    blocks,
      'wideGamut': wideGamut,
      'full':      full,
    };

    state.outputs['cssVarsScoped'] = output;

    ctx.logger.debug('EmitCssVarsScoped', 'run', 'Emitted scoped blocks', {
      'count':         Object.keys(blocks).length,
      'wideGamutCount': Object.keys(wideGamut).length,
    });
  }
}

export const emitCssVarsScoped = new EmitCssVarsScoped();
