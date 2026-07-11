import { TSESTree } from '@typescript-eslint/types'
/**
 * Checks if a type node contains a callable type (function or constructor).
 *
 * @param typeNode - The type node to check.
 * @returns True if the type node contains a callable type, false otherwise.
 */
export declare function typeContainsCallableType(
  typeNode: TSESTree.TypeNode,
): boolean
