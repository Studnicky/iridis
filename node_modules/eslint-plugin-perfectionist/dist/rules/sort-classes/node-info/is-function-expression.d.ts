import { TSESTree } from '@typescript-eslint/types'
/**
 * Checks whether a node is a function expression or an arrow function
 * expression.
 *
 * @param node - The AST node to check.
 * @returns Whether the node is a function expression.
 */
export declare function isFunctionExpression(
  node: TSESTree.Node | null,
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
