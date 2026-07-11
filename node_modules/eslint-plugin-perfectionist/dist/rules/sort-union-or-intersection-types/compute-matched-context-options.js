import { passesAllNamesMatchPatternFilter } from '../../utils/context-matching/passes-all-names-match-pattern-filter.js'
import { passesAstSelectorFilter } from '../../utils/context-matching/passes-ast-selector-filter.js'
import { computeNodeName } from './compute-node-name.js'
/**
 * Computes the matched context options for a given union/intersection type
 * node.
 *
 * @param params - Parameters.
 * @param params.matchedAstSelectors - The matched AST selectors for the
 *   union/intersection type node.
 * @param params.members - The type members to compute the context options for.
 * @param params.context - The rule context.
 * @returns The matched context options or undefined if none match.
 */
function computeMatchedContextOptions({
  matchedAstSelectors,
  members,
  context,
}) {
  let nodeNames = members.map(member =>
    computeNodeName({
      sourceCode: context.sourceCode,
      type: member,
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
