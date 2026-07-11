import { z } from 'zod/v4';

function toJSONSchema(_schema, name) {
  const schema = _schema;
  try {
    const baseSchema = z.toJSONSchema(schema, {
      target: "draft-7",
      unrepresentable: "any",
      override: (ctx) => {
        const def = ctx.zodSchema._zod?.def;
        if (def?.type === "date") {
          ctx.jsonSchema.type = "string";
          ctx.jsonSchema.format = "date";
        }
        if (def?.$content) {
          ctx.jsonSchema.$content = def.$content;
        }
      }
    });
    const draft07Schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $ref: `#/definitions/${name}`,
      definitions: {
        [name]: {
          type: baseSchema.type || "object",
          properties: baseSchema.properties || {},
          required: baseSchema.required || [],
          additionalProperties: typeof baseSchema.additionalProperties === "boolean" ? baseSchema.additionalProperties : false
        }
      }
    };
    return draft07Schema;
  } catch (error) {
    console.error(
      "Zod toJSONSchema error for schema:",
      schema.constructor.name,
      error
    );
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      $ref: `#/definitions/${name}`,
      definitions: {
        [name]: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false
        }
      }
    };
  }
}

export { toJSONSchema };
