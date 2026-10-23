import type { JsonSchemaObjectType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { JsonTology } from '@studnicky/json-tology';
import { JsonObject, JsonValue } from '@studnicky/types/node';
import { RE2JS } from 're2js';

import { ValidationErrorEntity } from '../entities/ValidationErrorEntity.ts';
import { CORE_ID_INDEX, CORE_SCHEMAS } from './constants/CoreSchemaRegistry.ts';
import { JSON_POINTER_PATTERNS }       from './constants/JsonPointerPatterns.ts';
import { JSON_SCHEMA_TYPE_NAMES }      from './constants/JsonSchemaTypeNames.ts';
import { UNSAFE_PATH_SEGMENTS }        from './constants/UnsafePathSegments.ts';

/**
 * Shared json-tology registry for the six core schemas, so `$ref`s such as
 * `PaletteStateSchema.properties.colors.items` → `ColorRecordSchema` resolve
 * regardless of which schema is validated first. Built once per process.
 */
class CoreRegistryState {
  'instance': ReturnType<typeof JsonTology.create<typeof CORE_SCHEMAS>> | undefined;
}

class CoreRegistry {
  static readonly #state = new CoreRegistryState();

  static ensure(): ReturnType<typeof JsonTology.create<typeof CORE_SCHEMAS>> {
    // enableStrictGraph: false — these schemas predate json-tology and author
    // constraints inline (e.g. ColorRecordSchema's oklch/rgb/displayP3 triples)
    // rather than as extracted, $id'd shapes. Validator only needs runtime
    // validation, not canonical-graph shape dedup.
    CoreRegistry.#state.instance ??= JsonTology.create({
      'baseIri': 'https://studnicky.dev/iridis',
      'enableStrictGraph': false,
      'schemas': CORE_SCHEMAS
    });

    return CoreRegistry.#state.instance;
  }
}

/**
 * Assigns a stable synthetic `$id` (by object identity) to schemas that
 * arrive without one — every ad-hoc/inline schema literal used by tests and
 * plugin-contributed schemas. json-tology requires a `$id` to register a
 * schema; this keeps that requirement invisible to callers of `Validator`.
 */
class SyntheticIdState {
  'counter' = 0;
  readonly 'ids': WeakMap<object, string> = new WeakMap();
}

class SyntheticId {
  static readonly #state = new SyntheticIdState();

  static assign(schema: JsonSchemaObjectType): JsonSchemaObjectType & { '$id': string } {
    if (typeof schema.$id === 'string') {
      const result = { ...schema, '$id': schema.$id };
      return result;
    }

    let id = SyntheticId.#state.ids.get(schema);
    if (id === undefined) {
      id = `urn:iridis:validator:${SyntheticId.#state.counter}`;
      SyntheticId.#state.counter += 1;
      SyntheticId.#state.ids.set(schema, id);
    }

    const result = { ...schema, '$id': id };
    return result;
  }
}

class JsonPointer {
  static segments(pointer: string): string[] | undefined {
    if (pointer === '') { return []; }
    if (!pointer.startsWith('/')) { return undefined; }

    const encodedSegments = pointer.slice(1).split('/');
    const segments: string[] = [];
    for (let index = 0; index < encodedSegments.length; index += 1) {
      const encoded = encodedSegments[index];
      if (encoded === undefined) {
        return undefined;
      }
      const decoded = JsonPointer.#decodeSegment(encoded);
      if (decoded === undefined) {
        return undefined;
      }
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

class JsonRecord {
  static from(value: JSONSchema7Type): Record<string, JSONSchema7Type> {
    if (JsonObject.is(value) && JsonValue.is(value)) {
      return value;
    }
    return {};
  }
}

class SchemaReference {
  static resolve(rootSchema: JsonSchemaObjectType, reference: string): (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined {
    const hashIndex = reference.indexOf('#');
    const documentId = hashIndex === -1 ? reference : reference.slice(0, hashIndex);
    const sourceDocument = SchemaReference.#document(rootSchema, documentId);
    const document = sourceDocument === undefined ? undefined : JsonValue.from(sourceDocument);
    const pointer = SchemaReference.#pointer(reference, hashIndex);
    const segments = pointer === undefined ? undefined : JsonPointer.segments(pointer);
    let result: (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined;
    if (JsonObject.is(document)) {
      if (hashIndex === -1 || hashIndex === reference.length - 1) {
        result = document;
      } else if (segments !== undefined) {
        result = SchemaReference.#walk(document, segments);
      }
    }
    return result;
  }

  static #pointer(reference: string, hashIndex: number): string | undefined {
    try {
      const result = decodeURIComponent(reference.slice(hashIndex + 1));
      return result;
    } catch {
      return undefined;
    }
  }

  static #walk(document: Readonly<Record<string, JSONSchema7Type>>, segments: readonly string[]): (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined {
    let current: JSONSchema7Type | undefined = document;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined || UNSAFE_PATH_SEGMENTS.has(segment)) { return undefined; }
      current = SchemaReference.#next(current, segment);
      if (current === undefined) { return undefined; }
    }
    const result = JsonObject.is(current) ? current : undefined;
    return result;
  }

  static #next(current: JSONSchema7Type | undefined, segment: string): JSONSchema7Type | undefined {
    if (Array.isArray(current)) {
      if (!JSON_POINTER_PATTERNS.digitsOnly.test(segment)) { return undefined; }
      const result = current[Number(segment)];
      return result;
    }
    if (JsonObject.is(current)) {
      const result = current[segment];
      return result;
    }
    return undefined;
  }

  static #document(rootSchema: JsonSchemaObjectType, documentId: string): JsonSchemaObjectType | undefined {
    const result = documentId === '' || documentId === rootSchema.$id ? rootSchema : CORE_ID_INDEX.get(documentId);
    return result;
  }
}

class SchemaPathSegment {
  readonly #append: (path: string, value: string) => string;
  readonly 'value': string;

  private constructor(value: string, append: (path: string, value: string) => string) {
    this.#append = append;
    this.value = value;
  }

  static arrayIndex(value: string): SchemaPathSegment {
    const result = new SchemaPathSegment(value, SchemaPathSegment.#appendArrayIndex);
    return result;
  }

  static property(value: string): SchemaPathSegment {
    const result = new SchemaPathSegment(value, SchemaPathSegment.#appendProperty);
    return result;
  }

  appendTo(path: string): string {
    const result = this.#append(path, this.value);
    return result;
  }

  static #appendArrayIndex(path: string, value: string): string {
    const result = `${path  }[${  value  }]`;
    return result;
  }

  static #appendProperty(path: string, value: string): string {
    const result = path === '' ? value : `${path  }.${  value}`;
    return result;
  }
}

class SchemaTrace {
  readonly 'node':     (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined;
  readonly 'segments': readonly SchemaPathSegment[];

  constructor(
    node:     (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined,
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
class SchemaWalkStep {
  readonly 'node': (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined;
  readonly 'segment': SchemaPathSegment;

  constructor(
    node: (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined,
    segment: SchemaPathSegment
  ) {
    this.node = node;
    this.segment = segment;
  }
}

/**
 * Resolves a JSON-Pointer validation-error path back to its subschema node.
 */
class SchemaWalker {
  static #deref(options: {
    readonly 'rootSchema': JsonSchemaObjectType;
    readonly 'schema': JSONSchema7Type | undefined;
    readonly 'visitedReferences'?: ReadonlySet<string>;
  }): (JSONSchema7Type & Readonly<Record<string, JSONSchema7Type>>) | undefined {
    const visitedReferences = new Set(options.visitedReferences);
    let result = options.schema;
    while (JsonObject.is(result) && typeof result.$ref === 'string') {
      const reference = result.$ref;
      if (visitedReferences.has(reference)) { return undefined; }
      visitedReferences.add(reference);
      result = SchemaReference.resolve(options.rootSchema, reference);
    }
    const dereferenced = JsonObject.is(result) ? result : undefined;
    return dereferenced;
  }

  static trace(rootSchema: JsonSchemaObjectType, path: string): SchemaTrace | undefined {
    let current = SchemaWalker.#deref({ 'rootSchema': rootSchema, 'schema': JsonValue.from(rootSchema) });
    if (path === '') {
      const result = new SchemaTrace(current, []);
      return result;
    }
    const segments = JsonPointer.segments(path);
    if (segments === undefined) { return undefined; }
    const tracedSegments: SchemaPathSegment[] = [];
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined || current === undefined) { return undefined; }
      const step = SchemaWalker.#nextStep(rootSchema, current, segment);
      if (step === undefined) { return undefined; }
      tracedSegments.push(step.segment);
      current = step.node;
    }
    const result = new SchemaTrace(current, tracedSegments);
    return result;
  }

  static #nextStep(
    rootSchema: JsonSchemaObjectType,
    current: Readonly<Record<string, JSONSchema7Type>>,
    segment: string
  ): SchemaWalkStep | undefined {
    const property = SchemaWalker.#propertyStep(rootSchema, current, segment);
    if (property !== undefined) { return property; }
    const pattern = SchemaWalker.#patternStep(rootSchema, current, segment);
    if (pattern !== undefined) { return pattern; }
    const item = SchemaWalker.#itemStep(rootSchema, current, segment);
    if (item !== undefined) { return item; }
    const additional = SchemaWalker.#additionalPropertyStep(rootSchema, current, segment);
    return additional;
  }

  static #propertyStep(
    rootSchema: JsonSchemaObjectType,
    current: Readonly<Record<string, JSONSchema7Type>>,
    segment: string
  ): SchemaWalkStep | undefined {
    const properties = JsonValue.from(current.properties);
    if (!JsonObject.is(properties)) { return undefined; }
    const schema = properties[segment];
    if (schema === undefined) { return undefined; }
    const node = SchemaWalker.#deref({ 'rootSchema': rootSchema, 'schema': JsonValue.from(schema) });
    const result = new SchemaWalkStep(node, SchemaPathSegment.property(segment));
    return result;
  }

  static #patternStep(
    rootSchema: JsonSchemaObjectType,
    current: Readonly<Record<string, JSONSchema7Type>>,
    segment: string
  ): SchemaWalkStep | undefined {
    const schema = SchemaWalker.#patternProperty(JsonValue.from(current.patternProperties), segment);
    if (schema === undefined) { return undefined; }
    const node = SchemaWalker.#deref({ 'rootSchema': rootSchema, 'schema': schema });
    const result = new SchemaWalkStep(node, SchemaPathSegment.property(segment));
    return result;
  }

  static #itemStep(
    rootSchema: JsonSchemaObjectType,
    current: Readonly<Record<string, JSONSchema7Type>>,
    segment: string
  ): SchemaWalkStep | undefined {
    if (!JSON_POINTER_PATTERNS.digitsOnly.test(segment) || !SchemaWalker.#isArraySchema(current)) {
      return undefined;
    }
    const index = Number(segment);
    const prefixItems = JsonValue.from(current.prefixItems);
    const schema = Array.isArray(prefixItems) && index < prefixItems.length
      ? prefixItems[index]
      : JsonValue.from(current.items);
    const node = SchemaWalker.#deref({ 'rootSchema': rootSchema, 'schema': schema });
    const result = new SchemaWalkStep(node, SchemaPathSegment.arrayIndex(segment));
    return result;
  }

  static #additionalPropertyStep(
    rootSchema: JsonSchemaObjectType,
    current: Readonly<Record<string, JSONSchema7Type>>,
    segment: string
  ): SchemaWalkStep {
    const schema = JsonValue.from(current.additionalProperties);
    const node = SchemaWalker.#deref({ 'rootSchema': rootSchema, 'schema': schema });
    const result = new SchemaWalkStep(node, SchemaPathSegment.property(segment));
    return result;
  }

  static #isArraySchema(schema: Readonly<Record<string, JSONSchema7Type>>): boolean {
    const schemaType = JsonValue.from(schema.type);
    const result = schemaType === 'array'
      || (Array.isArray(schemaType) && schemaType.includes('array'))
      || Object.hasOwn(schema, 'items')
      || Object.hasOwn(schema, 'prefixItems');
    return result;
  }

  static #patternProperty(patterns: JSONSchema7Type, property: string): JSONSchema7Type | undefined {
    if (!JsonObject.is(patterns)) { return undefined; }
    const entries = Object.entries(patterns);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) { return undefined; }
      const [pattern, schema] = entry;
      const matches = SchemaWalker.#matchesPattern(pattern, property);
      if (matches === undefined) { return undefined; }
      if (matches) {
        const result = JsonValue.from(schema);
        return result;
      }
    }
    return undefined;
  }

  static #matchesPattern(pattern: string, property: string): boolean | undefined {
    try {
      const result = RE2JS.compile(pattern).matcher(property).find();
      return result;
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
  static format(rootSchema: JsonSchemaObjectType, path: string): string {
    if (path === '') { return ''; }

    const trace = SchemaWalker.trace(rootSchema, path);
    if (trace === undefined) { return path; }
    let result = '';
    for (let index = 0; index < trace.segments.length; index += 1) {
      const segment = trace.segments[index];
      if (segment !== undefined) {
        result = segment.appendTo(result);
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
    rootSchema: JsonSchemaObjectType,
    path:       string,
    keyword:    string,
    parameters: Readonly<Record<string, JSONSchema7Type>>
  ): string {
    if (keyword === 'required') {
      const missing = parameters.missingProperty;
      if (typeof missing === 'string') {
        const base = Segments.format(rootSchema, path);
        const result = base.length > 0 ? `${base  }.${  missing}` : missing;
        return result;
      }
    }

    const result = Segments.format(rootSchema, path);
    return result;
  }
}

interface FormatterContextInterface {
  readonly 'parameters': Readonly<Record<string, JSONSchema7Type>>;
  readonly 'path': string;
  readonly 'rootSchema': JsonSchemaObjectType;
  readonly 'value': JSONSchema7Type | undefined;
}

class MessageFormatter {
  static format(keyword: string, context: FormatterContextInterface): string | undefined {
    const structural = MessageFormatter.#structural(keyword, context);
    if (structural !== undefined) { return structural; }
    const bounds = MessageFormatter.#bounds(keyword, context);
    if (bounds !== undefined) { return bounds; }
    const result = MessageFormatter.#pattern(keyword, context);
    return result;
  }

  static #structural(keyword: string, context: FormatterContextInterface): string | undefined {
    switch (keyword) {
      case 'additionalProperties': return MessageFormatter.#additionalProperties(context);
      case 'enum': return MessageFormatter.#enum(context);
      case 'required': return MessageFormatter.#required(context);
      case 'type': return MessageFormatter.#type(context);
      default: return undefined;
    }
  }

  static #bounds(keyword: string, context: FormatterContextInterface): string | undefined {
    switch (keyword) {
      case 'maximum': return MessageFormatter.#maximum(context);
      case 'maxItems': return MessageFormatter.#maxItems(context);
      case 'minimum': return MessageFormatter.#minimum(context);
      case 'minItems': return MessageFormatter.#minItems(context);
      default: return undefined;
    }
  }

  static #pattern(keyword: string, context: FormatterContextInterface): string | undefined {
    if (keyword !== 'pattern') { return undefined; }
    const result = MessageFormatter.#patternMessage(context);
    return result;
  }

  static #additionalProperties(context: FormatterContextInterface): string | undefined {
    const segments = JsonPointer.segments(context.path);
    const name = segments?.at(-1);
    if (name === undefined) { return undefined; }
    const result = `additional property "${  name  }" is not allowed`;
    return result;
  }

  static #enum(context: FormatterContextInterface): string | undefined {
    const node = SchemaWalker.trace(context.rootSchema, context.path)?.node;
    const allowed = JsonValue.from(node?.enum);
    if (!Array.isArray(allowed)) { return undefined; }
    const result = `expected one of [${  allowed.join(', ')  }], got ${  String(context.value)}`;
    return result;
  }

  static #maximum(context: FormatterContextInterface): string | undefined {
    const limit = SchemaWalker.trace(context.rootSchema, context.path)?.node?.maximum;
    if (typeof limit !== 'number') { return undefined; }
    const result = `${String(context.value)  } is greater than maximum ${  limit}`;
    return result;
  }

  static #maxItems(context: FormatterContextInterface): string | undefined {
    const limit = SchemaWalker.trace(context.rootSchema, context.path)?.node?.maxItems;
    if (typeof limit !== 'number') { return undefined; }
    const actual = Array.isArray(context.value) ? context.value.length : 0;
    const result = `array length ${  actual  } is greater than maxItems ${  limit}`;
    return result;
  }

  static #minimum(context: FormatterContextInterface): string | undefined {
    const limit = SchemaWalker.trace(context.rootSchema, context.path)?.node?.minimum;
    if (typeof limit !== 'number') { return undefined; }
    const result = `${String(context.value)  } is less than minimum ${  limit}`;
    return result;
  }

  static #minItems(context: FormatterContextInterface): string | undefined {
    const limit = SchemaWalker.trace(context.rootSchema, context.path)?.node?.minItems;
    if (typeof limit !== 'number') { return undefined; }
    const actual = Array.isArray(context.value) ? context.value.length : 0;
    const result = `array length ${  actual  } is less than minItems ${  limit}`;
    return result;
  }

  static #patternMessage(context: FormatterContextInterface): string | undefined {
    const pattern = SchemaWalker.trace(context.rootSchema, context.path)?.node?.pattern;
    if (typeof pattern !== 'string') { return undefined; }
    const result = `value "${  String(context.value)  }" does not match pattern ${  pattern}`;
    return result;
  }

  static #required(context: FormatterContextInterface): string | undefined {
    const missing = context.parameters.missingProperty;
    if (typeof missing !== 'string') { return undefined; }
    const result = `required property "${  missing  }" is missing`;
    return result;
  }

  static #type(context: FormatterContextInterface): string | undefined {
    const expected = context.parameters.type;
    if (typeof expected !== 'string' && !(Array.isArray(expected) && MessageFormatter.#typeNames(expected))) {
      return undefined;
    }
    const expectedString = Array.isArray(expected) ? expected.join(' | ') : expected;
    const actual = MessageFormatter.#valueType(context.value);
    const result = `expected ${  expectedString  }, got ${  actual}`;
    return result;
  }

  static #typeNames(values: readonly JSONSchema7Type[]): boolean {
    for (let index = 0; index < values.length; index += 1) {
      if (typeof values[index] !== 'string') { return false; }
    }
    return true;
  }

  static #valueType(value: JSONSchema7Type | undefined): string {
    if (value === null) { return 'null'; }
    if (Array.isArray(value)) { return 'array'; }
    const result = typeof value;
    return result;
  }
}

class MessageNormaliser {
  static normalise(
    keyword: string,
    parameters: Readonly<Record<string, JSONSchema7Type>>,
    path: string,
    value: JSONSchema7Type | undefined,
    message: string,
    rootSchema: JsonSchemaObjectType
  ): string {
    const formatted = MessageFormatter.format(keyword, {
      'parameters': parameters,
      'path': path,
      'rootSchema': rootSchema,
      'value': value
    });
    const result = formatted ?? message;
    return result;
  }
}

/**
 * Resolves the actual data value at the given JSON Pointer path.
 * Used to produce messages that reference the actual value.
 */
class Value {
  static resolve(root: JSONSchema7Type, path: string): JSONSchema7Type | undefined {
    const segments = JsonPointer.segments(path);
    let result: JSONSchema7Type | undefined = path === '' ? root : undefined;
    if (segments !== undefined) {
      result = root;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (segment === undefined || UNSAFE_PATH_SEGMENTS.has(segment)) {
          result = undefined;
          break;
        }
        result = Value.#next(result, segment);
        if (result === undefined) { break; }
      }
    }
    return result;
  }

  static #next(current: JSONSchema7Type | undefined, segment: string): JSONSchema7Type | undefined {
    if (JsonObject.is(current)) {
      const result = current[segment];
      return result;
    }
    if (Array.isArray(current)) {
      const result = current[Number(segment)];
      return result;
    }
    return undefined;
  }
}

/**
 * Drops own-enumerable keys whose value is `undefined`, recursively.
 *
 * `ColorRecordEntity` deliberately keeps `displayP3: undefined` /
 * `hints: undefined` present (rather than omitted) for V8 hidden-class
 * monomorphism (see `types/color.ts`). Ajv's compiled `properties` validators
 * treat a present-but-`undefined` key the same as an absent one; json-tology's
 * walk keys off `Object.keys()` and validates whatever is there, so an
 * `undefined` value fails an optional `type: object` property. Pruning before
 * validation restores the ajv-compatible "absent means absent" behaviour
 * without touching the caller's object.
 */
class UndefinedPruner {
  static prune<T>(value: T): JSONSchema7Type {
    let result: JSONSchema7Type;
    if (Array.isArray(value)) {
      result = UndefinedPruner.#array(value);
    } else if (JsonObject.is(value)) {
      result = UndefinedPruner.#object(value);
    } else {
      result = JsonValue.from(value);
    }
    return result;
  }

  static #array(values: readonly JSONSchema7Type[]): JSONSchema7Type[] {
    const result: JSONSchema7Type[] = [];
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value !== undefined) { result.push(UndefinedPruner.prune(value)); }
    }
    return result;
  }

  static #object(value: object): JSONSchema7Type {
    const result: Record<string, JSONSchema7Type> = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (key === undefined) { continue; }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor?.value === undefined) { continue; }
      if (JsonObject.is(descriptor.value)) {
        Object.defineProperty(result, key, {
          'configurable': true,
          'enumerable': true,
          'value': UndefinedPruner.#object(descriptor.value),
          'writable': true
        });
        continue;
      }
      if (!Array.isArray(descriptor.value) && !JsonValue.is(descriptor.value)) { continue; }
      Object.defineProperty(result, key, {
        'configurable': true,
        'enumerable': true,
        'value': UndefinedPruner.prune(descriptor.value),
        'writable': true
      });
    }
    return result;
  }
}

class SchemaObject {
  static is(value: JSONSchema7Type): value is JSONSchema7Type & JsonSchemaObjectType {
    const result = JsonObject.is(value) && JsonValue.is(value);
    return result;
  }
}

class TypeKeywordChecker {
  static isValid(node: JSONSchema7Type): boolean {
    if (typeof node === 'boolean') {
      const result = true;
      return result;
    }
    if (Array.isArray(node)) {
      const result = TypeKeywordChecker.#arrayValid(node);
      return result;
    }
    if (!JsonObject.is(node)) {
      const result = true;
      return result;
    }
    const result = TypeKeywordChecker.#objectValid(node);
    return result;
  }

  static #arrayValid(nodes: readonly JSONSchema7Type[]): boolean {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node === undefined || !TypeKeywordChecker.isValid(node)) { return false; }
    }
    return true;
  }

  static #objectValid(node: Readonly<Record<string, JSONSchema7Type>>): boolean {
    if (Object.hasOwn(node, 'type') && !TypeKeywordChecker.#validType(JsonValue.from(node.type))) { return false; }
    if (!TypeKeywordChecker.#directChildrenValid(node)) { return false; }
    if (!TypeKeywordChecker.#arrayChildrenValid(node)) { return false; }
    const result = TypeKeywordChecker.#mapChildrenValid(node);
    return result;
  }

  static #directChildrenValid(node: Readonly<Record<string, JSONSchema7Type>>): boolean {
    const values = [
      node.additionalProperties, node.contains, node.contentSchema, node.else, node.if, node.items,
      node.not, node.propertyNames, node.then, node.unevaluatedItems, node.unevaluatedProperties
    ];
    for (let index = 0; index < values.length; index += 1) {
      if (!TypeKeywordChecker.#childValid(values[index])) { return false; }
    }
    return true;
  }

  static #childValid(value: JSONSchema7Type | undefined): boolean {
    if (value === undefined) { return true; }
    const result = TypeKeywordChecker.isValid(value);
    return result;
  }

  static #arrayChildrenValid(node: Readonly<Record<string, JSONSchema7Type>>): boolean {
    const values = [node.allOf, node.anyOf, node.oneOf, node.prefixItems];
    for (let index = 0; index < values.length; index += 1) {
      const value = JsonValue.from(values[index]);
      if (Array.isArray(value) && !TypeKeywordChecker.#arrayValid(value)) { return false; }
    }
    return true;
  }

  static #mapChildrenValid(node: Readonly<Record<string, JSONSchema7Type>>): boolean {
    const values = [node.$defs, node.dependentSchemas, node.patternProperties, node.properties];
    for (let index = 0; index < values.length; index += 1) {
      const value = JsonValue.from(values[index]);
      if (JsonObject.is(value) && !TypeKeywordChecker.#mapValid(value)) { return false; }
    }
    return true;
  }

  static #mapValid(values: Readonly<Record<string, JSONSchema7Type>>): boolean {
    const children = Object.values(values);
    const result = TypeKeywordChecker.#arrayValid(children);
    return result;
  }

  static #validType(value: JSONSchema7Type): boolean {
    if (typeof value === 'string') {
      const result = JSON_SCHEMA_TYPE_NAMES.has(value);
      return result;
    }
    if (!Array.isArray(value) || value.length === 0) { return false; }
    const names = new Set<string>();
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index];
      if (typeof entry !== 'string' || !JSON_SCHEMA_TYPE_NAMES.has(entry) || names.has(entry)) { return false; }
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

  validate<T>(schema: JsonSchemaObjectType, value: T): { readonly 'errors': ValidationErrorEntity.Type[] } {
    const withId = SyntheticId.assign(schema);
    const pruned = value === undefined ? undefined : UndefinedPruner.prune(value);

    const errors = this.#jt.validate(withId, pruned);

    if (errors.length === 0) {
      return { 'errors': [] };
    }

    const mapped: ValidationErrorEntity.Type[] = errors.items.map((error) => {
      const parameters = JsonRecord.from(JsonValue.from(error.params));
      const normalisedPath = PathNormaliser.normalise(withId, error.path, error.keyword, parameters);
      const actual = pruned === undefined ? undefined : Value.resolve(pruned, error.path);
      const message = MessageNormaliser.normalise(error.keyword, parameters, error.path, actual, error.message, withId);
      const result = ValidationErrorEntity.create({ 'message': message, 'path': normalisedPath });
      return result;
    });

    return { 'errors': mapped };
  }

  /**
   * Attempt to compile a schema to verify it is well-formed.
   * Returns true if the schema compiles without error, false otherwise.
   */
  tryCompile(schema: JSONSchema7Type): schema is JSONSchema7Type & JsonSchemaObjectType {
    if (!SchemaObject.is(schema) || !TypeKeywordChecker.isValid(schema)) { return false; }

    try {
      this.validate(schema, undefined);
      return true;
    } catch {
      const result = false;
      return result;
    }
  }
}

/**
 * Cached validator wrapper backed by json-tology's shared registry.
 * Re-exported as a const binding (rather than the `class` keyword directly).
 */
export const Validator = ValidatorClass;
