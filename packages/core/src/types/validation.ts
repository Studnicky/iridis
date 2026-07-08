/**
 * A JSON Schema object acceptable to {@link import('../model/Validator.ts').Validator}.
 */
export type SchemaInterfaceType = Record<string, unknown>;

export type ValidationErrorInterfaceType = {
  'message': string;
  'path':    string;
};

export type ValidationResultInterfaceType = {
  'errors': ValidationErrorInterfaceType[];
  'valid':  boolean;
};
