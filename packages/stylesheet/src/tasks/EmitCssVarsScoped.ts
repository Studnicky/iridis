import { type ColorRecordInterfaceTypeEntity, CssVarName, type PaletteStateInterface, type PipelineContextInterface, type TaskInterface, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { CssAttributeSelector } from '../util/CssAttributeSelector.ts';
import { CssCustomPropertyPrefix } from '../util/CssCustomPropertyPrefix.ts';
import { P3Serializer } from '../util/P3Serializer.ts';

class ScopedCategoryBlock {
  static build(
    category:    string,
    roles:       Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix:      string,
    scopePrefix: string
  ): string {
    const decls = Object.entries(roles).map(([role, record]) => {
      const varName = CssVarName.from(role, prefix);
      return `  ${varName}: ${record.hex};`;
    });
    const selector = CssAttributeSelector.from(`data-${scopePrefix}`, category);
    return `${selector} {\n${decls.join('\n')}\n}`;
  }
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
class ScopedWideGamutBlock {
  static build(
    category:    string,
    roles:       Record<string, ColorRecordInterfaceTypeEntity.Type>,
    prefix:      string,
    scopePrefix: string
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
    const selector = CssAttributeSelector.from(`data-${scopePrefix}`, category);
    return `@supports (color: color(display-p3 0 0 0)) {\n  ${selector} {\n${p3Decls.map((declaration) => { const result = ['  ', declaration].join(''); return result; }).join('\n')}\n  }\n}`;
  }
}

/**
 * Emits per-category scoped CSS blocks.
 * Reads state.metadata.scopePrefix (string) to build [data-<scopePrefix>='<category>'] selectors.
 * Categories are derived from state.variants keys (e.g. 'dark', 'brand-A', 'brand-B').
 * The root roles are emitted under the 'default' category key.
 *
 * Wide-gamut handling: for any category whose records carry `displayP3`,
 * a sibling `@supports (color: color(display-p3 0 0 0))` block is emitted
 * scoping the P3 declarations under the SAME `[data-<scopePrefix>='...']`
 * selector. Browsers without P3 support fall through to the sRGB block;
 * the cascade naturally resolves the P3 override above the sRGB base when
 * supported. Categories with no P3 records emit no `@supports` block.
 */
class EmitCssVarsScoped implements TaskInterface {
  readonly name = 'emit:cssVarsScoped';
  readonly manifest: TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({ 'description': 'Emit per-category scoped CSS custom property blocks for Vue/Capacitor use cases', 'name': 'emit:cssVarsScoped', 'reads': ['roles', 'variants', 'metadata'], 'writes': ['outputs.stylesheet:cssVarsScoped'] });
  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const prefix = CssCustomPropertyPrefix.from(typeof state.metadata.cssVarPrefix === 'string' ? state.metadata.cssVarPrefix : undefined);
    const scopePrefix = typeof state.metadata.scopePrefix === 'string' ? state.metadata.scopePrefix : 'theme';
    const blocks: Record<string, string> = { 'default': ScopedCategoryBlock.build('default', state.roles, prefix, scopePrefix) };
    const wideGamut: Record<string, string> = {};
    const defaultP3 = ScopedWideGamutBlock.build('default', state.roles, prefix, scopePrefix);
    if (defaultP3.length > 0) { wideGamut.default = defaultP3; }
    const variants = Object.entries(state.variants);
    for (let index=0;index<variants.length;index+=1) { const variant=variants[index]; if (variant !== undefined) { const [name, roles]=variant; Object.defineProperty(blocks,name,{ 'configurable':true,'enumerable':true,'value':ScopedCategoryBlock.build(name,roles,prefix,scopePrefix),'writable':true }); const p3=ScopedWideGamutBlock.build(name,roles,prefix,scopePrefix); if(p3.length>0){Object.defineProperty(wideGamut,name,{ 'configurable':true,'enumerable':true,'value':p3,'writable':true });} } }
    const full=Object.values(blocks).concat(Object.values(wideGamut)).join('\n\n');
    state.outputs['stylesheet:cssVarsScoped']={ 'blocks':blocks,'full':full,'wideGamut':wideGamut };
    context.logger.debug(LogBody.create({ 'component':'EmitCssVarsScoped','context':{'count':Object.keys(blocks).length,'wideGamutCount':Object.keys(wideGamut).length},'message':'Emitted scoped blocks','operation':'run','status':LOG_STATUS.SUCCESS }));
  }
}

export const emitCssVarsScoped = new EmitCssVarsScoped();
