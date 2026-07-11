import { TSESTree } from '@typescript-eslint/types'
import { TSESLint } from '@typescript-eslint/utils'
import { NodeNameDetails, Modifier, Selector } from '../types.js'
import { RegexOption } from '../../../types/common-options.js'
/**
 * Computes details related to an accessor property.
 *
 * @param params - Parameters object.
 * @param params.isDecorated - Whether the accessor is decorated.
 * @param params.ignoreCallbackDependenciesPatterns - Patterns to ignore when
 *   computing dependencies.
 * @param params.useExperimentalDependencyDetection - Whether to use
 *   experimental dependency detection.
 * @param params.sourceCode - The source code object.
 * @param params.className - The name of the class containing the accessor.
 * @param params.accessor - The accessor node to compute information for.
 * @returns An object containing various details about the accessor.
 */
export declare function computeAccessorDetails({
  ignoreCallbackDependenciesPatterns,
  useExperimentalDependencyDetection,
  isDecorated,
  sourceCode,
  className,
  accessor,
}: {
  accessor: TSESTree.TSAbstractAccessorProperty | TSESTree.AccessorProperty
  ignoreCallbackDependenciesPatterns: RegexOption
  useExperimentalDependencyDetection: boolean
  sourceCode: TSESLint.SourceCode
  className: undefined | string
  isDecorated: boolean
}): {
  nameDetails: NodeNameDetails
  dependencyNames: string[]
  dependencies: string[]
  modifiers: Modifier[]
  selectors: Selector[]
  isStatic: boolean
}
