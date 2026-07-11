import { passesAllNamesMatchPatternFilter } from '../../utils/context-matching/passes-all-names-match-pattern-filter.js'
import { passesAstSelectorFilter } from '../../utils/context-matching/passes-ast-selector-filter.js'
import { computeNodeName } from './compute-node-name.js'
/**
 * Computes the matched context options for a given import/export attributes
 * node.
 *
 * @param params - Parameters.
 * @param params.matchedAstSelectors - The matched AST selectors for an
 *   import/export declaration node.
 * @param params.attributes - The import attributes to compute the context
 *   options for.
 * @param params.context - The rule context.
 * @returns The matched context options or undefined if none match.
 */
function computeMatchedContextOptions({
  matchedAstSelectors,
  attributes,
  context,
}) {
  let nodeNames = attributes.map(attribute =>
    computeNodeName(attribute, context.sourceCode),
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
