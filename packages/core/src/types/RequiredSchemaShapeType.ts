type OptionalSchemaKeyType<SchemaShapeType> = {
  [Key in keyof SchemaShapeType]-?: {} extends Pick<SchemaShapeType, Key> ? Key : never;
}[keyof SchemaShapeType];

export type RequiredSchemaShapeType<SchemaShapeType, OverrideShapeType = never> = {
  [Key in Exclude<keyof SchemaShapeType, OptionalSchemaKeyType<SchemaShapeType>>]: SchemaShapeType[Key];
} & {
  [Key in OptionalSchemaKeyType<SchemaShapeType>]: [OverrideShapeType] extends [never]
    ? SchemaShapeType[Key] | undefined
    : Key extends keyof OverrideShapeType
      ? OverrideShapeType[Key] | undefined
      : SchemaShapeType[Key] | undefined;
};
