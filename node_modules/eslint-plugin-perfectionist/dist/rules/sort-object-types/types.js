import { buildRegexJsonSchema } from '../../utils/json-schemas/common-json-schemas.js'
import {
  buildCustomGroupModifiersJsonSchema,
  buildCustomGroupSelectorJsonSchema,
} from '../../utils/json-schemas/common-groups-json-schemas.js'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
var objectTypeParentTypes = [
  AST_NODE_TYPES.TSTypeAliasDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSPropertySignature,
  AST_NODE_TYPES.VariableDeclarator,
  AST_NODE_TYPES.PropertyDefinition,
]
/**
 * Array of all available selectors for object type members.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allSelectors = ['index-signature', 'member', 'method', 'property']
/**
 * Array of all available modifiers for object type members.
 *
 * Used for validation and configuration in the ESLint rule.
 */
var allModifiers = ['optional', 'required', 'multiline']
/**
 * Additional sort options JSON schema, used by ESLint to validate rule options.
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
  additionalCustomGroupMatchOptionsJsonSchema,
  additionalSortOptionsJsonSchema,
  allModifiers,
  allSelectors,
  objectTypeParentTypes,
}
