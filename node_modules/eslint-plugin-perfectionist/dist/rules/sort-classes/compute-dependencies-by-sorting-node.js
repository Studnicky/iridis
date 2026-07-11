import { UnreachableCaseError } from '../../utils/unreachable-case-error.js'
import { matches } from '../../utils/matches.js'
import { computeDependenciesBySortingNode as computeDependenciesBySortingNode$1 } from '../../utils/compute-dependencies-by-sorting-node.js'
import { computeParentNodesWithTypes } from '../../utils/compute-parent-nodes-with-types.js'
import { computeIdentifierNameDetails } from './compute-identifier-name-details.js'
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils'
function computeDependenciesBySortingNode({
  ignoreCallbackDependenciesPatterns,
  sortingNodes,
  sourceCode,
  classBody,
}) {
  let dependenciesBySortingNode = computeDependenciesBySortingNode$1({
    additionalIdentifierDependenciesComputer:
      buildAdditionalIdentifierDependenciesComputer({
        ignoreCallbackDependenciesPatterns,
        staticSortingNodes: sortingNodes.filter(node => node.isStatic),
        classBody,
      }),
    shouldIgnoreSortingNodeComputer: sortingNode =>
      shouldIgnoreDependencyComputation(sortingNode.node),
    sortingNodes,
    sourceCode,
  })
  let thisDependenciesBySortingNode =
    computeThisExpressionDependenciesBySortingNode({
      ignoreCallbackDependenciesPatterns,
      sortingNodes,
      sourceCode,
    })
  for (let [sortingNode, dependencies] of thisDependenciesBySortingNode) {
    let existingDependencies = dependenciesBySortingNode.get(sortingNode) ?? []
    dependenciesBySortingNode.set(sortingNode, [
      ...existingDependencies,
      ...dependencies,
    ])
  }
  return dependenciesBySortingNode
}
function computeIdentifierOrThisExpressionDependency({
  ignoreCallbackDependenciesPatterns,
  sortingNodes,
  classElement,
  node,
}) {
  if (shouldIgnoreCallbackDependency()) {
    return null
  }
  let { parent } = node
  /* v8 ignore if -- @preserve Unsure how we can reach that case */
  if (parent.type !== AST_NODE_TYPES.MemberExpression) {
    return null
  }
  let dependencyName = computeDependencyNameFromMemberExpression(parent)
  /* v8 ignore if -- @preserve Unsure how we can reach that case */
  if (!dependencyName) {
    return null
  }
  return (
    sortingNodes.find(
      currentSortingNode => currentSortingNode.name === dependencyName.name,
    ) ?? null
  )
  function computeDependencyNameFromMemberExpression(memberExpression) {
    switch (memberExpression.property.type) {
      case AST_NODE_TYPES.PrivateIdentifier:
      case AST_NODE_TYPES.Identifier:
      case AST_NODE_TYPES.Literal:
        return computeIdentifierNameDetails(memberExpression.property)
      /* v8 ignore next 2 -- @preserve Unhandled cases */
      default:
        return null
    }
  }
  function shouldIgnoreCallbackDependency() {
    let [firstCallExpressionParent] = computeParentNodesWithTypes({
      allowedTypes: [AST_NODE_TYPES.CallExpression],
      maxParent: classElement,
      consecutiveOnly: false,
      node,
    })
    if (!firstCallExpressionParent) {
      return false
    }
    if (!('name' in firstCallExpressionParent.callee)) {
      return false
    }
    return matches(
      firstCallExpressionParent.callee.name,
      ignoreCallbackDependenciesPatterns,
    )
  }
}
function computeThisExpressionDependenciesBySortingNode({
  ignoreCallbackDependenciesPatterns,
  sortingNodes,
  sourceCode,
}) {
  let dependenciesBySortingNode = /* @__PURE__ */ new Map()
  let staticSortingNodes = sortingNodes.filter(node => node.isStatic)
  let nonStaticSortingNodes = sortingNodes.filter(node => !node.isStatic)
  let relevantSortingNodes = sortingNodes.filter(
    sortingNode => !shouldIgnoreDependencyComputation(sortingNode.node),
  )
  for (let sortingNode of relevantSortingNodes) {
    let dependencies = computeThisExpressionsInsideClassElement({
      classElement: sortingNode.node,
      sourceCode,
    })
      .map(thisExpression =>
        computeIdentifierOrThisExpressionDependency({
          sortingNodes:
            sortingNode.isStatic ? staticSortingNodes : nonStaticSortingNodes,
          ignoreCallbackDependenciesPatterns,
          classElement: sortingNode.node,
          node: thisExpression,
        }),
      )
      .filter(dependency => dependency !== null)
    if (dependencies.length === 0) {
      continue
    }
    dependenciesBySortingNode.set(sortingNode, dependencies)
  }
  return dependenciesBySortingNode
}
function buildAdditionalIdentifierDependenciesComputer({
  ignoreCallbackDependenciesPatterns,
  staticSortingNodes,
  classBody,
}) {
  return ({ referencingSortingNode, reference }) => {
    if (!reference.resolved?.identifiers[0]) {
      return []
    }
    let classIdentifier = classBody.parent.id
    if (reference.resolved?.identifiers[0] !== classIdentifier) {
      return []
    }
    let dependency = computeIdentifierOrThisExpressionDependency({
      classElement: referencingSortingNode.node,
      ignoreCallbackDependenciesPatterns,
      sortingNodes: staticSortingNodes,
      node: reference.identifier,
    })
    return dependency ? [dependency] : []
  }
}
function shouldIgnoreDependencyComputation(node) {
  switch (node.type) {
    case AST_NODE_TYPES.TSAbstractPropertyDefinition:
    case AST_NODE_TYPES.TSAbstractMethodDefinition:
    case AST_NODE_TYPES.StaticBlock:
      return false
    case AST_NODE_TYPES.TSAbstractAccessorProperty:
    case AST_NODE_TYPES.PropertyDefinition:
    case AST_NODE_TYPES.AccessorProperty:
      return (
        node.value?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        node.value?.type === AST_NODE_TYPES.FunctionExpression
      )
    case AST_NODE_TYPES.MethodDefinition:
    case AST_NODE_TYPES.TSIndexSignature:
      return true
    /* v8 ignore next 2 -- @preserve Exhaustive guard. */
    default:
      throw new UnreachableCaseError(node)
  }
}
function computeThisExpressionsInsideClassElement({
  classElement,
  sourceCode,
}) {
  return sourceCode
    .getTokens(classElement)
    .filter(isThisToken)
    .map(computeTokenNode)
    .filter(node => node?.type === AST_NODE_TYPES.ThisExpression)
  function computeTokenNode(token) {
    return sourceCode.getNodeByRangeIndex(token.range[0])
  }
  function isThisToken(token) {
    return token.type === AST_TOKEN_TYPES.Keyword && token.value === 'this'
  }
}
export { computeDependenciesBySortingNode }
