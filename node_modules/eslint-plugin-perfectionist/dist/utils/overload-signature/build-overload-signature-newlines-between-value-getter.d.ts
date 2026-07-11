import { TSESTree } from '@typescript-eslint/types'
import { SortingNodeWithOverloadSignatureImplementation } from './overload-signature-group.js'
import { NewlinesBetweenValueGetter } from '../get-newlines-between-errors.js'
import { NewlinesBetweenOption } from '../../types/common-groups-options.js'
/**
 * Newlines between value getter for overload signatures.
 *
 * @param newlinesBetweenOverloadSignatures - Newlines between overload
 *   signatures option value.
 * @returns NewlinesBetween option value.
 */
export declare function buildOverloadSignatureNewlinesBetweenValueGetter<
  T extends TSESTree.Node,
>(
  newlinesBetweenOverloadSignatures: NewlinesBetweenOption,
): NewlinesBetweenValueGetter<SortingNodeWithOverloadSignatureImplementation<T>>
