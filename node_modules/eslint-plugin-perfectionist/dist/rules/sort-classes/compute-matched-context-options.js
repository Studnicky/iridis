import { passesAllNamesMatchPatternFilter } from '../../utils/context-matching/passes-all-names-match-pattern-filter.js'
import { passesAstSelectorFilter } from '../../utils/context-matching/passes-ast-selector-filter.js'
import { computeMethodOrPropertyNameDetails } from './node-info/compute-method-or-property-name-details.js'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
/**
 * Computes the matched context options for a given class node.
 *
 * @param params - Parameters.
 * @param params.matchedAstSelectors - The matched AST selectors for a class
 *   node.
 * @param params.context - The rule context.
 * @returns The matched context options or undefined if none match.
 */
function computeMatchedContextOptions({
  matchedAstSelectors,
  classElements,
  context,
}) {
  let nodeNames = classElements
    .filter(
      element =>
        element.type !== AST_NODE_TYPES.StaticBlock &&
        element.type !== AST_NODE_TYPES.TSIndexSignature,
    )
    .map(
      element =>
        computeMethodOrPropertyNameDetails(element, context.sourceCode).name,
    )
  return context.options.find(options =>
    isContextOptionMatching({
      matchedAstSelectors,
      nodeNames,
      options,
    }),
  )
}
function isContextOptionMatching({ matchedAstSelectors, nodeNames, options }) {
  if (!options.useConfigurationIf) {
    return true
  }
  return (
    passesAllNamesMatchPatternFilter({
      allNamesMatchPattern: options.useConfigurationIf.allNamesMatchPattern,
      nodeNames,
    }) &&
    passesAstSelectorFilter({
      matchesAstSelector: options.useConfigurationIf.matchesAstSelector,
      matchedAstSelectors,
    })
  )
}
export { computeMatchedContextOptions }
