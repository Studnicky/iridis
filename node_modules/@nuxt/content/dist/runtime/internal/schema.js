const propertyTypes = {
  string: "VARCHAR",
  number: "INT",
  boolean: "BOOLEAN",
  date: "DATE",
  datetime: "DATETIME",
  enum: "VARCHAR",
  object: "TEXT"
};
export function getOrderedSchemaKeys(schema) {
  const shape = Object.values(schema.definitions)[0]?.properties || {};
  const keys = new Set([
    shape.id ? "id" : void 0,
    shape.title ? "title" : void 0,
    ...Object.keys(shape).sort()
  ].filter(Boolean));
  return Array.from(keys);
}
function isJSONProperty(property) {
  const propertyType = property.type;
  return propertyType === "object" || propertyType === "array" || !!property.anyOf || !!property.allOf || !!property.oneOf;
}
function getPropertyType(property) {
  const propertyType = property.type;
  let type = propertyTypes[propertyType] || "TEXT";
  if (property.format === "date") {
    type = "DATE";
  }
  if (property.format === "date-time") {
    type = "DATETIME";
  }
  if (property.allOf) {
    type = "TEXT";
  }
  if (property.anyOf) {
    type = "TEXT";
    const anyOf = property.anyOf;
    const nullIndex = anyOf.findIndex((t) => t.type === "null");
    if (anyOf.length === 2 && nullIndex !== -1) {
      type = nullIndex === 0 ? getPropertyType(anyOf[1]) : getPropertyType(anyOf[0]);
    }
  }
  if (property.oneOf) {
    type = "TEXT";
    const oneOf = property.oneOf;
    const nullIndex = oneOf.findIndex((t) => t.type === "null");
    if (oneOf.length === 2 && nullIndex !== -1) {
      type = nullIndex === 0 ? getPropertyType(oneOf[1]) : getPropertyType(oneOf[0]);
    }
  }
  if (Array.isArray(propertyType) && propertyType.includes("null") && propertyType.length === 2) {
    type = propertyType[0] === "null" ? propertyTypes[propertyType[1]] || "TEXT" : propertyTypes[propertyType[0]] || "TEXT";
  }
  return type;
}
export function describeProperty(schema, property) {
  const def = Object.values(schema.definitions)[0];
  const shape = def?.properties || {};
  if (!shape[property]) {
    throw new Error(`Property ${property} not found in schema`);
  }
  const type = shape[property].type;
  const result = {
    name: property,
    sqlType: getPropertyType(shape[property]),
    type,
    nullable: false,
    maxLength: shape[property].maxLength,
    enum: shape[property].enum,
    json: isJSONProperty(shape[property])
  };
  if (shape[property].anyOf) {
    if (shape[property].anyOf.find((t) => t.type === "null")) {
      result.nullable = true;
    }
  }
  if (shape[property].oneOf) {
    if (shape[property].oneOf.find((t) => t.type === "null")) {
      result.nullable = true;
    }
  }
  if (Array.isArray(type) && type.includes("null")) {
    result.nullable = true;
  }
  if ("default" in shape[property]) {
    result.default = shape[property].default;
  } else if (!def?.required.includes(property)) {
    result.nullable = true;
  }
  return result;
}
export function getCollectionFieldsTypes(schema) {
  const sortedKeys = getOrderedSchemaKeys(schema);
  return sortedKeys.reduce((acc, key) => {
    const property = describeProperty(schema, key);
    if (property.json) {
      acc[key] = "json";
    } else if (property.sqlType === "BOOLEAN") {
      acc[key] = "boolean";
    } else if (property.sqlType === "DATE") {
      acc[key] = "date";
    } else if (property.sqlType === "INT") {
      acc[key] = "number";
    } else {
      acc[key] = "string";
    }
    return acc;
  }, {});
}
