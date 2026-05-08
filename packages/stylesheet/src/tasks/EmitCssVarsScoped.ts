import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';

function toCssVarName(role: string, prefix: string): string {
  const kebab = role.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
  return `${prefix}${kebab}`;
}

function buildScopedCategoryBlock(
  category: string,
  roles: Record<string, ColorRecordInterface>,
  prefix: string,
  scopePrefix: string,
): string {
  const decls = Object.entries(roles).map(([role, record]) => {
    const varName = toCssVarName(role, prefix);
    return `  ${varName}: ${record.hex};`;
  });
  const selector = `[data-${scopePrefix}='${category}']`;
  return `${selector} {\n${decls.join('\n')}\n}`;
}

export interface CssVarsScopedOutputInterface {
  readonly 'blocks': Record<string, string>;
  readonly 'full':   string;
}

/**
 * Emits per-category scoped CSS blocks.
 * Reads state.metadata.scopePrefix (string) to build [data-<scopePrefix>='<category>'] selectors.
 * Categories are derived from state.variants keys (e.g. 'dark', 'brand-A', 'brand-B').
 * The root roles are emitted under the 'default' category key.
 */
export class EmitCssVarsScoped implements TaskInterface {
  readonly name = 'emit:cssVarsScoped';

  readonly manifest: TaskManifestInterface = {
    'name':        'emit:cssVarsScoped',
    'reads':       ['roles', 'variants', 'metadata'],
    'writes':      ['outputs.cssVarsScoped'],
    'description': 'Emit per-category scoped CSS custom property blocks for Vue/Capacitor use cases',
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    const prefix = typeof state.metadata['cssVarPrefix'] === 'string'
      ? state.metadata['cssVarPrefix']
      : '--c-';

    const scopePrefix = typeof state.metadata['scopePrefix'] === 'string'
      ? state.metadata['scopePrefix']
      : 'theme';

    const blocks: Record<string, string> = {};

    // Root roles go under 'default'
    blocks['default'] = buildScopedCategoryBlock('default', state.roles, prefix, scopePrefix);

    // Each variant key becomes a scoped block
    for (const [variantName, variantRoles] of Object.entries(state.variants)) {
      blocks[variantName] = buildScopedCategoryBlock(variantName, variantRoles, prefix, scopePrefix);
    }

    const full = Object.values(blocks).join('\n\n');

    const output: CssVarsScopedOutputInterface = {
      'blocks': blocks,
      'full':   full,
    };

    (state.outputs as Record<string, unknown>)['cssVarsScoped'] = output;
  }
}

export const emitCssVarsScoped = new EmitCssVarsScoped();
