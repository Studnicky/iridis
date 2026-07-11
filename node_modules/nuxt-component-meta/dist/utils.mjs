import { i as isNativeBrowserType } from './shared/nuxt-component-meta.jPHoGkDc.mjs';
import 'scule';

function propsToJsonSchema(props) {
  const schema = {
    type: "object",
    properties: {},
    required: []
  };
  for (const prop of props) {
    const propSchema = {};
    if (prop.description) {
      propSchema.description = prop.description;
    }
    const propType = convertVueTypeToJsonSchema(prop.type, prop.schema);
    if (!propType) {
      continue;
    }
    Object.assign(propSchema, propType);
    if (prop.default !== void 0 && propSchema.default === void 0) {
      propSchema.default = parseDefaultValue(prop.default);
    }
    if (propSchema.default === void 0 && prop.tags) {
      const defaultValueTag = prop.tags.find((tag) => tag.name === "defaultValue");
      if (defaultValueTag) {
        propSchema.default = parseDefaultValue(defaultValueTag.text);
      }
    }
    schema.properties[prop.name] = propSchema;
    if (prop.required) {
      schema.required.push(prop.name);
    }
  }
  if (schema.required.length === 0) {
    delete schema.required;
  }
  return schema;
}
function convertVueTypeToJsonSchema(vueType, vueSchema) {
  if (isFunctionProp(vueType, vueSchema)) {
    return void 0;
  }
  if (!vueType.includes("|") && vueType.includes(" & ")) {
    const intersectionSchema = convertIntersectionType(vueType);
    if (intersectionSchema) {
      return intersectionSchema;
    }
  }
  if (isEnumType(vueType, vueSchema)) {
    return convertEnumToJsonSchema(vueType, vueSchema);
  }
  if (typeof vueSchema === "string" && vueSchema.includes("|")) {
    const withoutUndefined = vueSchema.replace(/\s*\|\s*undefined\s*|\s*undefined\s*\|\s*/g, "").trim();
    if (withoutUndefined.includes("|")) {
      return convertUnionTypeFromString(withoutUndefined);
    }
    if (withoutUndefined) {
      vueType = withoutUndefined;
      vueSchema = withoutUndefined;
    }
  }
  const { type: unwrappedType, schema: unwrappedSchema, enumValues } = unwrapEnumSchema(vueType, vueSchema);
  if (enumValues && unwrappedType === "boolean") {
    return { type: "boolean", enum: enumValues };
  }
  if (unwrappedType.endsWith("[]")) {
    const itemType = unwrappedType.replace(/\[\]$/, "").trim();
    if (unwrappedSchema && typeof unwrappedSchema === "object" && unwrappedSchema.kind === "array" && Array.isArray(unwrappedSchema.schema) && unwrappedSchema.schema.length > 0) {
      const itemSchema = unwrappedSchema.schema[0];
      return {
        type: "array",
        items: convertVueTypeToJsonSchema(itemSchema.type || itemType, itemSchema)
      };
    }
    if (unwrappedSchema && typeof unwrappedSchema === "object" && "schema" in unwrappedSchema && unwrappedSchema["schema"] && typeof unwrappedSchema["schema"] === "object" && !Array.isArray(unwrappedSchema["schema"]) && Object.keys(unwrappedSchema["schema"]).length === 1 && Object.keys(unwrappedSchema["schema"])[0] === "0") {
      const itemSchema = unwrappedSchema["schema"]["0"];
      if (typeof itemSchema === "string") {
        return {
          type: "array",
          items: convertSimpleType(itemSchema)
        };
      }
      if (itemSchema && typeof itemSchema === "object" && itemSchema.kind === "enum" && Array.isArray(itemSchema["schema"])) {
        return {
          type: "array",
          items: {
            type: itemSchema["schema"].map((t) => typeof t === "string" ? t : t.type)
          }
        };
      }
      return {
        type: "array",
        items: convertVueTypeToJsonSchema(itemType, itemSchema)
      };
    }
    return {
      type: "array",
      items: convertSimpleType(itemType)
    };
  }
  if (unwrappedType.toLowerCase() === "object" || unwrappedType.match(/^{.*}$/) || unwrappedSchema && typeof unwrappedSchema === "object" && unwrappedSchema.kind === "object") {
    let nested = void 0;
    const vs = unwrappedSchema;
    if (vs && typeof vs === "object" && !Array.isArray(vs) && Object.prototype.hasOwnProperty.call(vs, "schema") && vs["schema"] && typeof vs["schema"] === "object") {
      nested = vs["schema"];
    } else if (vs && typeof vs === "object" && !Array.isArray(vs)) {
      nested = vs;
    }
    if (nested) {
      const hasProperties = Object.keys(nested).length > 0;
      if (!hasProperties) {
        return {
          type: "object",
          description: unwrappedType !== "object" && unwrappedType !== "Object" ? `Native type: ${unwrappedType}` : void 0
        };
      }
      const properties = convertNestedSchemaToJsonSchemaProperties(nested);
      const required = Object.entries(nested).filter(([_, v]) => v && typeof v === "object" && v.required).map(([k]) => k);
      const schemaObj = {
        type: "object",
        properties,
        additionalProperties: false
      };
      if (required.length > 0) {
        schemaObj.required = required;
      }
      return schemaObj;
    }
    return { type: "object" };
  }
  return convertSimpleType(unwrappedType);
}
function convertNestedSchemaToJsonSchemaProperties(nestedSchema) {
  const properties = {};
  for (const key in nestedSchema) {
    const prop = nestedSchema[key];
    let type = "any", schema = void 0, description = "", def = void 0;
    if (prop && typeof prop === "object") {
      type = prop.type || "any";
      schema = prop.schema || void 0;
      description = prop.description || "";
      def = prop.default;
    } else if (typeof prop === "string") {
      type = prop;
    }
    const converted = convertVueTypeToJsonSchema(type, schema);
    if (!converted) {
      continue;
    }
    properties[key] = convertVueTypeToJsonSchema(type, schema);
    if (description) {
      properties[key].description = description;
    }
    if (def !== void 0) {
      if (type === "object" && typeof def === "object" && !Array.isArray(def) && Object.keys(def).length === 0 || !(type === "string" && def === "") && !(type === "number" && def === 0) && !(type === "boolean" && def === false) && !(type === "array" && Array.isArray(def) && def.length === 0)) {
        properties[key].default = def;
      }
    }
  }
  return properties;
}
function convertSimpleType(type) {
  switch (type.toLowerCase()) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "symbol":
      return { type: "string" };
    // JSON Schema doesn't have symbol type, map to string
    case "object":
      return { type: "object" };
    case "array":
      return { type: "array" };
    case "null":
      return { type: "null" };
    default:
      if (type.includes("{}") || type.includes("Object")) {
        return { type: "object" };
      }
      if (isNativeBrowserType(type)) {
        return {
          type: "object",
          description: `Native type: ${type}`
        };
      }
      return {};
  }
}
function parseDefaultValue(defaultValue) {
  try {
    if (defaultValue.startsWith('"') && defaultValue.endsWith('"') || defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
      return defaultValue.slice(1, -1);
    }
    if (defaultValue === "true") return true;
    if (defaultValue === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(defaultValue)) {
      return parseFloat(defaultValue);
    }
    if (defaultValue.startsWith("{") || defaultValue.startsWith("[")) {
      return JSON.parse(defaultValue);
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}
function unwrapEnumSchema(vueType, vueSchema) {
  if (typeof vueSchema === "object" && vueSchema?.kind === "enum" && vueSchema?.schema && typeof vueSchema?.schema === "object") {
    const values = Object.values(vueSchema.schema).filter((v) => v !== "undefined");
    if (values.every((v) => v === "true" || v === "false")) {
      if (values.length === 2) {
        return { type: "boolean", schema: void 0 };
      } else if (values.length === 1) {
        return { type: "boolean", schema: void 0, enumValues: [values[0] === "true"] };
      }
    }
    if (values.length === 1) {
      const s = values[0];
      let t = vueType;
      if (typeof s === "object" && s.type) t = s.type;
      else if (typeof s === "string") t = s;
      return { type: t, schema: s };
    }
    for (const s of values) {
      if (s !== "undefined") {
        let t = vueType;
        if (typeof s === "object" && s.type) t = s.type;
        else if (typeof s === "string") t = s;
        return { type: t, schema: s };
      }
    }
  }
  return { type: vueType, schema: vueSchema };
}
function isEnumType(vueType, vueSchema) {
  if (typeof vueSchema === "object" && vueSchema?.kind === "enum") {
    const schema = vueSchema.schema;
    if (schema && typeof schema === "object") {
      const values = Object.values(schema);
      const stringLiterals = values.filter(
        (v) => v !== "undefined" && typeof v === "string" && v.startsWith('"') && v.endsWith('"')
      );
      const booleanLiterals = values.filter(
        (v) => v !== "undefined" && (v === "true" || v === "false")
      );
      const primitiveTypes = values.filter(
        (v) => v !== "undefined" && typeof v === "string" && ["string", "number", "boolean", "symbol"].includes(v)
      );
      return stringLiterals.length > 0 || booleanLiterals.length > 0 || primitiveTypes.length > 0;
    }
  }
  if (vueType.includes('"') && vueType.includes("|")) {
    return true;
  }
  return false;
}
function convertEnumToJsonSchema(vueType, vueSchema) {
  if (typeof vueSchema === "object" && vueSchema?.kind === "enum") {
    const schema = vueSchema.schema;
    if (schema && typeof schema === "object") {
      const enumValues = [];
      const types = /* @__PURE__ */ new Set();
      Object.values(schema).forEach((value) => {
        if (value === "undefined") {
          return;
        }
        if (typeof value === "string") {
          if (value === "true" || value === "false") {
            enumValues.push(value === "true");
            types.add("boolean");
          } else if (value.startsWith('"') && value.endsWith('"')) {
            enumValues.push(value.slice(1, -1));
            types.add("string");
          } else if (value === "string") {
            types.add("string");
          } else if (value === "number") {
            types.add("number");
          } else if (value === "boolean") {
            types.add("boolean");
          } else if (value === "symbol") {
            types.add("symbol");
          }
        } else if (typeof value === "object" && value !== null) {
          if (value.type) {
            const convertedType = convertIntersectionType(value.type);
            if (convertedType) {
              types.add("__intersection__");
            } else {
              types.add(value.type);
            }
          }
        }
      });
      if (enumValues.length > 0) {
        const result = { enum: enumValues };
        if (types.has("__intersection__")) {
          const intersectionType = Object.values(schema).find(
            (v) => typeof v === "object" && v?.type && v.type.includes(" & ")
          );
          if (intersectionType) {
            const convertedIntersection = convertIntersectionType(intersectionType.type);
            if (convertedIntersection) {
              return {
                anyOf: [
                  { enum: enumValues },
                  convertedIntersection
                ]
              };
            }
          }
        }
        const realTypes = new Set(Array.from(types).filter((t) => t !== "__intersection__"));
        if (realTypes.size === 1) {
          const type = Array.from(realTypes)[0];
          result.type = type === "symbol" ? "string" : type;
        } else if (realTypes.size > 1) {
          const mappedTypes = Array.from(realTypes).map((type) => type === "symbol" ? "string" : type);
          const uniqueTypes = [...new Set(mappedTypes)];
          result.type = uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes;
        }
        if (realTypes.size === 1 && realTypes.has("boolean") && enumValues.length === 2 && enumValues.includes(true) && enumValues.includes(false)) {
          return { type: "boolean" };
        }
        return result;
      }
      if (types.has("__intersection__")) {
        const intersectionType = Object.values(schema).find(
          (v) => typeof v === "object" && v?.type && v.type.includes(" & ")
        );
        if (intersectionType) {
          const convertedIntersection = convertIntersectionType(intersectionType.type);
          if (convertedIntersection) {
            const realTypes = Array.from(types).filter((t) => t !== "__intersection__" && t !== "undefined");
            if (realTypes.length === 0) {
              return convertedIntersection;
            } else {
              const otherSchemas = realTypes.map((t) => convertSimpleType(t));
              return {
                anyOf: [
                  ...otherSchemas,
                  convertedIntersection
                ]
              };
            }
          }
        }
      }
      if (types.size > 1) {
        const mappedTypes = Array.from(types).filter((t) => t !== "__intersection__").map((type) => type === "symbol" ? "string" : type);
        const uniqueTypes = [...new Set(mappedTypes)];
        return { type: uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes };
      } else if (types.size === 1) {
        const type = Array.from(types)[0];
        return { type: type === "symbol" ? "string" : type };
      }
    }
  }
  if (vueType.includes('"') && vueType.includes("|")) {
    const enumValues = [];
    const parts = vueType.split("|").map((p) => p.trim());
    parts.forEach((part) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        enumValues.push(part.slice(1, -1));
      }
    });
    if (enumValues.length > 0) {
      return { type: "string", enum: enumValues };
    }
  }
  return { type: "string" };
}
function isFunctionProp(type, schema) {
  if (type && typeof type === "string") {
    if (type.includes("=>") || type.includes("(event:") || type.includes("void")) {
      return true;
    }
  }
  if (schema && typeof schema === "object") {
    if (schema.kind === "enum" && schema.schema) {
      const values = Object.values(schema.schema);
      for (const value of values) {
        if (typeof value === "object" && value?.kind === "event") {
          return true;
        }
        if (typeof value === "object" && value?.kind === "array" && value.schema) {
          for (const item of value.schema) {
            if (typeof item === "object" && item?.kind === "event") {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}
function convertIntersectionType(typeString) {
  if (typeString === "string & {}") {
    return {
      allOf: [
        { type: "string" },
        { type: "object", additionalProperties: false }
      ]
    };
  }
  if (typeString.includes(" & ")) {
    const parts = typeString.split(" & ").map((p) => p.trim());
    const allOfSchemas = parts.map((part) => {
      if (part === "string") {
        return { type: "string" };
      } else if (part === "number") {
        return { type: "number" };
      } else if (part === "boolean") {
        return { type: "boolean" };
      } else if (part === "object") {
        return { type: "object" };
      } else if (part === "{}") {
        return { type: "object", additionalProperties: false };
      } else if (part === "null") {
        return { type: "null" };
      } else {
        return { type: part };
      }
    });
    return {
      allOf: allOfSchemas
    };
  }
  return null;
}
function convertUnionTypeFromString(unionString) {
  const types = unionString.split("|").map((t) => t.trim());
  const jsonTypes = types.map((type) => {
    if (type === "symbol") {
      return "string";
    }
    return type;
  });
  const uniqueTypes = [...new Set(jsonTypes)];
  if (uniqueTypes.length === 1) {
    return { type: uniqueTypes[0] };
  } else {
    return { type: uniqueTypes };
  }
}

export { propsToJsonSchema };
