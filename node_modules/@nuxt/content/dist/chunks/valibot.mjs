import { toJsonSchema } from '@valibot/to-json-schema';

function toJSONSchema(schema, name) {
  const definitions = toJsonSchema(schema, {
    overrideSchema(context) {
      if (context.valibotSchema.type === "date") {
        return { type: "string", format: "date" };
      }
      if (context.valibotSchema.$content) {
        return {
          ...context.jsonSchema,
          $content: context.valibotSchema.$content
        };
      }
    }
  });
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $ref: `#/definitions/${name}`,
    definitions: {
      [name]: definitions
    }
  };
}

export { toJSONSchema };
