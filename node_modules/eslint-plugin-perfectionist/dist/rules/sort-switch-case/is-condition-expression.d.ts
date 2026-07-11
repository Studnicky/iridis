import { TSESTree } from '@typescript-eslint/types'
/**
 * Checks if an expression is condition-shaped.
 *
 * Condition-shaped expressions are boolean literals, logical negations, binary
 * expressions and logical expressions. Switch statements built on such
 * expressions (e.g. `switch (true)`) encode their program logic in the case
 * order, so sorting them is unsafe.
 *
 * @param node - The expression AST node to check.
 * @returns True if the expression is condition-shaped.
 */
export declare function isConditionExpression(
  node: TSESTree.Expression,
): boolean
