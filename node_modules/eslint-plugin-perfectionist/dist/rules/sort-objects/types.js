import { buildRegexJsonSchema } from '../../utils/json-schemas/common-json-schemas.js'
import {
  buildCustomGroupModifiersJsonSchema,
  buildCustomGroupSelectorJsonSchema,
} from '../../utils/json-schemas/common-groups-json-schemas.js'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
var ORDER_ERROR_ID = 'unexpectedObjectsOrder'
var GROUP_ORDER_ERROR_ID = 'unexpectedObjectsGroupOrder'
var EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenObjectMembers'
var MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenObjectMembers'
var DEPENDENCY_ORDER_ERROR_ID = 'unexpectedObjectsDependencyOrder'
var objectParentTypes = [
  AST_NODE_TYPES.VariableDeclarator,
  AST_NODE_TYPES.CallExpression,
  AST_NODE_TYPES.Property,
]
/**
 * Array of all available selectors for object members.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allSelectors = ['member', 'method', 'property']
/**
 * Array of all available modifiers for object members.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allModifiers = ['multiline']
/**
 * Additional sort options JSON schema, Used by ESLint to validate rule options.
 */
var additionalSortOptionsJsonSchema = {
  sortBy: {
    enum: [...['name', 'value']],
    type: 'string',
  },
}
/**
 * Additional custom group match options JSON schema. Used by ESLint to validate
 * rule options at configuration time.
 */
var additionalCustomGroupMatchOptionsJsonSchema = {
  modifiers: buildCustomGroupModifiersJsonSchema(allModifiers),
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
  elementValuePattern: buildRegexJsonSchema(),
}
export {
  DEPENDENCY_ORDER_ERROR_ID,
  EXTRA_SPACING_ERROR_ID,
  GROUP_ORDER_ERROR_ID,
  MISSED_SPACING_ERROR_ID,
  ORDER_ERROR_ID,
  additionalCustomGroupMatchOptionsJsonSchema,
  additionalSortOptionsJsonSchema,
  allModifiers,
  allSelectors,
  objectParentTypes,
}
