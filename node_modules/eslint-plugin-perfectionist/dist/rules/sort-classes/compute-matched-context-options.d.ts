import { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import { TSESTree } from '@typescript-eslint/types'
import { MessageId, Options } from './types.js'
/**
 * Computes the matched context options for a given class node.
 *
 * @param params - Parameters.
 * @param params.matchedAstSelectors - The matched AST selectors for a class
 *   node.
 * @param params.context - The rule context.
 * @returns The matched context options or undefined if none match.
 */
export declare function computeMatchedContextOptions({
  matchedAstSelectors,
  classElements,
  context,
}: {
  context: Readonly<RuleContext<MessageId, Options>>
  matchedAstSelectors: ReadonlySet<string>
  classElements: TSESTree.ClassElement[]
}): Options[number] | undefined
