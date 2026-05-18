import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type {
  ValidationErrorInterface,
  ValidationResultInterface,
} from '../types/index.ts';
import { ColorRecordSchema }  from './ColorRecordSchema.ts';
import { InputSchema }        from './InputSchema.ts';
import { PaletteStateSchema } from './PaletteStateSchema.ts';
import { PluginSchema }       from './PluginSchema.ts';
import { RoleSchemaSchema }   from './RoleSchemaSchema.ts';
import { TaskManifestSchema } from './TaskManifestSchema.ts';

/**
 * A JSON Schema object acceptable to this validator.
 * Kept for backwards-compatible surface of `SchemaInterface`.
 */
export type SchemaInterface = Record<string, unknown>;

function makeAjv(): Ajv {
  const ajv = new Ajv({
    strict:           false,
    allErrors:        true,
    removeAdditional: false,
  });
  // Register all cross-referenced schemas up front
  ajv.addSchema(ColorRecordSchema);
  ajv.addSchema(InputSchema);
  ajv.addSchema(PaletteStateSchema);
  ajv.addSchema(PluginSchema);
  ajv.addSchema(RoleSchemaSchema);
  ajv.addSchema(TaskManifestSchema);
  return ajv;
}

/**
 * Normalise the ajv instancePath ("/a/b/0") to the legacy format ("a.b[0]").
 * - Leading slash is dropped
 * - Interior slashes before digit-only segments become "[N]"
 * - Other interior slashes become "."
 *
 * The legacy hand-rolled validator used dot-separated paths with bracket
 * notation for array indices (e.g. "color.hex", "items[1]"). Tests assert
 * against this format, so we preserve it here.
 */
function normalisePath(instancePath: string, keyword: string, params: Record<string, unknown>): string {
  if (keyword === 'required') {
    const missing = params['missingProperty'] as string | undefined;
    if (missing !== undefined) {
      const base = instancePath.replace(/^\//, '').replace(/\//g, '.');
      return base ? `${base}.${missing}` : missing;
    }
  }

  if (!instancePath) { return ''; }

  const segments = instancePath.replace(/^\//, '').split('/');
  let result = '';
  for (const seg of segments) {
    if (/^\d+$/.test(seg)) {
      result += `[${seg}]`;
    } else {
      result += result === '' ? seg : `.${seg}`;
    }
  }
  return result;
}

/**
 * Normalise an ajv error message to the legacy format the existing tests
 * expect. The hand-rolled validator produced specific phrasing; we mirror
 * it here so all tests continue to pass without modification.
 *
 * Legacy messages:
 *   type:                "expected {type}, got {actual}"
 *   required:            "required property \"{name}\" is missing"
 *   additionalProperties:"additional property \"{name}\" is not allowed"
 *   minItems:            "array length {n} is less than minItems {limit}"
 *   maxItems:            "array length {n} is greater than maxItems {limit}"
 *   minimum:             "{value} is less than minimum {limit}"
 *   maximum:             "{value} is greater than maximum {limit}"
 *   pattern:             "value \"{value}\" does not match pattern {pattern}"
 *   enum:                "expected one of [{values}], got {value}"
 */
function normaliseMessage(
  e:     ErrorObject,
  value: unknown,
): string {
  const params = e.params as Record<string, unknown>;

  switch (e.keyword) {
    case 'type': {
      const expected = (params['type'] as string | string[]);
      const expectedStr = Array.isArray(expected) ? expected.join(' | ') : expected;
      const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      return `expected ${expectedStr}, got ${actual}`;
    }

    case 'required': {
      const prop = params['missingProperty'] as string;
      return `required property "${prop}" is missing`;
    }

    case 'additionalProperties': {
      const prop = params['additionalProperty'] as string;
      return `additional property "${prop}" is not allowed`;
    }

    case 'minItems': {
      const limit  = params['limit'] as number;
      const actual = Array.isArray(value) ? value.length : 0;
      return `array length ${actual} is less than minItems ${limit}`;
    }

    case 'maxItems': {
      const limit  = params['limit'] as number;
      const actual = Array.isArray(value) ? value.length : 0;
      return `array length ${actual} is greater than maxItems ${limit}`;
    }

    case 'minimum': {
      const limit = params['limit'] as number;
      return `${String(value)} is less than minimum ${limit}`;
    }

    case 'maximum': {
      const limit = params['limit'] as number;
      return `${String(value)} is greater than maximum ${limit}`;
    }

    case 'pattern': {
      const pattern = params['pattern'] as string;
      return `value "${String(value)}" does not match pattern ${pattern}`;
    }

    case 'enum': {
      const allowed = params['allowedValues'] as unknown[];
      return `expected one of [${allowed.join(', ')}], got ${String(value)}`;
    }

    default:
      return e.message ?? 'validation error';
  }
}

/**
 * Resolve the actual data value at the instancePath for an ajv error.
 * Used to produce legacy-style messages that reference the actual value.
 */
function resolveValue(root: unknown, instancePath: string): unknown {
  if (!instancePath) { return root; }
  const segments = instancePath.replace(/^\//, '').split('/');
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || current === undefined) { return undefined; }
    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[seg];
    } else if (Array.isArray(current)) {
      current = current[Number(seg)];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Cached validator wrapper backed by ajv.
 *
 * `compile()` cost is paid once per unique schema object (identity cache).
 * Subsequent `validate()` calls with the same schema object are O(1) lookup
 * + O(n) walk — no recompilation.
 *
 * Error messages are normalised to match the legacy hand-rolled validator
 * format so all existing test assertions continue to pass.
 */
export class Validator {
  private readonly ajv:   Ajv;
  private readonly cache: WeakMap<object, ValidateFunction>;

  constructor() {
    this.ajv   = makeAjv();
    this.cache = new WeakMap();
  }

  validate(schema: SchemaInterface, value: unknown): ValidationResultInterface {
    let fn = this.cache.get(schema);
    if (fn === undefined) {
      fn = this.ajv.compile(schema);
      this.cache.set(schema, fn);
    }

    const valid = fn(value);
    if (valid) {
      return { 'valid': true, 'errors': [] };
    }

    const errors: ValidationErrorInterface[] = (fn.errors ?? []).map((e) => {
      const params = e.params as Record<string, unknown>;
      const path   = normalisePath(e.instancePath, e.keyword, params);
      const actual = resolveValue(value, e.instancePath);
      const msg    = normaliseMessage(e, actual);
      return { 'path': path, 'message': msg };
    });

    return { 'valid': false, 'errors': errors };
  }

  /**
   * Attempt to compile a schema to verify it is well-formed.
   * Returns true if the schema compiles without error, false otherwise.
   */
  tryCompile(schema: SchemaInterface): boolean {
    try {
      this.ajv.compile(schema);
      return true;
    } catch {
      return false;
    }
  }
}

export const validator = new Validator();
