import { defu } from 'defu';

const supportedFields = {
  /**
   * Raw types
   */
  default: {
    type: "string",
    tags: [
      "@previewInput string"
    ]
  },
  string: {
    type: "string",
    tags: [
      "@previewInput string"
    ]
  },
  number: {
    type: "number",
    tags: [
      "@previewInput number"
    ]
  },
  boolean: {
    type: "boolean",
    tags: [
      "@previewInput boolean"
    ]
  },
  array: {
    type: "array",
    tags: [
      "@previewInput array"
    ]
  },
  object: {
    type: "object",
    tags: [
      "@previewInput object"
    ]
  },
  file: {
    type: "string",
    tags: [
      "@previewInput file"
    ]
  },
  media: {
    type: "string",
    tags: [
      "@previewInput media"
    ]
  },
  component: {
    type: "string",
    tags: [
      "@previewInput component"
    ]
  },
  icon: {
    type: "string",
    tags: [
      "@previewInput icon"
    ]
  },
  textarea: {
    type: "string",
    tags: [
      "@previewInput textarea"
    ]
  }
};
function field(schema) {
  if (!schema.type) {
    throw new Error(`Missing type in schema ${JSON.stringify(schema)}`);
  }
  const base = JSON.parse(JSON.stringify(supportedFields[schema.type]));
  const result = defu(base, schema);
  if (!result.tags) {
    result.tags = [];
  }
  if (result.icon) {
    result.tags.push(`@previewIcon ${result.icon}`);
    delete result.icon;
  }
  return {
    $schema: result
  };
}
function group(schema) {
  const result = { ...schema };
  if (result.icon) {
    result.tags = [`@previewIcon ${result.icon}`];
    delete result.icon;
  }
  const fields = {};
  if (result.fields) {
    for (const key of Object.keys(result.fields)) {
      fields[key] = result.fields[key];
    }
    delete result.fields;
  }
  return {
    $schema: result,
    ...fields
  };
}

export { field, group };
