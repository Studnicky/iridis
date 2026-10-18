type OptionalSchemaKeyType<SchemaShapeType> = {
  [Key in keyof SchemaShapeType]-?: {} extends Pick<SchemaShapeType, Key> ? Key : never;
}[keyof SchemaShapeType];

export type RequiredSchemaShapeType<
  SchemaShapeType,
  OverrideShapeType = never,
  PreservedOptionalKeyType extends OptionalSchemaKeyType<SchemaShapeType> = never
> = {
  [Key in Exclude<keyof SchemaShapeType, OptionalSchemaKeyType<SchemaShapeType>>]: [OverrideShapeType] extends [never]
    ? SchemaShapeType[Key]
    : Key extends keyof OverrideShapeType
      ? OverrideShapeType[Key]
      : SchemaShapeType[Key];
} & {
  [Key in Exclude<OptionalSchemaKeyType<SchemaShapeType>, PreservedOptionalKeyType>]: [OverrideShapeType] extends [never]
    ? SchemaShapeType[Key] | undefined
    : Key extends keyof OverrideShapeType
      ? OverrideShapeType[Key] | undefined
      : SchemaShapeType[Key] | undefined;
} & {
  [Key in PreservedOptionalKeyType]?: [OverrideShapeType] extends [never]
    ? SchemaShapeType[Key]
    : Key extends keyof OverrideShapeType
      ? OverrideShapeType[Key]
      : SchemaShapeType[Key];
};
