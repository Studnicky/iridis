import type { ColorRecordEntity } from '@studnicky/iridis';
import type { CvdMatrixEntity } from '@studnicky/iridis-contrast/types';
import type { PaletteStateInterface } from '@studnicky/iridis/types';
import type { JSONSchema7Object } from 'json-schema';

import {
  clamp01,
  colorRecordFactory,
  ContrastOptionsEntity,
  contrastWcag21,
  coreTasks,
  Engine,
  InputEntity,
  linearToSrgb,
  RoleDefinitionEntity,
  srgbToLinear
} from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import {
  ComplianceReportEntity,
  contrastPlugin,
  CVD_THRESHOLDS,
  cvdMatrices,
  CvdResultSetEntity
} from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import {
  JsonObject, JsonValue
} from '@studnicky/types/browser';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { categoryColorService } from '../app/examples/vueCapacitor/categoryColorService.ts';
import { categoryW3cRoleSchema } from '../app/examples/vueCapacitor/categoryW3cRoleSchema.ts';
import { CATEGORY_COLOR_SERVICE_CONSTANTS } from '../app/examples/vueCapacitor/constants/CategoryColorServiceConstants.ts';

class AccessibilityFixture {
  static requiredRatio(minimumContrastRatio: number | undefined, context: string): number {
    if (minimumContrastRatio === undefined) {
      throw new Error(`${context} must declare minimumContrastRatio.`);
    }
    const result = minimumContrastRatio;

    return result;
  }

  static assertCvd(roles: Map<string, ColorRecordEntity.Type>): void {
    const epsilon = 1e-12;
    const pairs = categoryW3cRoleSchema.contrastPairs ?? [];

    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = pairs[pairIndex];

      if (pair === undefined) {
        throw new Error(`Contrast pair ${pairIndex} is missing.`);
      }
      const foreground = AccessibilityFixture.role(roles, pair.foreground);
      const background = AccessibilityFixture.role(roles, pair.background);
      const originalContrast = contrastWcag21.apply(foreground, background);

      for (let matrixIndex = 0; matrixIndex < cvdMatrices.length; matrixIndex += 1) {
        const matrix = cvdMatrices[matrixIndex];

        if (matrix === undefined) {
          throw new Error(`CVD matrix ${matrixIndex} is missing.`);
        }
        const simulatedContrast = AccessibilityFixture.rgbContrast(
          AccessibilityFixture.simulate(foreground.rgb, matrix),
          AccessibilityFixture.simulate(background.rgb, matrix)
        );
        const threshold = CVD_THRESHOLDS[matrix.name];

        assert.equal(
          Math.abs(originalContrast - simulatedContrast) <= threshold.dropMagnitude + epsilon,
          true,
          `${pair.foreground}/${pair.background} ${matrix.name} drop`
        );
        assert.equal(
          simulatedContrast >= threshold.minimumSimulatedContrast - epsilon,
          true,
          `${pair.foreground}/${pair.background} ${matrix.name} floor`
        );
      }
    }
  }

  static cvdDrop(
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    matrix: CvdMatrixEntity.Type
  ): number {
    const result = contrastWcag21.apply(foreground, background) - AccessibilityFixture.rgbContrast(
      AccessibilityFixture.simulate(foreground.rgb, matrix),
      AccessibilityFixture.simulate(background.rgb, matrix)
    );

    return result;
  }

  static emittedRoles(
    declarations: Map<string, string>,
    variableMap: Record<string, string>
  ): Map<string, ColorRecordEntity.Type> {
    const roles = new Map<string, ColorRecordEntity.Type>();
    const variables = new Map(Object.entries(variableMap));

    for (let roleIndex = 0; roleIndex < categoryW3cRoleSchema.roles.length; roleIndex += 1) {
      const role = categoryW3cRoleSchema.roles[roleIndex];

      if (role === undefined) {
        throw new Error(`Role ${roleIndex} is missing.`);
      }
      const property = variables.get(role.name);

      if (property === undefined) {
        throw new Error(`CSS variable mapping is missing for ${role.name}.`);
      }
      roles.set(role.name, colorRecordFactory.fromHex(
        CssFixture.requireValue(declarations, property)
      ));
    }

    return roles;
  }

  static role(
    roles: Map<string, ColorRecordEntity.Type>,
    roleName: string
  ): ColorRecordEntity.Type {
    const role = roles.get(roleName);

    if (role === undefined) {
      throw new Error(`Role ${roleName} is missing.`);
    }
    const result = role;

    return result;
  }

  private static luminance(rgb: ReturnType<typeof colorRecordFactory.fromHex>['rgb']): number {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;

    return result;
  }

  private static rgbContrast(foreground: ReturnType<typeof colorRecordFactory.fromHex>['rgb'], background: ReturnType<typeof colorRecordFactory.fromHex>['rgb']): number {
    const foregroundLuminance = AccessibilityFixture.luminance(foreground);
    const backgroundLuminance = AccessibilityFixture.luminance(background);
    const result = (
      Math.max(foregroundLuminance, backgroundLuminance) + 0.05
    ) / (
      Math.min(foregroundLuminance, backgroundLuminance) + 0.05
    );

    return result;
  }

  private static simulate(rgb: ReturnType<typeof colorRecordFactory.fromHex>['rgb'], cvd: CvdMatrixEntity.Type): ReturnType<typeof colorRecordFactory.fromHex>['rgb'] {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const matrix = cvd.matrix;
    const result = linearToSrgb.apply(
      clamp01.apply(matrix[0] * linear.r + matrix[1] * linear.g + matrix[2] * linear.b),
      clamp01.apply(matrix[3] * linear.r + matrix[4] * linear.g + matrix[5] * linear.b),
      clamp01.apply(matrix[6] * linear.r + matrix[7] * linear.g + matrix[8] * linear.b)
    );

    return result;
  }
}

class CssFixture {
  static declarations(css: string): Map<string, string> {
    const declarations = new Map<string, string>();
    const lines = css.split('\n');

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (line === undefined) {
        throw new Error(`CSS line ${index} is missing.`);
      }
      const match = CATEGORY_COLOR_SERVICE_CONSTANTS.cssCustomPropertyDeclarationPattern.exec(line);

      if (match?.[1] !== undefined && match[2] !== undefined) {
        declarations.set(match[1], match[2]);
      }
    }

    return declarations;
  }

  static requireValue(declarations: Map<string, string>, property: string): string {
    const value = declarations.get(property);

    if (value === undefined) {
      throw new Error(`CSS property ${property} is missing.`);
    }
    const result = value;

    return result;
  }
}

class FakeHead {
  readonly children: FakeStyleElement[] = [];

  appendChild(element: FakeStyleElement): FakeStyleElement {
    this.children.push(element);
    const result = element;

    return result;
  }
}

class FakeDocument {
  readonly head = new FakeHead();

  createElement(tagName: string): FakeStyleElement {
    if (tagName !== 'style') {
      throw new TypeError(`Unexpected element request: ${tagName}`);
    }
    const result = new FakeStyleElement();

    return result;
  }

  getElementById(identifier: string): FakeStyleElement | null {
    if (identifier.length === 0) {
      throw new TypeError('Element identifiers must be non-empty.');
    }
    for (let index = 0; index < this.head.children.length; index += 1) {
      const child = this.head.children[index];

      if (child?.id === identifier) {
        return child;
      }
    }

    return null;
  }
}

class FakeStyleElement {
  id = '';

  textContent: null | string = null;
}

class MalformedOutputEngine {
  run() {
    return {
      'outputs': {
        'capacitor:statusBar': {
          'backgroundColor': '#000000',
          'overlay': false,
          'style': 'DARK'
        },
        'stylesheet:cssVars': { 'map': { '--c-accent': '#8B5CF6' } }
      }
    };
  }
}

class RecipeConfigFixture {
  static input(config: JSONSchema7Object): InputEntity.Type {
    const input = RecipeConfigFixture.objectMember(config, 'input');
    const contrast = RecipeConfigFixture.objectMember(input, 'contrast');
    const metadata = RecipeConfigFixture.objectMember(input, 'metadata');
    const result = InputEntity.create({
      'colors': RecipeConfigFixture.stringArray(input.colors, 'input.colors'),
      'contrast': ContrastOptionsEntity.intake(contrast),
      'metadata': metadata,
      'roles': categoryW3cRoleSchema
    });

    return result;
  }

  static async json(relativePath: string): Promise<JSONSchema7Object> {
    const parsed = JsonValue.from(JSON.parse(
      await readFile(new URL(relativePath, import.meta.url), 'utf8')
    ));

    if (!JsonObject.is(parsed)) {
      throw new TypeError(`${relativePath} must contain a JSON object.`);
    }
    const result = parsed;

    return result;
  }

  static objectMember(parent: JSONSchema7Object, key: string): JSONSchema7Object {
    const value = parent[key];

    if (!JsonObject.is(value)) {
      throw new TypeError(`${key} must be an object.`);
    }
    const result = value;

    return result;
  }

  static run(config: JSONSchema7Object): PaletteStateInterface {
    const engine = new Engine();

    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];

      if (task === undefined) {
        throw new Error(`Core task ${taskIndex} is missing.`);
      }
      engine.tasks.register(task);
    }
    engine.adopt(contrastPlugin);
    engine.adopt(stylesheetPlugin);
    engine.adopt(capacitorPlugin);
    engine.pipeline(RecipeConfigFixture.stringArray(config.pipeline, 'pipeline'));
    const result = engine.run(RecipeConfigFixture.input(config));

    return result;
  }

  static string(value: JSONSchema7Object[string] | undefined, path: string): string {
    if (typeof value !== 'string') {
      throw new TypeError(`${path} must be a string.`);
    }
    const result = value;

    return result;
  }

  static stringArray(value: JSONSchema7Object[string] | undefined, path: string): string[] {
    if (!Array.isArray(value)) {
      throw new TypeError(`${path} must be an array.`);
    }
    const strings: string[] = [];

    for (let index = 0; index < value.length; index += 1) {
      const member = value[index];

      if (member === undefined) {
        throw new TypeError(`${path}[${index}] is missing.`);
      }
      strings.push(RecipeConfigFixture.string(member, `${path}[${index}]`));
    }

    return strings;
  }

  private static boolean(value: JSONSchema7Object[string] | undefined, path: string): boolean {
    if (typeof value !== 'boolean') {
      throw new TypeError(`${path} must be a boolean.`);
    }
    const result = value;

    return result;
  }
}

class RoleSchemaFixture {
  static assertCompleteShapes(): void {
    for (let roleIndex = 0; roleIndex < categoryW3cRoleSchema.roles.length; roleIndex += 1) {
      const role = categoryW3cRoleSchema.roles[roleIndex];

      if (role === undefined) {
        throw new Error(`Role ${roleIndex} is missing.`);
      }
      assert.equal(RoleDefinitionEntity.validate(role), true, `${role.name} is canonical`);
      assert.equal(Object.hasOwn(role, 'name'), true, `${role.name}.name is present`);
      const keys = Object.keys(role);

      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        const key = keys[keyIndex];

        if (key === undefined) {
          throw new Error(`Role key ${keyIndex} is missing.`);
        }
        assert.notEqual(Reflect.get(role, key), undefined, `${role.name}.${key} is defined`);
      }
    }
  }
}

class StaticPaletteEngine {
  constructor(private readonly state: PaletteStateInterface) {}

  run(): PaletteStateInterface {
    return this.state;
  }
}

await test('Vue Capacitor CVD audit clamps matrix channels before gamma encoding', () => {
  const protanopia = cvdMatrices[0];

  if (protanopia?.name !== 'protanopia') {
    throw new Error('The canonical protanopia matrix is missing.');
  }
  const drop = AccessibilityFixture.cvdDrop(
    colorRecordFactory.fromHex('#230b4c'),
    colorRecordFactory.fromHex('#e5e0fe'),
    protanopia
  );

  assert.equal(Math.abs(drop - 0.5054638709373549) < 1e-12, true);
  assert.equal(drop > CVD_THRESHOLDS.protanopia.dropMagnitude, true);
});

await test('Vue Capacitor JSON artifacts align with the TypeScript schema and execute the real config', async () => {
  const config = await RecipeConfigFixture.json('../app/examples/vueCapacitor/category-w3c.config.json');
  const schemaJson = await RecipeConfigFixture.json('../app/examples/vueCapacitor/categoryW3cRoleSchema.json');
  const input = RecipeConfigFixture.input(config);
  const serializedTypeScriptSchema = JsonValue.from(JSON.parse(JSON.stringify(categoryW3cRoleSchema)));

  assert.deepEqual(schemaJson, serializedTypeScriptSchema);
  assert.deepEqual(
    RecipeConfigFixture.objectMember(RecipeConfigFixture.objectMember(config, 'input'), 'roles'),
    schemaJson
  );
  assert.deepEqual(input.roles, categoryW3cRoleSchema);
  if (input.contrast === undefined) {
    throw new Error('The canonical recipe config must declare contrast options.');
  }
  assert.deepEqual(RecipeConfigFixture.stringArray(config.pipeline, 'pipeline'), [
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance',
    'emit:cssVars',
    'emit:capacitorStatusBar',
    'emit:capacitorTheme'
  ]);

  const state = RecipeConfigFixture.run(config);
  const compliance = ComplianceReportEntity.intake(state.metadata['contrast:complianceReport']);
  const cvd = CvdResultSetEntity.intake(state.metadata['contrast:cvd']);

  assert.equal(compliance.compliant, true);
  assert.equal(compliance.pairs.length > 0, true);
  assert.equal(cvd.warnings.length, 0);
  const everyCorrectionCleared = cvd.corrections.every((correction) => {
    const result = correction.cvdTypesRemaining.length === 0;

    return result;
  });

  assert.equal(everyCorrectionCleared, true);
});

await test('Vue Capacitor schema exposes complete role shapes and produces validated outputs', () => {
  const documentFixture = new FakeDocument();

  Reflect.set(globalThis, 'document', documentFixture);
  Reflect.set(globalThis, 'HTMLStyleElement', FakeStyleElement);

  assert.equal(categoryW3cRoleSchema.name, 'category-w3c');
  assert.equal(categoryW3cRoleSchema.roles.length, 7);
  const onAccentRole = categoryW3cRoleSchema.roles.find((role) => {
    const result = role.name === 'onAccent';

    return result;
  });

  assert.equal(onAccentRole?.intent, 'onAccent');
  const borderRole = categoryW3cRoleSchema.roles.find((role) => {
    const result = role.name === 'border';

    return result;
  });

  assert.equal(borderRole?.intent, undefined);
  const mutedRole = categoryW3cRoleSchema.roles.find((role) => {
    const result = role.name === 'muted';

    return result;
  });

  assert.equal(mutedRole?.intent, 'muted');
  RoleSchemaFixture.assertCompleteShapes();

  const output = categoryColorService.apply('music', '#8B5CF6');

  assert.equal(Object.keys(output.cssVars.map).length > 0, true);
  assert.equal(output.cssVars.full.includes(':root'), true);
  assert.equal(output.cssVars.forcedColors.includes('--c-on-accent: HighlightText;'), true);
  assert.equal(output.cssVars.forcedColors.includes('--c-on-accent: CanvasText;'), false);
  assert.equal(output.cssVars.forcedColors.includes('--c-border: CanvasText;'), true);
  assert.equal(output.cssVars.forcedColors.includes('--c-muted: GrayText;'), true);
  assert.equal(output.statusBar.backgroundColor.startsWith('#'), true);
  assert.equal(output.statusBar.backgroundColor.length, 7);
  assert.equal(typeof output.statusBar.overlay, 'boolean');
  assert.equal(output.statusBar.style === 'DARK' || output.statusBar.style === 'LIGHT', true);
  assert.equal(output.compliance.compliant, true);
  assert.equal(output.wcagPairs.length, categoryW3cRoleSchema.contrastPairs?.length);
  const wcagPasses = output.wcagPairs.every((pair) => {
    const result = pair.actual >= pair.required;

    return result;
  });

  assert.equal(wcagPasses, true);
  assert.equal(output.cvd.warnings.length, 0);
  const correctionsCleared = output.cvd.corrections.every((correction) => {
    const result = correction.cvdTypesRemaining.length === 0;

    return result;
  });

  assert.equal(correctionsCleared, true);
  assert.equal(documentFixture.head.children.length, 1);
  assert.equal(output.cssVars.scopedBlock.startsWith("[data-category='music'] {\n"), true);
  assert.equal(documentFixture.head.children[0]?.textContent, output.cssVars.scopedBlock);

  const declarations = CssFixture.declarations(output.cssVars.scopedBlock);
  const documentedRoleHex = new Map([
    [
      '--c-accent',
      '#5b4894'
    ],
    [
      '--c-border',
      '#8b5cf6'
    ],
    [
      '--c-canvas',
      '#e5e0fe'
    ],
    [
      '--c-muted',
      '#8b5cf6'
    ],
    [
      '--c-on-accent',
      '#fcfcfc'
    ],
    [
      '--c-surface',
      '#d2c9fb'
    ],
    [
      '--c-text',
      '#201042'
    ]
  ]);

  assert.deepEqual(declarations, documentedRoleHex);
  const emittedRoles = AccessibilityFixture.emittedRoles(declarations, output.cssVars.map);
  const schemaPairs = categoryW3cRoleSchema.contrastPairs ?? [];

  for (let pairIndex = 0; pairIndex < schemaPairs.length; pairIndex += 1) {
    const pair = schemaPairs[pairIndex];

    if (pair === undefined) {
      throw new Error(`Schema contrast pair ${pairIndex} is missing.`);
    }
    const ratio = contrastWcag21.apply(
      AccessibilityFixture.role(emittedRoles, pair.foreground),
      AccessibilityFixture.role(emittedRoles, pair.background)
    );
    const minimumContrastRatio = AccessibilityFixture.requiredRatio(pair.minimumContrastRatio, `Schema contrast pair ${pairIndex}`);

    assert.equal(ratio >= minimumContrastRatio, true, `${pair.foreground}/${pair.background}: ${ratio}`);
  }
  AccessibilityFixture.assertCvd(emittedRoles);
});

await test('Vue Capacitor service rejects unsafe categories before running or writing styles', () => {
  const documentFixture = new FakeDocument();

  Reflect.set(globalThis, 'document', documentFixture);
  Reflect.set(globalThis, 'HTMLStyleElement', FakeStyleElement);

  assert.throws(
    () => {
      categoryColorService.apply("music'] { color: red; } body [data-x='", '#8B5CF6');
    },
    (error) => {
      assert.ok(error instanceof TypeError);
      assert.equal(error.message.includes('lowercase kebab-case'), true);

      return true;
    }
  );
  assert.equal(documentFixture.head.children.length, 0);
});

await test('Vue Capacitor service applies no partial style when a palette fails contrast', () => {
  const documentFixture = new FakeDocument();
  const existingSheet = new FakeStyleElement();

  existingSheet.id = 'ce-music-styles';
  existingSheet.textContent = 'existing conformant palette';
  documentFixture.head.appendChild(existingSheet);
  Reflect.set(globalThis, 'document', documentFixture);
  Reflect.set(globalThis, 'HTMLStyleElement', FakeStyleElement);

  assert.throws(
    () => {
      categoryColorService.apply('music', '#00FF00');
    },
    (error) => {
      assert.ok(error instanceof RangeError);
      assert.equal(error.message.includes('configured contrast contract'), true);

      return true;
    }
  );
  assert.equal(documentFixture.head.children.length, 1);
  assert.equal(existingSheet.textContent, 'existing conformant palette');
});

await test('Vue Capacitor service rejects malformed output and stale compliance metadata', async () => {
  const documentFixture = new FakeDocument();

  Reflect.set(globalThis, 'document', documentFixture);
  Reflect.set(globalThis, 'HTMLStyleElement', FakeStyleElement);
  const originalEngine: unknown = Reflect.get(categoryColorService, 'engine');

  Reflect.set(categoryColorService, 'engine', new MalformedOutputEngine());

  let failure: unknown;

  try {
    categoryColorService.apply('music', '#8B5CF6');
  } catch (error) {
    failure = error;
  } finally {
    Reflect.set(categoryColorService, 'engine', originalEngine);
  }

  assert.ok(failure instanceof TypeError);
  assert.equal(
    failure.message.includes('stylesheet plugin returned an invalid css-vars output'),
    true
  );
  assert.equal(documentFixture.head.children.length, 0);

  const config = await RecipeConfigFixture.json('../app/examples/vueCapacitor/category-w3c.config.json');
  const state = RecipeConfigFixture.run(config);
  const cssVars = RecipeConfigFixture.objectMember(state.outputs, 'stylesheet:cssVars');
  const scopedBlock = RecipeConfigFixture.string(
    cssVars.scopedBlock,
    'outputs.stylesheet:cssVars.scopedBlock'
  );

  if (!scopedBlock.includes('#201042')) {
    throw new Error('The canonical terminal text color is missing from scoped CSS.');
  }
  cssVars.scopedBlock = scopedBlock.replace('#201042', '#8b5cf6');
  state.roles.text = colorRecordFactory.fromHex('#8b5cf6');

  Reflect.set(categoryColorService, 'engine', new StaticPaletteEngine(state));

  let staleFailure: unknown;

  try {
    categoryColorService.apply('music', '#8B5CF6');
  } catch (error) {
    staleFailure = error;
  } finally {
    Reflect.set(categoryColorService, 'engine', originalEngine);
  }

  assert.ok(staleFailure instanceof RangeError);
  assert.equal(staleFailure.message.includes('WCAG contrast'), true);
  assert.equal(documentFixture.head.children.length, 0);
});
