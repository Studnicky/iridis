import { TSESTree } from '@typescript-eslint/types'
import {
  DependencyDetection,
  SortModulesNode,
  Modifier,
  Selector,
} from './types.js'
interface ParsableNodeDetails {
  nodeDetails: {
    dependencyDetection: DependencyDetection
    addSafetySemicolonWhenInline: boolean
    decorators: TSESTree.Decorator[]
    dependencies: string[]
    modifiers: Modifier[]
    selector: Selector
    name: string
  }
  shouldPartitionAfterNode?: never
  moduleBlock?: never
}
interface NonParsableNodeDetails {
  moduleBlock: TSESTree.TSModuleBlock | null
  shouldPartitionAfterNode: boolean
  nodeDetails?: never
}
type Details = NonParsableNodeDetails | ParsableNodeDetails
/**
 * Compute details about a module-related node.
 *
 * @param params - The parameters object.
 * @param params.node - The AST node to compute details for.
 * @param params.useExperimentalDependencyDetection - Whether to use
 *   experimental dependency detection.
 * @returns The computed details about the node, such as whether it should be
 *   ignored, if a module block was found, and information about the node.
 */
export declare function computeNodeDetails({
  useExperimentalDependencyDetection,
  node,
}: {
  useExperimentalDependencyDetection: boolean
  node: SortModulesNode
}): Details
export {}
