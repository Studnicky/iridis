import type {
  ValidationErrorInterface,
  ValidationResultInterface,
} from '../types/index.ts';

/**
 * A JSON Schema literal as understood by this validator.
 * Only the subset of Draft-07 that the iridis schemas actually use.
 */
export interface SchemaInterface {
  readonly 'type'?:                 string | readonly string[];
  readonly 'properties'?:          Readonly<Record<string, SchemaInterface>>;
  readonly 'required'?:            readonly string[];
  readonly 'additionalProperties'?: boolean | SchemaInterface;
  readonly 'items'?:               SchemaInterface;
  readonly 'enum'?:                readonly unknown[];
  readonly 'minimum'?:             number;
  readonly 'maximum'?:             number;
  readonly 'minItems'?:            number;
  readonly 'maxItems'?:            number;
  readonly 'pattern'?:             string;
  /** Ignored during traversal — present only for schema identification. */
  readonly '$id'?:                 string;
  readonly '$schema'?:             string;
  readonly 'description'?:         string;
  /** $ref: not resolved — schemas that use $ref must be validated elsewhere. */
  readonly '$ref'?:                string;
}

function pushError(
  errors: ValidationErrorInterface[],
  path:    string,
  message: string,
): void {
  errors.push({ 'path': path, 'message': message });
}

function typeOf(value: unknown): string {
  if (value === null)            return 'null';
  if (Array.isArray(value))      return 'array';
  return typeof value;
}

function validateType(schema: SchemaInterface, value: unknown, path: string, errors: ValidationErrorInterface[]): boolean {
  const { type } = schema;
  if (type === undefined) {
    return true;
  }

  const types: readonly string[] = Array.isArray(type) ? type : [type];
  const actual = typeOf(value);

  const matches = types.some((t) => {
    if (t === 'integer') {
      return typeof value === 'number' && Number.isInteger(value);
    }
    return t === actual;
  });

  if (!matches) {
    const expected = types.join(' | ');
    pushError(errors, path, `expected ${expected}, got ${actual}`);
    return false;
  }
  return true;
}

function walkValue(schema: SchemaInterface, value: unknown, path: string, errors: ValidationErrorInterface[]): void {
  // $ref: skip — schemas using $ref are not validated via this walker
  if (schema['$ref'] !== undefined) {
    return;
  }

  // type check
  const typeOk = validateType(schema, value, path, errors);
  if (!typeOk) {
    // No point descending if the type is wrong
    return;
  }

  // enum
  if (schema['enum'] !== undefined) {
    const isIn = schema['enum'].some((v) => v === value);
    if (!isIn) {
      pushError(errors, path, `expected one of [${schema['enum'].join(', ')}], got ${String(value)}`);
    }
  }

  // string checks
  if (typeof value === 'string') {
    if (schema['pattern'] !== undefined) {
      const re = new RegExp(schema['pattern']);
      if (!re.test(value)) {
        pushError(errors, path, `value "${value}" does not match pattern ${schema['pattern']}`);
      }
    }
  }

  // number checks
  if (typeof value === 'number') {
    if (schema['minimum'] !== undefined && value < schema['minimum']) {
      pushError(errors, path, `${value} is less than minimum ${schema['minimum']}`);
    }
    if (schema['maximum'] !== undefined && value > schema['maximum']) {
      pushError(errors, path, `${value} is greater than maximum ${schema['maximum']}`);
    }
  }

  // array checks
  if (Array.isArray(value)) {
    if (schema['minItems'] !== undefined && value.length < schema['minItems']) {
      pushError(errors, path, `array length ${value.length} is less than minItems ${schema['minItems']}`);
    }
    if (schema['maxItems'] !== undefined && value.length > schema['maxItems']) {
      pushError(errors, path, `array length ${value.length} is greater than maxItems ${schema['maxItems']}`);
    }
    if (schema['items'] !== undefined) {
      for (let i = 0; i < value.length; i += 1) {
        walkValue(schema['items'], value[i], `${path}[${i}]`, errors);
      }
    }
  }

  // object checks
  if (typeOf(value) === 'object' && !Array.isArray(value) && value !== null) {
    const obj = value as Record<string, unknown>;

    // required properties
    if (schema['required'] !== undefined) {
      for (const key of schema['required']) {
        if (!(key in obj)) {
          pushError(errors, path ? `${path}.${key}` : key, `required property "${key}" is missing`);
        }
      }
    }

    // property sub-schemas
    if (schema['properties'] !== undefined) {
      for (const [key, subSchema] of Object.entries(schema['properties'])) {
        if (key in obj) {
          const childPath = path ? `${path}.${key}` : key;
          walkValue(subSchema, obj[key], childPath, errors);
        }
      }
    }

    // additionalProperties: false
    if (schema['additionalProperties'] === false && schema['properties'] !== undefined) {
      const known = new Set(Object.keys(schema['properties']));
      for (const key of Object.keys(obj)) {
        if (!known.has(key)) {
          const childPath = path ? `${path}.${key}` : key;
          pushError(errors, childPath, `additional property "${key}" is not allowed`);
        }
      }
    } else if (
      typeof schema['additionalProperties'] === 'object' &&
      schema['additionalProperties'] !== null &&
      !Array.isArray(schema['additionalProperties'])
    ) {
      // additionalProperties is a schema — validate every value against it
      const knownKeys = schema['properties'] !== undefined
        ? new Set(Object.keys(schema['properties']))
        : new Set<string>();
      for (const [key, val] of Object.entries(obj)) {
        if (!knownKeys.has(key)) {
          const childPath = path ? `${path}.${key}` : key;
          walkValue(schema['additionalProperties'] as SchemaInterface, val, childPath, errors);
        }
      }
    }
  }
}

export class Validator {
  validate(schema: SchemaInterface, value: unknown): ValidationResultInterface {
    const errors: ValidationErrorInterface[] = [];
    walkValue(schema, value, '', errors);
    return { 'valid': errors.length === 0, 'errors': errors };
  }
}

export const validator = new Validator();
