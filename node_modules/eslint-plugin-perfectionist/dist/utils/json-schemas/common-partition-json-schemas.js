import { buildRegexJsonSchema } from './common-json-schemas.js'
var allowedPartitionByCommentJsonSchemas = [
  { type: 'boolean' },
  buildRegexJsonSchema(),
]
/**
 * JSON schema for the partition by comment option. Validates configuration for
 * splitting elements into partitions based on comments.
 */
var partitionByCommentJsonSchema = {
  oneOf: [
    ...allowedPartitionByCommentJsonSchemas,
    {
      properties: {
        block: {
          description: 'Enables specific block comments to separate the nodes.',
          oneOf: allowedPartitionByCommentJsonSchemas,
        },
        line: {
          description: 'Enables specific line comments to separate the nodes.',
          oneOf: allowedPartitionByCommentJsonSchemas,
        },
      },
      additionalProperties: false,
      minProperties: 1,
      type: 'object',
    },
  ],
  description:
    'Enables the use of comments to separate the nodes into logical groups.',
}
/**
 * JSON schema for the partition by new line option. Controls whether to create
 * separate partitions when newlines are encountered.
 */
var partitionByNewlineJsonSchema = {
  description:
    'Enables the use of newlines to separate the nodes into logical groups.',
  type: 'boolean',
}
export { partitionByCommentJsonSchema, partitionByNewlineJsonSchema }
