import { ESLint, Linter } from 'eslint'
interface PluginConfigs extends Record<
  string,
  Linter.LegacyConfig | Linter.Config[] | Linter.Config
> {
  'recommended-alphabetical-legacy': Linter.LegacyConfig
  'recommended-line-length-legacy': Linter.LegacyConfig
  'recommended-natural-legacy': Linter.LegacyConfig
  'recommended-custom-legacy': Linter.LegacyConfig
  'recommended-alphabetical': Linter.Config
  'recommended-line-length': Linter.Config
  'recommended-natural': Linter.Config
  'recommended-custom': Linter.Config
}
export declare let rules: ESLint.Plugin['rules']
export declare let configs: PluginConfigs
declare const _default: {
  configs: PluginConfigs
} & ESLint.Plugin
export default _default
export type { Options as SortVariableDeclarationsOptions } from './rules/sort-variable-declarations/types.js'
export type { Options as SortIntersectionTypesOptions } from './rules/sort-intersection-types/types.js'
export type { Options as SortImportAttributesOptions } from './rules/sort-import-attributes/types.js'
export type { Options as SortExportAttributesOptions } from './rules/sort-export-attributes/types.js'
export type { Options as SortHeritageClausesOptions } from './rules/sort-heritage-clauses/types.js'
export type { Options as SortArrayIncludesOptions } from './rules/sort-array-includes/types.js'
export type { Options as SortNamedImportsOptions } from './rules/sort-named-imports/types.js'
export type { Options as SortNamedExportsOptions } from './rules/sort-named-exports/types.js'
export type { Options as SortObjectTypesOptions } from './rules/sort-object-types/types.js'
export type { Options as SortSwitchCaseOptions } from './rules/sort-switch-case/types.js'
export type { Options as SortUnionTypesOptions } from './rules/sort-union-types/types.js'
export type { Options as SortInterfacesOptions } from './rules/sort-interfaces/types.js'
export type { Options as SortDecoratorsOptions } from './rules/sort-decorators/types.js'
export type { Options as SortJsxPropsOptions } from './rules/sort-jsx-props/types.js'
export type { Options as SortClassesOptions } from './rules/sort-classes/types.js'
export type { Options as SortImportsOptions } from './rules/sort-imports/types.js'
export type { Options as SortExportsOptions } from './rules/sort-exports/types.js'
export type { Options as SortObjectsOptions } from './rules/sort-objects/types.js'
export type { Options as SortModulesOptions } from './rules/sort-modules/types.js'
export type { Options as SortArraysOptions } from './rules/sort-arrays/types.js'
export type { Options as SortEnumsOptions } from './rules/sort-enums/types.js'
export type { Options as SortMapsOptions } from './rules/sort-maps/types.js'
export type { Options as SortSetsOptions } from './rules/sort-sets/types.js'
