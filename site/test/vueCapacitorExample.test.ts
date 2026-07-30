import type { CvdMatrixInterfaceType } from '@studnicky/iridis-contrast';
import type {
  ColorIntentType,
  ColorRecordInterfaceType,
  ContrastAlgorithmType,
  ContrastPairInterfaceType,
  InputInterface,
  PaletteStateInterface,
  RgbInterfaceType
} from '@studnicky/iridis/types';
import type { JsonObjectType } from '@studnicky/types';

import {
  clamp01,
  colorRecordFactory,
  contrastApca,
  contrastWcag21,
  coreTasks,
  Engine,
  linearToSrgb,
  srgbToLinear
} from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import {
  contrastPlugin,
  CVD_THRESHOLDS,
  cvdMatrices,
  getContrastMetadata
} from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { JsonObject } from '@studnicky/types';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { categoryColorService } from '../app/examples/vueCapacitor/categoryColorService.ts';
import { categoryW3cRoleSchema } from '../app/examples/vueCapacitor/categoryW3cRoleSchema.ts';
import { CATEGORY_COLOR_SERVICE_CONSTANTS } from '../app/examples/vueCapacitor/constants/CategoryColorServiceConstants.ts';

class RecipeConfigFixture {
  static input(config: JsonObjectType): InputInterface {
    const input = RecipeConfigFixture.objectMember(config, 'input');
    const contrast = RecipeConfigFixture.objectMember(input, 'contrast');
    const metadata = RecipeConfigFixture.objectMember(input, 'metadata');
    return {
      'bypass': undefined,
      'colors': RecipeConfigFixture.stringArray(input.colors, 'input.colors'),
      'contrast': {
        'algorithm': RecipeConfigFixture.algorithm(contrast.algorithm),
        'cvdCorrect': RecipeConfigFixture.boolean(contrast.cvdCorrect, 'input.contrast.cvdCorrect'),
        'extra': RecipeConfigFixture.contrastPairs(contrast.extra),
        'level': RecipeConfigFixture.string(contrast.level, 'input.contrast.level')
      },
      'emit': undefined,
      'maxColors': undefined,
      'metadata': metadata,
      'roles': categoryW3cRoleSchema,
      'runtime': undefined
    };
  }

  static async json(relativePath: string): Promise<JsonObjectType> {
    const parsed: unknown = JSON.parse(
      await readFile(new URL(relativePath, import.meta.url), 'utf8')
    );
    if (!JsonObject.is(parsed)) {
      throw new TypeError(`${relativePath} must contain a JSON object.`);
    }
    return parsed;
  }

  static objectMember(parent: JsonObjectType, key: string): JsonObjectType {
    const value = parent[key];
    if (!JsonObject.is(value)) {
      throw new TypeError(`${key} must be an object.`);
    }
    return value;
  }

  static run(config: JsonObjectType): PaletteStateInterface {
    const engine = new Engine();
    for (const task of coreTasks) {
      engine.tasks.register(task);
    }
    engine.adopt(contrastPlugin);
    engine.adopt(stylesheetPlugin);
    engine.adopt(capacitorPlugin);
    engine.pipeline(RecipeConfigFixture.stringArray(config.pipeline, 'pipeline'));
    return engine.run(RecipeConfigFixture.input(config));
  }

  static string(value: unknown, path: string): string {
    if (typeof value !== 'string') {
      throw new TypeError(`${path} must be a string.`);
    }
    return value;
  }

  static stringArray(value: unknown, path: string): string[] {
    if (!Array.isArray(value)) {
      throw new TypeError(`${path} must be an array.`);
    }
    const strings: string[] = [];
    for (const [index, member] of value.entries()) {
      strings.push(RecipeConfigFixture.string(member, `${path}[${index}]`));
    }
    return strings;
  }

  private static algorithm(value: unknown): ContrastAlgorithmType {
    if (value !== 'wcag21' && value !== 'apca') {
      throw new TypeError('input.contrast.algorithm must be wcag21 or apca.');
    }
    return value;
  }

  private static boolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') {
      throw new TypeError(`${path} must be a boolean.`);
    }
    return value;
  }

  private static contrastPairs(value: unknown): ContrastPairInterfaceType[] {
    if (!Array.isArray(value)) {
      throw new TypeError('input.contrast.extra must be an array.');
    }
    const pairs: ContrastPairInterfaceType[] = [];
    for (const [index, member] of value.entries()) {
      if (!JsonObject.is(member)) {
        throw new TypeError(`input.contrast.extra[${index}] must be an object.`);
      }
      const minimumRatio = member.minRatio;
      if (typeof minimumRatio !== 'number') {
        throw new TypeError(`input.contrast.extra[${index}].minRatio must be a number.`);
      }
      pairs.push({
        'algorithm': RecipeConfigFixture.algorithm(member.algorithm),
        'background': RecipeConfigFixture.string(member.background, `input.contrast.extra[${index}].background`),
        'foreground': RecipeConfigFixture.string(member.foreground, `input.contrast.extra[${index}].foreground`),
        'minRatio': minimumRatio
      });
    }
    return pairs;
  }

}

class FakeStyleElement {
  id = '';
  textContent: string | null = null;
}

class FakeHead {
  readonly children: FakeStyleElement[] = [];

  appendChild(element: FakeStyleElement): FakeStyleElement {
    this.children.push(element);
    return element;
  }
}

class FakeDocument {
  readonly head = new FakeHead();

  createElement(tagName: string): FakeStyleElement {
    if (tagName !== 'style') {
      throw new TypeError(`Unexpected element request: ${tagName}`);
    }
    return new FakeStyleElement();
  }

  getElementById(identifier: string): FakeStyleElement | null {
    if (identifier.length === 0) {
      throw new TypeError('Element identifiers must be non-empty.');
    }
    for (const child of this.head.children) {
      if (child.id === identifier) {
        return child;
      }
    }
    return null;
  }
}

class CssFixture {
  static declarations(css: string): Map<string, string> {
    const declarations = new Map<string, string>();
    for (const line of css.split('\n')) {
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
    return value;
  }
}

class AccessibilityFixture {
  static apcaPairs(): ContrastPairInterfaceType[] {
    return [
      { 'algorithm': 'apca', 'background': 'canvas', 'foreground': 'text', 'minRatio': 75 },
      { 'algorithm': 'apca', 'background': 'surface', 'foreground': 'text', 'minRatio': 75 },
      { 'algorithm': 'apca', 'background': 'accent', 'foreground': 'onAccent', 'minRatio': 60 },
      { 'algorithm': 'apca', 'background': 'canvas', 'foreground': 'border', 'minRatio': 45 }
    ];
  }

  static assertCvd(roles: Record<string, ColorRecordInterfaceType>): void {
    const epsilon = 1e-12;
    for (const pair of categoryW3cRoleSchema.contrastPairs ?? []) {
      const foreground = AccessibilityFixture.role(roles, pair.foreground);
      const background = AccessibilityFixture.role(roles, pair.background);
      const originalContrast = contrastWcag21.apply(foreground, background);
      for (const matrix of cvdMatrices) {
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
          simulatedContrast >= threshold.minSimulatedContrast - epsilon,
          true,
          `${pair.foreground}/${pair.background} ${matrix.name} floor`
        );
      }
    }
  }

  static apcaRequiredLc(
    foregroundIntent: ColorIntentType | undefined,
    backgroundIntent: ColorIntentType
  ): number {
    const engine = new Engine();
    for (const task of coreTasks) {
      engine.tasks.register(task);
    }
    engine.adopt(contrastPlugin);
    engine.pipeline(['intake:any', 'resolve:roles', 'enforce:apca']);
    const state = engine.run({
      'bypass': undefined,
      'colors': ['#000000', '#ffffff'],
      'contrast': undefined,
      'emit': undefined,
      'maxColors': undefined,
      'metadata': undefined,
      'roles': {
        'contrastPairs': [
          { 'algorithm': 'apca', 'background': 'background', 'foreground': 'foreground', 'minRatio': 1 }
        ],
        'description': undefined,
        'name': 'semantic-apca-target',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'derivedFrom': undefined,
            'description': undefined,
            'hue': undefined,
            'hueClamp': undefined,
            'hueOffset': undefined,
            'intent': foregroundIntent,
            'lightnessRange': [0, 0.3],
            'name': 'foreground',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'derivedFrom': undefined,
            'description': undefined,
            'hue': undefined,
            'hueClamp': undefined,
            'hueOffset': undefined,
            'intent': backgroundIntent,
            'lightnessRange': [0.85, 1],
            'name': 'background',
            'required': true
          }
        ]
      },
      'runtime': undefined
    });
    const pair = getContrastMetadata(state.metadata, 'contrast:apca')?.pairs[0];
    if (pair === undefined) {
      throw new Error('APCA enforcement did not report the semantic intent pair.');
    }
    return pair.requiredLc;
  }

  static cvdDrop(
    foreground: ColorRecordInterfaceType,
    background: ColorRecordInterfaceType,
    matrix: CvdMatrixInterfaceType
  ): number {
    return contrastWcag21.apply(foreground, background) - AccessibilityFixture.rgbContrast(
      AccessibilityFixture.simulate(foreground.rgb, matrix),
      AccessibilityFixture.simulate(background.rgb, matrix)
    );
  }

  static emittedRoles(
    declarations: Map<string, string>,
    variableMap: Record<string, string>
  ): Record<string, ColorRecordInterfaceType> {
    const roles: Record<string, ColorRecordInterfaceType> = {};
    for (const role of categoryW3cRoleSchema.roles) {
      const property = variableMap[role.name];
      if (property === undefined) {
        throw new Error(`CSS variable mapping is missing for ${role.name}.`);
      }
      roles[role.name] = colorRecordFactory.fromHex(
        CssFixture.requireValue(declarations, property)
      );
    }
    return roles;
  }

  static role(
    roles: Record<string, ColorRecordInterfaceType>,
    roleName: string
  ): ColorRecordInterfaceType {
    const role = roles[roleName];
    if (role === undefined) {
      throw new Error(`Role ${roleName} is missing.`);
    }
    return role;
  }

  private static luminance(rgb: RgbInterfaceType): number {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    return 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
  }

  private static rgbContrast(foreground: RgbInterfaceType, background: RgbInterfaceType): number {
    const foregroundLuminance = AccessibilityFixture.luminance(foreground);
    const backgroundLuminance = AccessibilityFixture.luminance(background);
    return (
      Math.max(foregroundLuminance, backgroundLuminance) + 0.05
    ) / (
      Math.min(foregroundLuminance, backgroundLuminance) + 0.05
    );
  }

  private static simulate(rgb: RgbInterfaceType, cvd: CvdMatrixInterfaceType): RgbInterfaceType {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const matrix = cvd.matrix;
    return linearToSrgb.apply(
      clamp01.apply(matrix[0] * linear.r + matrix[1] * linear.g + matrix[2] * linear.b),
      clamp01.apply(matrix[3] * linear.r + matrix[4] * linear.g + matrix[5] * linear.b),
      clamp01.apply(matrix[6] * linear.r + matrix[7] * linear.g + matrix[8] * linear.b)
    );
  }
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
        'stylesheet:cssVars': {
          'map': { '--c-accent': '#8B5CF6' }
        }
      }
    };
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

await test('Vue Capacitor APCA evidence covers every canonical foreground intent', () => {
  const actualTargets: Readonly<Record<ColorIntentType, number>> = {
    'accent':     AccessibilityFixture.apcaRequiredLc('accent', 'background'),
    'background': AccessibilityFixture.apcaRequiredLc('background', 'background'),
    'button':     AccessibilityFixture.apcaRequiredLc('button', 'background'),
    'critical':   AccessibilityFixture.apcaRequiredLc('critical', 'background'),
    'link':       AccessibilityFixture.apcaRequiredLc('link', 'background'),
    'muted':      AccessibilityFixture.apcaRequiredLc('muted', 'background'),
    'onAccent':   AccessibilityFixture.apcaRequiredLc('onAccent', 'accent'),
    'onButton':   AccessibilityFixture.apcaRequiredLc('onButton', 'button'),
    'positive':   AccessibilityFixture.apcaRequiredLc('positive', 'background'),
    'text':       AccessibilityFixture.apcaRequiredLc('text', 'background')
  };
  const expectedTargets: Readonly<Record<ColorIntentType, number>> = {
    'accent': 45,
    'background': 45,
    'button': 45,
    'critical': 45,
    'link': 60,
    'muted': 60,
    'onAccent': 60,
    'onButton': 60,
    'positive': 45,
    'text': 75
  };

  assert.deepEqual(actualTargets, expectedTargets);
  assert.equal(AccessibilityFixture.apcaRequiredLc(undefined, 'background'), 45);
});

await test('Vue Capacitor JSON artifacts align with the TypeScript schema and execute the real config', async () => {
  const config = await RecipeConfigFixture.json('../app/examples/vueCapacitor/category-w3c.config.json');
  const schemaJson = await RecipeConfigFixture.json('../app/examples/vueCapacitor/categoryW3cRoleSchema.json');
  const input = RecipeConfigFixture.input(config);
  const serializedTypeScriptSchema: unknown = JSON.parse(JSON.stringify(categoryW3cRoleSchema));
  assert.deepEqual(schemaJson, serializedTypeScriptSchema);
  assert.deepEqual(
    RecipeConfigFixture.objectMember(RecipeConfigFixture.objectMember(config, 'input'), 'roles'),
    schemaJson
  );
  assert.deepEqual(input.roles, categoryW3cRoleSchema);
  if (input.contrast === undefined) {
    throw new Error('The canonical recipe config must declare contrast options.');
  }
  assert.deepEqual(input.contrast.extra, AccessibilityFixture.apcaPairs());
  assert.deepEqual(RecipeConfigFixture.stringArray(config.pipeline, 'pipeline'), [
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:wcagAA',
    'enforce:wcagAAA',
    'enforce:apca',
    'enforce:cvdSimulate',
    'derive:variant',
    'emit:cssVars',
    'emit:capacitorStatusBar',
    'emit:capacitorTheme'
  ]);

  const state = RecipeConfigFixture.run(config);
  assert.equal(getContrastMetadata(state.metadata, 'contrast:aa')?.pairs.length, 4);
  assert.equal(getContrastMetadata(state.metadata, 'contrast:aaa')?.pairs.length, 4);
  assert.equal(getContrastMetadata(state.metadata, 'contrast:apca')?.pairs.length, 4);
  const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
  assert.ok(cvd !== undefined);
  assert.equal(cvd.warnings.length, 0);
  assert.equal(cvd.corrections?.every((correction) => {
    return correction.cvdTypesRemaining.length === 0;
  }), true);
});

await test('Vue Capacitor schema exposes complete role shapes and produces validated outputs', () => {
  const documentFixture = new FakeDocument();
  Reflect.set(globalThis, 'document', documentFixture);
  Reflect.set(globalThis, 'HTMLStyleElement', FakeStyleElement);

  assert.equal(categoryW3cRoleSchema.name, 'category-w3c');
  assert.equal(categoryW3cRoleSchema.roles.length, 7);
  const onAccentRole = categoryW3cRoleSchema.roles.find((role) => {return role.name === 'onAccent';});
  assert.equal(onAccentRole?.intent, 'onAccent');
  const borderRole = categoryW3cRoleSchema.roles.find((role) => {return role.name === 'border';});
  assert.equal(borderRole?.intent, undefined);
  const mutedRole = categoryW3cRoleSchema.roles.find((role) => {return role.name === 'muted';});
  assert.equal(mutedRole?.intent, 'muted');
  const roleKeys = [
    'chromaRange',
    'derivedFrom',
    'description',
    'hue',
    'hueClamp',
    'hueOffset',
    'intent',
    'lightnessRange',
    'name',
    'required'
  ];
  const roleCount = categoryW3cRoleSchema.roles.length;
  const roleKeyCount = roleKeys.length;
  for (let roleIndex = 0; roleIndex < roleCount; roleIndex += 1) {
    const role = categoryW3cRoleSchema.roles[roleIndex];
    if (role === undefined) {
      throw new Error(`Role ${roleIndex} is missing.`);
    }
    for (let keyIndex = 0; keyIndex < roleKeyCount; keyIndex += 1) {
      const key = roleKeys[keyIndex];
      if (key === undefined) {
        throw new Error(`Role key ${keyIndex} is missing.`);
      }
      assert.equal(Object.hasOwn(role, key), true, `${role.name}.${key} is present`);
    }
  }

  const output = categoryColorService.apply('music', '#8B5CF6');
  assert.ok(Object.keys(output.cssVars.map).length > 0);
  assert.equal(output.cssVars.full.includes(':root'), true);
  assert.equal(output.cssVars.forcedColors.includes('--c-on-accent: HighlightText;'), true);
  assert.equal(output.cssVars.forcedColors.includes('--c-on-accent: CanvasText;'), false);
  assert.equal(output.cssVars.forcedColors.includes('--c-border: CanvasText;'), true);
  assert.equal(output.cssVars.forcedColors.includes('--c-muted: GrayText;'), true);
  assert.equal(output.statusBar.backgroundColor.startsWith('#'), true);
  assert.equal(output.statusBar.backgroundColor.length, 7);
  assert.equal(typeof output.statusBar.overlay, 'boolean');
  assert.equal(output.statusBar.style === 'DARK' || output.statusBar.style === 'LIGHT', true);
  assert.equal(output.wcagAa.pairs.length, categoryW3cRoleSchema.contrastPairs?.length);
  assert.equal(output.wcagAa.pairs.every((pair) => {
    return pair.pass && pair.after >= pair.required;
  }), true);
  assert.equal(output.wcagAaa.pairs.every((pair) => {
    return pair.pass && pair.after >= pair.required;
  }), true);
  assert.equal(output.apca.pairs.every((pair) => {
    return pair.pass && pair.afterLc >= pair.requiredLc;
  }), true);
  const requiredLcByPair = new Map(output.apca.pairs.map((pair) => {
    return [`${pair.foreground}\u0000${pair.background}`, pair.requiredLc];
  }));
  assert.equal(requiredLcByPair.get('text\u0000canvas'), 75);
  assert.equal(requiredLcByPair.get('text\u0000surface'), 75);
  assert.equal(requiredLcByPair.get('onAccent\u0000accent'), 60);
  assert.equal(requiredLcByPair.get('border\u0000canvas'), 45);
  assert.equal(output.cvd.warnings.length, 0);
  assert.equal(output.cvd.corrections?.every((correction) => {
    return correction.cvdTypesRemaining.length === 0;
  }), true);
  assert.equal(documentFixture.head.children.length, 1);
  assert.equal(output.cssVars.scopedBlock.startsWith("[data-category='music'] {\n"), true);
  assert.equal(documentFixture.head.children[0]?.textContent, output.cssVars.scopedBlock);

  const declarations = CssFixture.declarations(output.cssVars.scopedBlock);
  const documentedRoleHex = new Map([
    ['--c-accent', '#5b4894'],
    ['--c-border', '#8b5cf6'],
    ['--c-canvas', '#e5e0fe'],
    ['--c-muted', '#8b5cf6'],
    ['--c-on-accent', '#fcfcfc'],
    ['--c-surface', '#d2c9fb'],
    ['--c-text', '#201042']
  ]);
  assert.deepEqual(declarations, documentedRoleHex);
  const emittedRoles = AccessibilityFixture.emittedRoles(declarations, output.cssVars.map);
  for (const pair of categoryW3cRoleSchema.contrastPairs ?? []) {
    const ratio = contrastWcag21.apply(
      AccessibilityFixture.role(emittedRoles, pair.foreground),
      AccessibilityFixture.role(emittedRoles, pair.background)
    );
    assert.equal(ratio >= pair.minRatio, true, `${pair.foreground}/${pair.background}: ${ratio}`);
  }
  const apcaEvidence = new Map<string, number>();
  for (const result of output.apca.pairs) {
    apcaEvidence.set(`${result.foreground}\u0000${result.background}`, result.afterLc);
  }
  for (const pair of AccessibilityFixture.apcaPairs()) {
    const actualLc = Math.abs(contrastApca.apply(
      AccessibilityFixture.role(emittedRoles, pair.foreground),
      AccessibilityFixture.role(emittedRoles, pair.background)
    ));
    assert.equal(actualLc >= pair.minRatio, true, `${pair.foreground}/${pair.background}: ${actualLc}`);
    assert.equal(apcaEvidence.get(`${pair.foreground}\u0000${pair.background}`), actualLc);
  }
  AccessibilityFixture.assertCvd(emittedRoles);
});

await test('Vue Capacitor service rejects unsafe categories before running or writing styles', () => {
  const documentFixture = new FakeDocument();
  Reflect.set(globalThis, 'document', documentFixture);
  Reflect.set(globalThis, 'HTMLStyleElement', FakeStyleElement);

  assert.throws(
    () => {categoryColorService.apply("music'] { color: red; } body [data-x='", '#8B5CF6');},
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
    () => {categoryColorService.apply('music', '#00FF00');},
    (error) => {
      assert.ok(error instanceof RangeError);
      assert.equal(error.message.includes('configured contrast contract'), true);
      return true;
    }
  );
  assert.equal(documentFixture.head.children.length, 1);
  assert.equal(existingSheet.textContent, 'existing conformant palette');
});

await test('Vue Capacitor service rejects malformed output and stale APCA metadata', async () => {
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
  cssVars.scopedBlock = scopedBlock.replace('#201042', '#250d4f');
  state.roles.text = colorRecordFactory.fromHex('#250d4f');

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
  assert.equal(staleFailure.message.includes('does not meet APCA Lc 75'), true);
  assert.equal(documentFixture.head.children.length, 0);
});
