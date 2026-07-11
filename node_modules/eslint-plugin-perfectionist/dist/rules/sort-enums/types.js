import { buildRegexJsonSchema } from '../../utils/json-schemas/common-json-schemas.js'
var ORDER_ERROR_ID = 'unexpectedEnumsOrder'
var GROUP_ORDER_ERROR_ID = 'unexpectedEnumsGroupOrder'
var EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenEnumsMembers'
var MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenEnumsMembers'
var DEPENDENCY_ORDER_ERROR_ID = 'unexpectedEnumsDependencyOrder'
/**
 * Additional custom group match options JSON schema. Used by ESLint to validate
 * rule options at configuration time.
 */
var additionalCustomGroupMatchOptionsJsonSchema = {
  elementValuePattern: buildRegexJsonSchema(),
}
export {
  DEPENDENCY_ORDER_ERROR_ID,
  EXTRA_SPACING_ERROR_ID,
  GROUP_ORDER_ERROR_ID,
  MISSED_SPACING_ERROR_ID,
  ORDER_ERROR_ID,
  additionalCustomGroupMatchOptionsJsonSchema,
}
