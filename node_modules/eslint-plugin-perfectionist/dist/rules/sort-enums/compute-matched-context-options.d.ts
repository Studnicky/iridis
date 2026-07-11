import { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import { TSESTree } from '@typescript-eslint/types'
import { MessageId, Options } from './types.js'
/**
 * Computes the matched context options for a given enum node.
 *
 * @param params - Parameters.
 * @param params.enumMembers - The enum members of the enum declaration node.
 * @param params.matchedAstSelectors - The matched AST selectors for an enum
 *   node.
 * @param params.context - The rule context.
 * @returns The matched context options or undefined if none match.
 */
export declare function computeMatchedContextOptions({
  matchedAstSelectors,
  enumMembers,
  context,
}: {
  context: Readonly<RuleContext<MessageId, Options>>
  matchedAstSelectors: ReadonlySet<string>
  enumMembers: TSESTree.TSEnumMember[]
}): Options[number] | undefined
