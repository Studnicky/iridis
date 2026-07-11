import { buildCustomGroupSelectorJsonSchema } from '../../utils/json-schemas/common-groups-json-schemas.js'
var ORDER_ERROR_ID = 'unexpectedVariableDeclarationsOrder'
var GROUP_ORDER_ERROR_ID = 'unexpectedVariableDeclarationsGroupOrder'
var EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenVariableDeclarationsMembers'
var MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenVariableDeclarationsMembers'
var DEPENDENCY_ORDER_ERROR_ID = 'unexpectedVariableDeclarationsDependencyOrder'
/**
 * Array of all available selectors for variable declarations.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allSelectors = ['initialized', 'uninitialized']
/**
 * Additional custom group match options JSON schema. Used by ESLint to validate
 * rule options at configuration time.
 */
var additionalCustomGroupMatchOptionsJsonSchema = {
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
}
export {
  DEPENDENCY_ORDER_ERROR_ID,
  EXTRA_SPACING_ERROR_ID,
  GROUP_ORDER_ERROR_ID,
  MISSED_SPACING_ERROR_ID,
  ORDER_ERROR_ID,
  additionalCustomGroupMatchOptionsJsonSchema,
  allSelectors,
}
