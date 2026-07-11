import { buildRegexJsonSchema } from './common-json-schemas.js'
import { regexScopes } from '../../types/scoped-regex-option.js'
var scopedRegexJsonSchema = buildRegexJsonSchema({
  additionalProperties: {
    scope: {
      enum: [...regexScopes],
      type: 'string',
    },
  },
})
export { scopedRegexJsonSchema }
