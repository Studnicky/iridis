import { JsonTology } from '@studnicky/json-tology';
import {
  JsonObject,
  type JsonObjectType,
  JsonValue,
  type JsonValueType
} from '@studnicky/types';
import { RE2JS } from 're2js';

import type {
  SchemaInterfaceType,
  ValidationErrorInterfaceType,
  ValidationResultInterfaceType
} from '../types/index.ts';

import { CORE_ID_INDEX, CORE_SCHEMAS } from './constants/CoreSchemaRegistry.ts';
import { JSON_POINTER_PATTERNS }       from './constants/JsonPointerPatterns.ts';
import { JSON_SCHEMA_TYPE_NAMES }      from './constants/JsonSchemaTypeNames.ts';
import { UNSAFE_PATH_SEGMENTS }        from './constants/UnsafePathSegments.ts';

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
      return { ...schema, '$id': schema.$id };
    }

    let id = SyntheticId.#ids.get(schema);
    if (id === undefined) {
      id = `urn:iridis:validator:${SyntheticId.#counter++}`;
      SyntheticId.#ids.set(schema, id);
    }

    return { ...schema, '$id': id };
  }
}

class JsonPointer {
  static segments(pointer: string): string[] | undefined {
    if (pointer === '') { return []; }
    if (!pointer.startsWith('/')) { return undefined; }

    const segments: string[] = [];
    for (const encoded of pointer.slice(1).split('/')) {
      const decoded = JsonPointer.#decodeSegment(encoded);
      if (decoded === undefined) { return undefined; }
      segments.push(decoded);
    }
    return segments;
  }

  static #decodeSegment(segment: string): string | undefined {
    let result = '';
    const length = segment.length;
    for (let index = 0; index < length; index += 1) {
      const character = segment[index];
      if (character !== '~') {
        result += character;
        continue;
      }

      const escaped = segment[index + 1];
      if (escaped === '0') { result += '~'; }
      else if (escaped === '1') { result += '/'; }
      else { return undefined; }
      index += 1;
    }
    return result;
  }
}

class SchemaReference {
  static resolve(
    rootSchema: SchemaInterfaceType,
    reference:  string
  ): (JsonValueType & Readonly<JsonObjectType>) | undefined {
    const hashIndex = reference.indexOf('#');
    const documentId = hashIndex === -1 ? reference : reference.slice(0, hashIndex);
    const sourceDocument = SchemaReference.#document(rootSchema, documentId);
    if (sourceDocument === undefined) { return undefined; }
    const document = JsonValue.from(sourceDocument);
    if (!JsonObject.is(document)) { return undefined; }
    if (hashIndex === -1 || hashIndex === reference.length - 1) { return document; }

    let pointer: string;
    try {
      pointer = decodeURIComponent(reference.slice(hashIndex + 1));
    } catch {
      return undefined;
    }
    const segments = JsonPointer.segments(pointer);
    if (segments === undefined) { return undefined; }

    let current: JsonValueType | undefined = document;
    for (const segment of segments) {
      // Guard against prototype-chain confusion: without this, a segment of
      // "__proto__", "constructor", or "prototype" would resolve into
      // Object.prototype (or a constructor function) instead of failing the
      // walk, since a plain, non-null, non-array object satisfies `JsonObject.is`.
      if (UNSAFE_PATH_SEGMENTS.has(segment)) { return undefined; }
      if (Array.isArray(current)) {
        if (!JSON_POINTER_PATTERNS.digitsOnly.test(segment)) { return undefined; }
        const next: JsonValueType | undefined = current[Number(segment)];
        current = next;
      } else if (JsonObject.is(current)) {
        const next: JsonValueType | undefined = current[segment];
        current = next;
      } else {
        return undefined;
      }
    }
    return JsonObject.is(current) ? current : undefined;
  }

  static #document(
    rootSchema: SchemaInterfaceType,
    documentId: string
  ): SchemaInterfaceType | undefined {
    if (documentId === '' || documentId === rootSchema.$id) {
      return rootSchema;
    }
    return CORE_ID_INDEX.get(documentId);
  }
}

class SchemaPathSegment {
  readonly 'arrayIndex': boolean;
  readonly 'value':      string;

  constructor(arrayIndex: boolean, value: string) {
    this.arrayIndex = arrayIndex;
    this.value = value;
  }
}

class SchemaTrace {
  readonly 'node':     (JsonValueType & Readonly<JsonObjectType>) | undefined;
  readonly 'segments': readonly SchemaPathSegment[];

  constructor(
    node:     (JsonValueType & Readonly<JsonObjectType>) | undefined,
    segments: readonly SchemaPathSegment[]
  ) {
    this.node = node;
    this.segments = segments;
  }
}

/**
 * Resolves a JSON-Pointer validation-error path back to its subschema node.
 *
 * json-tology's compiled validators do not carry structured `params` for
 * `minimum`/`maximum`/`minItems`/`maxItems`/`pattern`/`enum` (only `required`,
 * `type`, `dependentRequired`, `contentEncoding` and `contentMediaType` carry
 * structured params). Canonical diagnostics therefore read the constraint
 * directly from the schema at the failing path.
 */
class SchemaWalker {
  static #deref(
    rootSchema: SchemaInterfaceType,
    schema:     JsonValueType | undefined,
    references: ReadonlySet<string> = new Set()
  ): (JsonValueType & Readonly<JsonObjectType>) | undefined {
    if (!JsonObject.is(schema)) { return undefined; }
    const reference = schema.$ref;
    if (typeof reference !== 'string') { return schema; }
    if (references.has(reference)) { return undefined; }
    const target = SchemaReference.resolve(rootSchema, reference);
    if (target === undefined) { return undefined; }
    return SchemaWalker.#deref(rootSchema, target, new Set([...references, reference]));
  }

  static trace(rootSchema: SchemaInterfaceType, path: string): SchemaTrace | undefined {
    let current = SchemaWalker.#deref(rootSchema, JsonValue.from(rootSchema));
    if (path === '') { return new SchemaTrace(current, []); }

    const segments = JsonPointer.segments(path);
    if (segments === undefined) { return undefined; }
    const tracedSegments: SchemaPathSegment[] = [];

    for (const segment of segments) {
      if (current === undefined) { return undefined; }

      const rawProperties = JsonValue.from(current.properties);
      const properties = JsonObject.is(rawProperties) ? rawProperties : undefined;
      const propertySchema = properties?.[segment];
      if (propertySchema !== undefined) {
        tracedSegments.push(new SchemaPathSegment(false, segment));
        current = SchemaWalker.#deref(rootSchema, JsonValue.from(propertySchema));
        continue;
      }

      const patternSchema = SchemaWalker.#patternProperty(JsonValue.from(current.patternProperties), segment);
      if (patternSchema !== undefined) {
        tracedSegments.push(new SchemaPathSegment(false, segment));
        current = SchemaWalker.#deref(rootSchema, patternSchema);
        continue;
      }

      if (JSON_POINTER_PATTERNS.digitsOnly.test(segment) && SchemaWalker.#isArraySchema(current)) {
        const index = Number(segment);
        const prefixItems = JsonValue.from(current.prefixItems);
        const itemSchema = Array.isArray(prefixItems) && index < prefixItems.length
          ? prefixItems[index]
          : JsonValue.from(current.items);
        tracedSegments.push(new SchemaPathSegment(true, segment));
        current = SchemaWalker.#deref(rootSchema, itemSchema);
        continue;
      }

      const additional = JsonValue.from(current.additionalProperties);
      tracedSegments.push(new SchemaPathSegment(false, segment));
      current = SchemaWalker.#deref(rootSchema, additional);
    }

    return new SchemaTrace(current, tracedSegments);
  }

  static #isArraySchema(schema: Readonly<JsonObjectType>): boolean {
    const schemaType = JsonValue.from(schema.type);
    return schemaType === 'array'
      || (Array.isArray(schemaType) && schemaType.includes('array'))
      || Object.hasOwn(schema, 'items')
      || Object.hasOwn(schema, 'prefixItems');
  }

  static #patternProperty(patterns: JsonValueType, property: string): JsonValueType | undefined {
    if (!JsonObject.is(patterns)) { return undefined; }
    for (const [pattern, schema] of Object.entries(patterns)) {
      const matches = SchemaWalker.#matchesPattern(pattern, property);
      if (matches === undefined) { return undefined; }
      if (matches) { return JsonValue.from(schema); }
    }
    return undefined;
  }

  /**
   * Reports whether `property` matches a `patternProperties` key, or
   * `undefined` when the key is not a regular expression this engine accepts.
   *
   * `pattern` is a schema value, and `@studnicky/iridis` is a published
   * library whose `model` subpath is part of its public surface, so a
   * consumer or an adopted plugin can supply the schema. Evaluating that with
   * the platform `RegExp` would put a caller-supplied pattern on a
   * backtracking engine, where a crafted key stalls the thread. RE2 matches
   * in time linear to the input and has no catastrophic-backtracking case, so
   * the failure mode does not exist rather than being argued about.
   *
   * The tradeoff is that RE2 rejects backreferences and lookaround, which
   * ECMA-262 allows. Such a key raises here and reads as "no opinion", the
   * same as any other unparseable pattern.
   */
  static #matchesPattern(pattern: string, property: string): boolean | undefined {
    try {
      return RE2JS.compile(pattern).matcher(property).find();
    } catch {
      return undefined;
    }
  }
}

/**
 * Joins JSON-Pointer segments ("a/b/0") into the public dot/bracket path.
 * Segments traversed through array-item schemas become "[N]"; object
 * property names, including digit-only names, remain dot-joined.
 */
class Segments {
  static format(rootSchema: SchemaInterfaceType, path: string): string {
    if (path === '') { return ''; }

    const trace = SchemaWalker.trace(rootSchema, path);
    if (trace === undefined) { return path; }
    let result = '';
    for (const segment of trace.segments) {
      if (segment.arrayIndex) {
        result += `[${segment.value}]`;
      } else {
        result += result === '' ? segment.value : `.${segment.value}`;
      }
    }
    return result;
  }
}

/**
 * Normalise a JSON Pointer path ("/a/b/0") to the public format ("a.b[0]").
 * The "required" keyword's path points at the parent object, so its
 * segments go through the same {@link Segments.format} bracket-index
 * transform as every other keyword before the missing property name is
 * appended — an array parent therefore reads "colors[0].oklch", consistent
 * with a sibling type error's "colors[0].hex".
 */
class PathNormaliser {
  static normalise(
    rootSchema: SchemaInterfaceType,
    path:       string,
    keyword:    string,
    parameters: Readonly<JsonObjectType>
  ): string {
    if (keyword === 'required') {
      const missing = parameters.missingProperty;
      if (typeof missing === 'string') {
        const base = Segments.format(rootSchema, path);
        return base.length > 0 ? `${base}.${missing}` : missing;
      }
    }

    return Segments.format(rootSchema, path);
  }
}

interface FormatterContextInterface {
  readonly 'params':     Readonly<JsonObjectType>;
  readonly 'path':        string;
  readonly 'rootSchema': SchemaInterfaceType;
  readonly 'value':       JsonValueType | undefined;
}

/**
 * Per-keyword error formatters for the Validator's public diagnostic format.
 *
 * Messages:
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
const MESSAGE_FORMATTERS: Record<string, (context: FormatterContextInterface) => string | undefined> = {
  'additionalProperties': (context) => {
    const segments = JsonPointer.segments(context.path);
    const name = segments?.at(-1);
    if (name === undefined) { return undefined; }
    return `additional property "${name}" is not allowed`;
  },
  'enum': (context) => {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const allowed = JsonValue.from(node?.enum);
    if (!Array.isArray(allowed)) { return undefined; }
    return `expected one of [${allowed.join(', ')}], got ${String(context.value)}`;
  },
  'maximum': (context) => {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const limit = node?.maximum;
    if (typeof limit !== 'number') { return undefined; }
    return `${String(context.value)} is greater than maximum ${limit}`;
  },
  'maxItems': (context) => {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const limit = node?.maxItems;
    if (typeof limit !== 'number') { return undefined; }
    const actual = Array.isArray(context.value) ? context.value.length : 0;
    return `array length ${actual} is greater than maxItems ${limit}`;
  },
  'minimum': (context) => {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const limit = node?.minimum;
    if (typeof limit !== 'number') { return undefined; }
    return `${String(context.value)} is less than minimum ${limit}`;
  },
  'minItems': (context) => {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const limit = node?.minItems;
    if (typeof limit !== 'number') { return undefined; }
    const actual = Array.isArray(context.value) ? context.value.length : 0;
    return `array length ${actual} is less than minItems ${limit}`;
  },
  'pattern': (context) => {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const pattern = node?.pattern;
    if (typeof pattern !== 'string') { return undefined; }
    return `value "${String(context.value)}" does not match pattern ${pattern}`;
  },
  'required': (context) => {
    const missing = context.params.missingProperty;
    if (typeof missing !== 'string') { return undefined; }
    const result = `required property "${missing}" is missing`;
    return result;
  },
  'type': (context) => {
    const expected = context.params.type;
    if (
      typeof expected !== 'string'
      && !(Array.isArray(expected) && expected.every((entry) => { return typeof entry === 'string'; }))
    ) {
      return undefined;
    }
    const expectedString = Array.isArray(expected) ? expected.join(' | ') : expected;
    let actual: string;
    if (context.value === null) { actual = 'null'; }
    else if (Array.isArray(context.value)) { actual = 'array'; }
    else { actual = typeof context.value; }
    return `expected ${expectedString}, got ${actual}`;
  }
};

/**
 * Normalise a json-tology validation error through the per-keyword
 * {@link MESSAGE_FORMATTERS} table.
 */
class MessageNormaliser {
  static normalise(
    keyword:    string,
    parameters: Readonly<JsonObjectType>,
    path:       string,
    value:      JsonValueType | undefined,
    message:    string,
    rootSchema: SchemaInterfaceType
  ): string {
    const formatter = MESSAGE_FORMATTERS[keyword];
    if (formatter !== undefined) {
      const formatted = formatter({ 'params': parameters, 'path': path, 'rootSchema': rootSchema, 'value': value });
      if (formatted !== undefined) { return formatted; }
    }
    return message;
  }
}

/**
 * Resolves the actual data value at the given JSON Pointer path.
 * Used to produce messages that reference the actual value.
 */
class Value {
  static resolve(root: JsonValueType, path: string): JsonValueType | undefined {
    if (path === '') { return root; }
    const segments = JsonPointer.segments(path);
    if (segments === undefined) { return undefined; }
    let current: JsonValueType | undefined = root;
    for (const segment of segments) {
      if (current === null || current === undefined) { return undefined; }
      // See the matching guard in `SchemaReference.resolve` above: rejects
      // "__proto__"/"constructor"/"prototype" before they can read through
      // to the prototype chain.
      if (UNSAFE_PATH_SEGMENTS.has(segment)) { return undefined; }
      if (JsonObject.is(current)) {
        const next: JsonValueType | undefined = current[segment];
        current = next;
      } else if (Array.isArray(current)) {
        const next: JsonValueType | undefined = current[Number(segment)];
        current = next;
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
  static prune<T>(value: T): JsonValueType {
    if (Array.isArray(value)) {
      return value.map(UndefinedPruner.prune);
    }

    if (JsonObject.is(value)) {
      const entries = Object.entries(value);
      const result: Record<string, JsonValueType> = {};
      for (const [key, entryValue] of entries) {
        if (entryValue !== undefined) {
          result[key] = UndefinedPruner.prune(entryValue);
        }
      }
      return result;
    }

    return JsonValue.from(value);
  }
}

/**
 * Recursively checks that every `type` keyword in a schema tree names a real
 * JSON Schema primitive.
 *
 * json-tology treats an unrecognised `type` value as an unconstrained schema.
 * `tryCompile` rejects malformed type keywords before registration instead.
 */
class TypeKeywordChecker {
  static readonly #arrayKeywords = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
  static readonly #directKeywords = [
    'additionalProperties', 'contains', 'contentSchema', 'else', 'if', 'items', 'not',
    'propertyNames', 'then', 'unevaluatedItems', 'unevaluatedProperties'
  ];
  static readonly #mapKeywords = ['$defs', 'dependentSchemas', 'patternProperties', 'properties'];

  static isValid(node: JsonValueType): boolean {
    if (typeof node === 'boolean') { return true; }
    if (Array.isArray(node)) {
      return node.every((entry) => { const result = TypeKeywordChecker.isValid(entry); return result; });
    }

    if (!JsonObject.is(node)) { return true; }

    if (Object.hasOwn(node, 'type') && !TypeKeywordChecker.#validType(JsonValue.from(node.type))) {
      return false;
    }

    for (const keyword of TypeKeywordChecker.#directKeywords) {
      if (!TypeKeywordChecker.isValid(JsonValue.from(node[keyword]))) { return false; }
    }
    for (const keyword of TypeKeywordChecker.#arrayKeywords) {
      const children = node[keyword];
      const jsonChildren = JsonValue.from(children);
      if (Array.isArray(jsonChildren) && !jsonChildren.every(TypeKeywordChecker.isValid)) { return false; }
    }
    for (const keyword of TypeKeywordChecker.#mapKeywords) {
      const children = JsonValue.from(node[keyword]);
      if (
        JsonObject.is(children)
        && !TypeKeywordChecker.#mapChildrenValid(children)
      ) {
        return false;
      }
    }

    return true;
  }

  static #mapChildrenValid(children: JsonObjectType): boolean {
    for (const child of Object.values(children)) {
      if (!TypeKeywordChecker.isValid(JsonValue.from(child))) { return false; }
    }
    return true;
  }

  static #validType(value: JsonValueType): boolean {
    if (typeof value === 'string') { return JSON_SCHEMA_TYPE_NAMES.has(value); }
    if (!Array.isArray(value) || value.length === 0) { return false; }

    const names = new Set<string>();
    for (const entry of value) {
      if (
        typeof entry !== 'string'
        || !JSON_SCHEMA_TYPE_NAMES.has(entry)
        || names.has(entry)
      ) {
        return false;
      }
      names.add(entry);
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
 * identity and receives a stable synthetic `$id` when needed.
 *
 * Error messages use the Validator's public dot/bracket path and message
 * format.
 */
class ValidatorClass {
  readonly #jt: ReturnType<typeof JsonTology.create<typeof CORE_SCHEMAS>>;

  constructor() {
    this.#jt = CoreRegistry.ensure();
  }

  validate<T>(schema: SchemaInterfaceType, value: T): ValidationResultInterfaceType {
    const withId = SyntheticId.assign(schema);
    const pruned = value === undefined ? undefined : UndefinedPruner.prune(value);

    const errors = this.#jt.validate(withId, pruned);

    if (errors.length === 0) {
      return { 'errors': [], 'valid': true };
    }

    const mapped: ValidationErrorInterfaceType[] = errors.items.map((error) => {
      const normalisedPath = PathNormaliser.normalise(withId, error.path, error.keyword, error.params);
      const actual = pruned === undefined ? undefined : Value.resolve(pruned, error.path);
      const message = MessageNormaliser.normalise(error.keyword, error.params, error.path, actual, error.message, withId);
      return { 'message': message, 'path': normalisedPath };
    });

    return { 'errors': mapped, 'valid': false };
  }

  /**
   * Attempt to compile a schema to verify it is well-formed.
   * Returns true if the schema compiles without error, false otherwise.
   */
  tryCompile(schema: SchemaInterfaceType): boolean {
    if (!TypeKeywordChecker.isValid(JsonValue.from(schema))) { return false; }

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
