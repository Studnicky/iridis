import {
  buildCustomGroupModifiersJsonSchema,
  buildCustomGroupSelectorJsonSchema,
} from '../../utils/json-schemas/common-groups-json-schemas.js'
var ORDER_ERROR_ID = 'unexpectedNamedImportsOrder'
var GROUP_ORDER_ERROR_ID = 'unexpectedNamedImportsGroupOrder'
var EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenNamedImports'
var MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenNamedImports'
/**
 * Array of all available selectors for named imports.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allSelectors = ['import']
/**
 * Array of all available modifiers for named imports.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allModifiers = ['value', 'type']
/**
 * Additional custom group match options JSON schema. Used by ESLint to validate
 * rule options at configuration time.
 */
var additionalCustomGroupMatchOptionsJsonSchema = {
  modifiers: buildCustomGroupModifiersJsonSchema(allModifiers),
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
}
export {
  EXTRA_SPACING_ERROR_ID,
  GROUP_ORDER_ERROR_ID,
  MISSED_SPACING_ERROR_ID,
  ORDER_ERROR_ID,
  additionalCustomGroupMatchOptionsJsonSchema,
  allModifiers,
  allSelectors,
}
