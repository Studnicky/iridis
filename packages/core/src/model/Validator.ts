import { JsonTology } from '@studnicky/json-tology';

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

const CORE_SCHEMAS = [
  ColorRecordSchema,
  InputSchema,
  PaletteStateSchema,
  PluginSchema,
  RoleSchemaSchema,
  TaskManifestSchema
] as const;

const CORE_ID_INDEX = new Map<string, SchemaInterfaceType>(
  CORE_SCHEMAS.map((schema) => {return [schema.$id, schema];})
);

/**
 * Shared json-tology registry for the six core schemas, so `$ref`s such as
 * `PaletteStateSchema.properties.colors.items` → `ColorRecordSchema` resolve
 * regardless of which schema is validated first. Built once per process.
 */
class CoreRegistry {
  static #instance: ReturnType<typeof JsonTology.create<typeof CORE_SCHEMAS>> | undefined;

  static ensure(): ReturnType<typeof JsonTology.create<typeof CORE_SCHEMAS>> {
    // enableStrictGraph: false — these schemas predate json-tology and author
    // constraints inline (e.g. ColorRecordSchema's oklch/rgb/displayP3 triples)
    // rather than as extracted, $id'd shapes. Validator only needs runtime
    // validation, not canonical-graph shape dedup.
    CoreRegistry.#instance ??= JsonTology.create({
      'baseIri': 'https://studnicky.dev/iridis',
      'enableStrictGraph': false,
      'schemas': CORE_SCHEMAS
    });

    return CoreRegistry.#instance;
  }

  static isCore(schema: object): boolean {
    const result = (CORE_SCHEMAS as readonly object[]).includes(schema);
    return result;
  }
}

/**
 * Assigns a stable synthetic `$id` (by object identity) to schemas that
 * arrive without one — every ad-hoc/inline schema literal used by tests and
 * plugin-contributed schemas. json-tology requires a `$id` to register a
 * schema; this keeps that requirement invisible to callers of `Validator`.
 */
class SyntheticId {
  static #counter = 0;
  static #ids: WeakMap<object, string> = new WeakMap();

  static assign(schema: SchemaInterfaceType): SchemaInterfaceType & { '$id': string } {
    if (typeof schema.$id === 'string') {
      return schema as SchemaInterfaceType & { '$id': string };
    }

    let id = SyntheticId.#ids.get(schema);
    if (id === undefined) {
      id = `urn:iridis:validator:${SyntheticId.#counter++}`;
      SyntheticId.#ids.set(schema, id);
    }

    return { ...schema, '$id': id };
  }
}

/**
 * Resolves a JSON-Pointer validation-error path back to its subschema node.
 *
 * json-tology's compiled validators do not carry ajv-style `params` for
 * `minimum`/`maximum`/`minItems`/`maxItems`/`pattern`/`enum` (only `required`,
 * `type`, `dependentRequired`, `contentEncoding` and `contentMediaType` carry
 * real params) — the legacy message formatters need the constraint value
 * itself, so it is read directly off the schema at the failing path instead.
 */
class SchemaWalker {
  static #deref(schema: SchemaInterfaceType | undefined): SchemaInterfaceType | undefined {
    if (schema === undefined) { return undefined; }
    const ref = schema.$ref;
    if (typeof ref === 'string') { return CORE_ID_INDEX.get(ref); }
    return schema;
  }

  static resolve(rootSchema: SchemaInterfaceType, path: string): SchemaInterfaceType | undefined {
    let current = SchemaWalker.#deref(rootSchema);
    if (path === '') { return current; }

    const segments = path.replace(/^\//, '').split('/').map((seg) => { const result = seg.replace(/~1/g, '/').replace(/~0/g, '~'); return result; });

    for (const seg of segments) {
      if (current === undefined) { return undefined; }

      if (/^\d+$/.test(seg)) {
        current = SchemaWalker.#deref(current.items as SchemaInterfaceType | undefined);
        continue;
      }

      const properties = current.properties as Record<string, SchemaInterfaceType> | undefined;
      const propSchema = properties?.[seg];
      if (propSchema !== undefined) {
        current = SchemaWalker.#deref(propSchema);
        continue;
      }

      const additional = current.additionalProperties;
      current = typeof additional === 'object' && additional !== null
        ? SchemaWalker.#deref(additional as SchemaInterfaceType)
        : undefined;
    }

    return current;
  }
}

/**
 * Joins JSON-Pointer segments ("a/b/0") into the legacy dot/bracket path
 * ("a.b[0]"): the leading slash is dropped, digit-only segments become
 * "[N]", and every other segment is joined with ".".
 */
class Segments {
  static format(path: string): string {
    if (path === '') { return ''; }

    const segments = path.replace(/^\//, '').split('/');
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
}

/**
 * Normalise a JSON Pointer path ("/a/b/0") to the legacy format ("a.b[0]").
 *
 * The legacy hand-rolled validator used dot-separated paths with bracket
 * notation for array indices (e.g. "color.hex", "items[1]"). Tests assert
 * against this format, so we preserve it here. The "required" keyword's
 * path points at the parent (the object missing the property), so its
 * segments go through the same {@link Segments.format} bracket-index
 * transform as every other keyword before the missing property name is
 * appended — an array parent therefore reads "colors[0].oklch", consistent
 * with a sibling type error's "colors[0].hex".
 */
function normalisePath(path: string, keyword: string, params: Record<string, unknown>): string {
  if (keyword === 'required') {
    const missing = params.missingProperty as string | undefined;
    if (missing !== undefined) {
      const base = Segments.format(path);
      return base.length > 0 ? `${base}.${missing}` : missing;
    }
  }

  return Segments.format(path);
}

interface FormatterContextInterface {
  readonly 'params':     Record<string, unknown>;
  readonly 'path':        string;
  readonly 'rootSchema': SchemaInterfaceType;
  readonly 'value':       unknown;
}

/**
 * Per-keyword error formatters, normalising json-tology's validation errors
 * to the legacy hand-rolled validator's message format so existing test
 * assertions keep passing.
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
const MESSAGE_FORMATTERS: Record<string, (ctx: FormatterContextInterface) => string> = {
  'additionalProperties': (ctx) => {
    const segments = ctx.path.replace(/^\//, '').split('/');
    const name = segments[segments.length - 1] ?? '';
    return `additional property "${name}" is not allowed`;
  },
  'enum': (ctx) => {
    const node = SchemaWalker.resolve(ctx.rootSchema, ctx.path);
    const allowed = (node?.enum as unknown[] | undefined) ?? [];
    return `expected one of [${allowed.join(', ')}], got ${String(ctx.value)}`;
  },
  'maximum': (ctx) => {
    const node = SchemaWalker.resolve(ctx.rootSchema, ctx.path);
    const limit = (node?.maximum as number | undefined) ?? 0;
    return `${String(ctx.value)} is greater than maximum ${limit}`;
  },
  'maxItems': (ctx) => {
    const node = SchemaWalker.resolve(ctx.rootSchema, ctx.path);
    const limit = (node?.maxItems as number | undefined) ?? 0;
    const actual = Array.isArray(ctx.value) ? ctx.value.length : 0;
    return `array length ${actual} is greater than maxItems ${limit}`;
  },
  'minimum': (ctx) => {
    const node = SchemaWalker.resolve(ctx.rootSchema, ctx.path);
    const limit = (node?.minimum as number | undefined) ?? 0;
    return `${String(ctx.value)} is less than minimum ${limit}`;
  },
  'minItems': (ctx) => {
    const node = SchemaWalker.resolve(ctx.rootSchema, ctx.path);
    const limit = (node?.minItems as number | undefined) ?? 0;
    const actual = Array.isArray(ctx.value) ? ctx.value.length : 0;
    return `array length ${actual} is less than minItems ${limit}`;
  },
  'pattern': (ctx) => {
    const node = SchemaWalker.resolve(ctx.rootSchema, ctx.path);
    const pattern = (node?.pattern as string | undefined) ?? '';
    return `value "${String(ctx.value)}" does not match pattern ${pattern}`;
  },
  'required': (ctx) => {
    const result = `required property "${ctx.params.missingProperty as string}" is missing`;
    return result;
  },
  'type': (ctx) => {
    const expected = ctx.params.type as string | string[];
    const expectedStr = Array.isArray(expected) ? expected.join(' | ') : expected;
    let actual: string;
    if (ctx.value === null) { actual = 'null'; }
    else if (Array.isArray(ctx.value)) { actual = 'array'; }
    else { actual = typeof ctx.value; }
    return `expected ${expectedStr}, got ${actual}`;
  }
};

/**
 * Normalise a json-tology validation error message to the legacy format the
 * existing tests expect via the per-keyword {@link MESSAGE_FORMATTERS} table.
 */
function normaliseMessage(
  keyword:    string,
  params:     Record<string, unknown>,
  path:       string,
  value:      unknown,
  message:    string,
  rootSchema: SchemaInterfaceType
): string {
  const formatter = MESSAGE_FORMATTERS[keyword];
  if (formatter !== undefined) {
    return formatter({ 'params': params, 'path': path, 'rootSchema': rootSchema, 'value': value });
  }
  return message;
}

/**
 * Resolves the actual data value at the given JSON Pointer path.
 * Used to produce legacy-style messages that reference the actual value.
 */
class Value {
  static resolve(root: unknown, path: string): unknown {
    if (path === '') { return root; }
    const segments = path.replace(/^\//, '').split('/');
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
 * Drops own-enumerable keys whose value is `undefined`, recursively.
 *
 * `ColorRecordInterfaceType` deliberately keeps `displayP3: undefined` /
 * `hints: undefined` present (rather than omitted) for V8 hidden-class
 * monomorphism (see `types/color.ts`). Ajv's compiled `properties` validators
 * treat a present-but-`undefined` key the same as an absent one; json-tology's
 * walk keys off `Object.keys()` and validates whatever is there, so an
 * `undefined` value fails an optional `type: object` property. Pruning before
 * validation restores the ajv-compatible "absent means absent" behaviour
 * without touching the caller's object.
 */
class UndefinedPruner {
  static prune(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => { const result = UndefinedPruner.prune(item); return result; });
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, entryValue] of Object.entries(value)) {
        if (entryValue !== undefined) {
          result[key] = UndefinedPruner.prune(entryValue);
        }
      }
      return result;
    }

    return value;
  }
}

const JSON_SCHEMA_TYPE_NAMES = new Set([
  'array', 'boolean', 'integer', 'null', 'number', 'object', 'string'
]);

/**
 * Recursively checks that every `type` keyword in a schema tree names a real
 * JSON Schema primitive.
 *
 * json-tology validates permissively: an unrecognised `type` value (e.g. a
 * typo) simply never matches anything at runtime rather than being rejected
 * as a malformed schema at registration time — unlike ajv's strict mode,
 * which rejects it up front. `tryCompile` needs that up-front rejection, so
 * it is reimplemented here for the one keyword this codebase's schemas rely
 * on ajv strict mode for.
 */
class TypeKeywordChecker {
  static isValid(node: unknown): boolean {
    if (Array.isArray(node)) {
      return node.every((entry) => { const result = TypeKeywordChecker.isValid(entry); return result; });
    }

    if (typeof node !== 'object' || node === null) { return true; }

    const record = node as Record<string, unknown>;
    const type = record.type;
    if (typeof type === 'string' && !JSON_SCHEMA_TYPE_NAMES.has(type)) { return false; }
    if (Array.isArray(type) && !type.every((t) => {return typeof t === 'string' && JSON_SCHEMA_TYPE_NAMES.has(t);})) {
      return false;
    }

    for (const [key, value] of Object.entries(record)) {
      if (key === 'type') { continue; }
      if (!TypeKeywordChecker.isValid(value)) { return false; }
    }

    return true;
  }
}

/**
 * Cached validator wrapper backed by json-tology. The six core schemas
 * (`ColorRecordSchema`, `InputSchema`, `PaletteStateSchema`, `PluginSchema`,
 * `RoleSchemaSchema`, `TaskManifestSchema`) share one process-wide
 * `JsonTology` registry, built once via {@link CoreRegistry}, so their
 * cross-`$ref`s resolve. Every other schema — ad-hoc test literals,
 * plugin-contributed schemas, `CliConfigSchema`, `DerivationParamsSchema` —
 * is registered onto the same shared registry lazily, keyed by object
 * identity, the first time it is validated; subsequent validations reuse the
 * registration by passing the schema's `$id` string rather than re-`set()`ing
 * the object, mirroring the previous ajv-backed identity cache.
 *
 * Error messages are normalised to match the legacy hand-rolled validator
 * format so all existing test assertions continue to pass.
 */
class ValidatorClass {
  readonly #jt: ReturnType<typeof JsonTology.create<typeof CORE_SCHEMAS>>;

  constructor() {
    this.#jt = CoreRegistry.ensure();
  }

  validate(schema: SchemaInterfaceType, value: unknown): ValidationResultInterfaceType {
    const isCore = CoreRegistry.isCore(schema);
    const withId = SyntheticId.assign(schema);
    const pruned = UndefinedPruner.prune(value);

    // Core schemas are pre-registered once by CoreRegistry.ensure(); look up by
    // $id to avoid re-registering on every call. Every other schema (ad-hoc
    // test literals, plugin-contributed schemas, CliConfigSchema,
    // DerivationParamsSchema) registers-and-validates in one call — cheap for
    // the small schemas this codebase validates, and idempotent by identity.
    const errors = isCore
      ? this.#jt.validate((withId as unknown as { readonly '$id': typeof CORE_SCHEMAS[number]['$id'] }).$id, pruned)
      : this.#jt.validate(withId, pruned);

    if (errors.length === 0) {
      return { 'errors': [], 'valid': true };
    }

    const mapped: ValidationErrorInterfaceType[] = errors.items.map((e) => {
      const legacyPath = normalisePath(e.path, e.keyword, e.params);
      const actual     = Value.resolve(value, e.path);
      const msg        = normaliseMessage(e.keyword, e.params, e.path, actual, e.message, withId);
      return { 'message': msg, 'path': legacyPath };
    });

    return { 'errors': mapped, 'valid': false };
  }

  /**
   * Attempt to compile a schema to verify it is well-formed.
   * Returns true if the schema compiles without error, false otherwise.
   */
  tryCompile(schema: SchemaInterfaceType): boolean {
    if (!TypeKeywordChecker.isValid(schema)) { return false; }

    try {
      this.validate(schema, undefined);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Cached validator wrapper backed by json-tology's shared registry.
 * Re-exported as a const binding (rather than the `class` keyword directly).
 */
export const Validator = ValidatorClass;
