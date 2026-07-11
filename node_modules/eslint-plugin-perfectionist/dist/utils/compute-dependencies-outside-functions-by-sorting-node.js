import { computeDependenciesBySortingNode } from './compute-dependencies-by-sorting-node.js'
import { computeParentNodesWithTypes } from './compute-parent-nodes-with-types.js'
import { isNodeImmediatelyCalled } from './is-node-immediately-called.js'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
function computeDependenciesOutsideFunctionsBySortingNode({
  sortingNodes,
  sourceCode,
}) {
  return computeDependenciesBySortingNode({
    shouldIgnoreIdentifierComputer: buildShouldIgnoreIdentifierComputer(),
    sortingNodes,
    sourceCode,
  })
  function buildShouldIgnoreIdentifierComputer() {
    return ({ referencingSortingNode, identifier }) => {
      return computeParentNodesWithTypes({
        allowedTypes: [
          AST_NODE_TYPES.FunctionExpression,
          AST_NODE_TYPES.ArrowFunctionExpression,
        ],
        maxParent: referencingSortingNode.node,
        consecutiveOnly: false,
        node: identifier,
      }).some(
        functionParentNode => !isNodeImmediatelyCalled(functionParentNode),
      )
    }
  }
}
export { computeDependenciesOutsideFunctionsBySortingNode }
