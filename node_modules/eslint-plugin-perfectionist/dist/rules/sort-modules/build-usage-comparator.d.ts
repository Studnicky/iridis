import { TSESLint } from '@typescript-eslint/utils'
import { Comparator } from '../../utils/compare/default-comparator-by-options-computer.js'
import { SortModulesSortingNode } from './types.js'
/**
 * Builds a comparator function for sorting module nodes based on their usage.
 *
 * @param params - The parameters object.
 * @param params.ignoreEslintDisabledNodes - Whether to ignore ESLint disabled
 *   nodes.
 * @param params.sortingNodes - The module sorting nodes.
 * @param params.useExperimentalDependencyDetection - Whether to use
 *   experimental dependency detection.
 * @param params.sourceCode - The source code object.
 * @returns A comparator function for sorting module nodes by usage.
 */
export declare function buildUsageComparator({
  useExperimentalDependencyDetection,
  ignoreEslintDisabledNodes,
  sortingNodes,
  sourceCode,
}: {
  useExperimentalDependencyDetection: boolean
  sortingNodes: SortModulesSortingNode[]
  ignoreEslintDisabledNodes: boolean
  sourceCode: TSESLint.SourceCode
}): Comparator<SortModulesSortingNode>
