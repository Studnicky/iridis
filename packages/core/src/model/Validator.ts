import type { ErrorObject, ValidateFunction } from 'ajv';

import { SchemaValidator } from '@studnicky/json';

import type {
  SchemaInterfaceType,
  ValidationErrorInterfaceType,
  ValidationResultInterfaceType
} from '../types/index.ts';

import { ColorRecordSchema }  from './ColorRecordSchema.ts';
import { InputSchema }        from './InputSchema.ts';
import { PaletteStateSchema } from './PaletteStateSchema.ts';
import { PluginSchema }       from './PluginSchema.ts';
import { RoleSchemaSchema }   from './RoleSchemaSchema.ts';
import { TaskManifestSchema } from './TaskManifestSchema.ts';

/**
 * Pre-compiles the cross-referenced schemas against `SchemaValidator`'s
 * shared, process-wide Ajv singleton, so `$ref`s such as
 * `PaletteStateSchema.properties.colors.items` → `ColorRecordSchema` resolve
 * regardless of which schema is validated first.
 *
 * `SchemaValidator.compile()` is idempotent for a given schema object
 * reference (Ajv caches by identity), so re-running this for every
 * `new Validator()` is safe — it never re-registers or throws after the
 * first call. `ColorRecordSchema` is compiled first because
 * `PaletteStateSchema` `$ref`s it.
 */
class CrossReferenceRegistry {
  static ensure(): void {
    SchemaValidator.compile(ColorRecordSchema);
    SchemaValidator.compile(InputSchema);
    SchemaValidator.compile(PaletteStateSchema);
    SchemaValidator.compile(PluginSchema);
    SchemaValidator.compile(RoleSchemaSchema);
    SchemaValidator.compile(TaskManifestSchema);
  }
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
    const missing = params.missingProperty as string | undefined;
    if (missing !== undefined) {
      const base = instancePath.replace(/^\//, '').replace(/\//g, '.');
      return base.length > 0 ? `${base}.${missing}` : missing;
    }
  }

  if (instancePath === '') { return ''; }

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
 * Per-keyword ajv error formatters, normalising to the legacy hand-rolled
 * validator's message format so existing test assertions keep passing.
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
const MESSAGE_FORMATTERS: Record<string, (params: Record<string, unknown>, value: unknown) => string> = {
  'additionalProperties': (params) => {
    const result = `additional property "${params.additionalProperty as string}" is not allowed`;
    return result;
  },
  'enum': (params, value) => {
    const allowed = params.allowedValues as unknown[];
    return `expected one of [${allowed.join(', ')}], got ${String(value)}`;
  },
  'maximum': (params, value) => {
    const result = `${String(value)} is greater than maximum ${params.limit as number}`;
    return result;
  },
  'maxItems': (params, value) => {
    const actual = Array.isArray(value) ? value.length : 0;
    return `array length ${actual} is greater than maxItems ${params.limit as number}`;
  },
  'minimum': (params, value) => {
    const result = `${String(value)} is less than minimum ${params.limit as number}`;
    return result;
  },
  'minItems': (params, value) => {
    const actual = Array.isArray(value) ? value.length : 0;
    return `array length ${actual} is less than minItems ${params.limit as number}`;
  },
  'pattern': (params, value) => {
    const result = `value "${String(value)}" does not match pattern ${params.pattern as string}`;
    return result;
  },
  'required': (params) => {
    const result = `required property "${params.missingProperty as string}" is missing`;
    return result;
  },
  'type': (params, value) => {
    const expected = params.type as string | string[];
    const expectedStr = Array.isArray(expected) ? expected.join(' | ') : expected;
    let actual: string;
    if (value === null) { actual = 'null'; }
    else if (Array.isArray(value)) { actual = 'array'; }
    else { actual = typeof value; }
    return `expected ${expectedStr}, got ${actual}`;
  }
};

/**
 * Normalise an ajv error message to the legacy format the existing tests
 * expect via the per-keyword {@link MESSAGE_FORMATTERS} table.
 */
function normaliseMessage(
  e:     ErrorObject,
  value: unknown
): string {
  const params    = e.params as Record<string, unknown>;
  const formatter = MESSAGE_FORMATTERS[e.keyword];
  if (formatter !== undefined) { return formatter(params, value); }
  return e.message ?? 'validation error';
}

/**
 * Resolves the actual data value at the instancePath for an ajv error.
 * Used to produce legacy-style messages that reference the actual value.
 */
class Value {
  static resolve(root: unknown, instancePath: string): unknown {
    if (instancePath === '') { return root; }
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
}

/**
 * Cached validator wrapper backed by `@studnicky/json`'s `SchemaValidator`,
 * which compiles against a shared, process-wide Ajv singleton (2020-12,
 * strict mode). There is no per-instance Ajv scope: compiled schemas and
 * their `$id`s are visible to every `Validator` in the process, matching
 * `SchemaValidator`'s own public surface (static `compile()` only, no
 * instance/`addSchema` API). Two distinct schema objects that declare the
 * same `$id` and are compiled anywhere in the process will throw on the
 * second compile — see {@link Engine.adopt}'s `tryCompile` usage.
 *
 * `compile()` cost is paid once per unique schema object (identity cache).
 * Subsequent `validate()` calls with the same schema object are O(1) lookup
 * + O(n) walk — no recompilation.
 *
 * Error messages are normalised to match the legacy hand-rolled validator
 * format so all existing test assertions continue to pass.
 */
class ValidatorClass {
  readonly #cache: WeakMap<object, ValidateFunction>;

  constructor() {
    this.#cache = new WeakMap();
    CrossReferenceRegistry.ensure();
  }

  validate(schema: SchemaInterfaceType, value: unknown): ValidationResultInterfaceType {
    let fn = this.#cache.get(schema);
    if (fn === undefined) {
      fn = SchemaValidator.compile(schema);
      this.#cache.set(schema, fn);
    }

    const valid = fn(value);
    if (valid) {
      return { 'errors': [], 'valid': true };
    }

    const errors: ValidationErrorInterfaceType[] = (fn.errors ?? []).map((e) => {
      const params = e.params as Record<string, unknown>;
      const path   = normalisePath(e.instancePath, e.keyword, params);
      const actual = Value.resolve(value, e.instancePath);
      const msg    = normaliseMessage(e, actual);
      return { 'message': msg, 'path': path };
    });

    return { 'errors': errors, 'valid': false };
  }

  /**
   * Attempt to compile a schema to verify it is well-formed.
   * Returns true if the schema compiles without error, false otherwise.
   */
  tryCompile(schema: SchemaInterfaceType): boolean {
    try {
      SchemaValidator.compile(schema);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Cached validator wrapper backed by `SchemaValidator`'s shared Ajv
 * singleton. Re-exported as a const binding (rather than the `class`
 * keyword directly).
 */
export const Validator = ValidatorClass;
