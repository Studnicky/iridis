import { passesAllNamesMatchPatternFilter } from '../../utils/context-matching/passes-all-names-match-pattern-filter.js'
import { passesAstSelectorFilter } from '../../utils/context-matching/passes-ast-selector-filter.js'
import { computeNodeName } from './compute-node-name.js'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
/**
 * Computes the matched context options for a given map node.
 *
 * @param params - Parameters.
 * @param params.matchedAstSelectors - The matched AST selectors for a map node.
 * @param params.elements - The map elements to compute the context options for.
 * @param params.context - The rule context.
 * @returns The matched context options or undefined if none match.
 */
function computeMatchedContextOptions({
  matchedAstSelectors,
  elements,
  context,
}) {
  let nodeNames = elements
    .filter(
      element =>
        element !== null && element.type !== AST_NODE_TYPES.SpreadElement,
    )
    .map(element =>
      computeNodeName({
        sourceCode: context.sourceCode,
        node: element,
      }),
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
