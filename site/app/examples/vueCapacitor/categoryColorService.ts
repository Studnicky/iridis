import type {
  ColorRecordEntity,
  PaletteStateInterface
} from '@studnicky/iridis';
import type { StatusBarOutputEntity } from '@studnicky/iridis-capacitor';
import type { CvdMatrixEntity } from '@studnicky/iridis-contrast';
import type { CssVarsOutputInterface } from '@studnicky/iridis-stylesheet';
import type { JSONSchema7Type } from 'json-schema';

import {
  clamp01,
  colorRecordFactory,
  ContrastPairEntity,
  contrastWcag21,
  coreTasks,
  Engine,
  InputEntity,
  linearToSrgb,
  RgbEntity,
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

import { categoryW3cRoleSchema } from './categoryW3cRoleSchema.ts';
import { CATEGORY_COLOR_SERVICE_CONSTANTS } from './constants/CategoryColorServiceConstants.ts';

interface CategoryWcagPairInterface {
  readonly 'actual': number;
  readonly 'background': string;
  readonly 'foreground': string;
  readonly 'required': number;
}

class CategoryColorService {
  private readonly engine: Engine;

  // #region construct
  private constructor() {
    this.engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task === undefined) {
        throw new RangeError('The core task list contains an empty entry.');
      }
      this.engine.tasks.register(task);
    }
    this.engine.adopt(contrastPlugin);
    this.engine.adopt(stylesheetPlugin);
    this.engine.adopt(capacitorPlugin);
    /* The recipe enforces the selected standard and CVD correction in one stage, then reports compliance before emission. */
    this.engine.pipeline([
      'intake:any',
      'resolve:roles',
      'derive:roleRelations',
      'enforce:compliance',
      'derive:variant',
      'report:compliance',
      'emit:cssVars',
      'emit:capacitorStatusBar',
      'emit:capacitorTheme'
    ]);
  }
  // #endregion construct

  private static instance: CategoryColorService | undefined;

  static shared(): CategoryColorService {
    CategoryColorService.instance ??= new CategoryColorService();
    return CategoryColorService.instance;
  }

  // #region apply
  apply(category: string, seed: string): {
    readonly 'compliance': ComplianceReportEntity.Type;
    readonly 'cssVars': CssVarsOutputInterface;
    readonly 'cvd': CvdResultSetEntity.Type;
    readonly 'statusBar': StatusBarOutputEntity;
    readonly 'wcagPairs': readonly CategoryWcagPairInterface[];
  } {
    CategoryColorService.assertCategory(category);
    const state = this.engine.run(InputEntity.create({
      'colors': [seed],
      'contrast': {
        'algorithm': 'wcag21',
        'cvdMode': 'enforce',
        'level': 'AAA'
      },
      'metadata': {
        'category': category,
        'cssVarPrefix': '--c-',
        'scopeAttr': 'data-category',
        'scopePrefix': 'category',
        'themeName': category
      },
      'roles': categoryW3cRoleSchema
    }));
    const cssVars = CategoryColorService.cssVarsOutput(
      state.outputs['stylesheet:cssVars']
    );
    const statusBar = CategoryColorService.statusBarOutput(
      state.outputs['capacitor:statusBar']
    );
    const contrastEvidence = CategoryColorService.contrastEvidence(state, cssVars);
    const sheetId = `ce-${category}-styles`;
    const existingSheet = document.getElementById(sheetId);
    let sheet: HTMLStyleElement;

    if (existingSheet === null) {
      sheet = document.createElement('style');
      sheet.id = sheetId;
      document.head.appendChild(sheet);
    } else {
      if (!(existingSheet instanceof HTMLStyleElement)) {
        throw new TypeError(`Element #${sheetId} must be a style element.`);
      }
      sheet = existingSheet;
    }

    sheet.textContent = cssVars.scopedBlock;

    return {
      'compliance': contrastEvidence.compliance,
      'cssVars': cssVars,
      'cvd': contrastEvidence.cvd,
      'statusBar': statusBar,
      'wcagPairs': contrastEvidence.wcagPairs
    };
  }
  // #endregion apply

  private static assertCategory(category: string): void {
    if (!CATEGORY_COLOR_SERVICE_CONSTANTS.categoryNamePattern.test(category)) {
      throw new TypeError('Category names must be lowercase kebab-case identifiers.');
    }
  }

  private static cssVarsOutput(value: JSONSchema7Type | undefined): CssVarsOutputInterface {
    if (!CategoryColorService.isCssVarsOutput(value)) {
      throw new TypeError('The stylesheet plugin returned an invalid css-vars output.');
    }
    const result = value;
    return result;
  }

  private static isCssVarsOutput(value: JSONSchema7Type | undefined): value is CssVarsOutputInterface {
    if (!CategoryColorService.isRecord(value)) {
      return false;
    }
    const result = (
      typeof value.darkScheme === 'string'
      && typeof value.forcedColors === 'string'
      && typeof value.full === 'string'
      && CategoryColorService.isStringRecord(value.map)
      && typeof value.rootBlock === 'string'
      && typeof value.scopedBlock === 'string'
      && typeof value.wideGamut === 'string'
    );
    return result;
  }

  private static isRecord(value: JSONSchema7Type | undefined): value is Record<string, JSONSchema7Type> {
    const result = value !== null && typeof value === 'object' && !Array.isArray(value);
    return result;
  }

  private static isStatusBarOutput(value: JSONSchema7Type | undefined): value is StatusBarOutputEntity {
    if (!CategoryColorService.isRecord(value)) {
      return false;
    }
    const result = (
      typeof value.backgroundColor === 'string'
      && typeof value.overlay === 'boolean'
      && (value.style === 'DARK' || value.style === 'LIGHT')
    );
    return result;
  }

  private static isStringRecord(value: JSONSchema7Type | undefined): value is Record<string, string> {
    if (!CategoryColorService.isRecord(value)) {
      return false;
    }
    const members = Object.values(value);
    for (let index = 0; index < members.length; index += 1) {
      const member = members[index];
      if (typeof member !== 'string') {
        return false;
      }
    }
    return true;
  }

  private static statusBarOutput(value: JSONSchema7Type | undefined): StatusBarOutputEntity {
    if (!CategoryColorService.isStatusBarOutput(value)) {
      throw new TypeError('The Capacitor plugin returned an invalid status-bar output.');
    }
    const result = value;
    return result;
  }

  private static assertCompleteCvdResults(results: CvdResultSetEntity.Type): void {
    const hasCorrectableWarning = results.warnings.length > 0
      || results.corrections.some((correction) => {
        const result = correction.cvdTypesRemaining.length > 0;
        return result;
      });
    if (hasCorrectableWarning) {
      throw new RangeError('The palette retains correctable color-vision-deficiency warnings.');
    }
  }

  private static contrastEvidence(
    state: PaletteStateInterface,
    cssVars: CssVarsOutputInterface
  ): {
    readonly 'compliance': ComplianceReportEntity.Type;
    readonly 'cvd': CvdResultSetEntity.Type;
    readonly 'wcagPairs': readonly CategoryWcagPairInterface[];
  } {
    const complianceValue = state.metadata['contrast:complianceReport'];
    const cvdValue = state.metadata['contrast:cvd'];
    if (cvdValue === undefined || complianceValue === undefined || !ComplianceReportEntity.validate(complianceValue)) {
      throw new TypeError('The contrast plugin did not return complete compliance metadata.');
    }
    const cvd = CvdResultSetEntity.intake(cvdValue);
    if (!complianceValue.compliant) {
      throw new RangeError('The palette does not satisfy every configured contrast contract.');
    }
    CategoryColorService.assertCompleteCvdResults(cvd);
    const emittedRoles = CategoryColorService.emittedRoles(state, cssVars);
    const wcagPairs = CategoryColorService.finalWcagEvidence(emittedRoles);
    CategoryColorService.assertFinalCvd(emittedRoles);
    const result = { 'compliance': complianceValue, 'cvd': cvd, 'wcagPairs': wcagPairs };
    return result;
  }

  private static finalWcagEvidence(
    roles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): CategoryWcagPairInterface[] {
    const evidence: CategoryWcagPairInterface[] = [];
    const configuredPairs = categoryW3cRoleSchema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < configuredPairs.length; pairIndex += 1) {
      const configuredPair = configuredPairs[pairIndex];
      if (configuredPair === undefined) {
        throw new RangeError('The category contrast-pair list contains an empty entry.');
      }
      const pair = ContrastPairEntity.intake(configuredPair);
      const foreground = roles.get(pair.foreground);
      const background = roles.get(pair.background);
      const required = pair.minimumContrastRatio;
      if (foreground === undefined || background === undefined || required === undefined) {
        throw new RangeError(`WCAG audit cannot resolve ${pair.foreground} on ${pair.background}.`);
      }
      const actual = contrastWcag21.apply(foreground, background);
      if (actual < required) {
        throw new RangeError(`${pair.foreground} on ${pair.background} does not meet ${required}:1 WCAG contrast.`);
      }
      evidence.push({ 'actual': actual, 'background': pair.background, 'foreground': pair.foreground, 'required': required });
    }
    return evidence;
  }

  private static thresholdFor(
    cvd: CvdMatrixEntity.Type
  ): { readonly 'dropMagnitude': number; readonly 'minimumSimulatedContrast': number } {
    if (cvd.name === 'achromatopsia') {
      const result = CVD_THRESHOLDS.achromatopsia;
      return result;
    }
    if (cvd.name === 'deuteranopia') {
      const result = CVD_THRESHOLDS.deuteranopia;
      return result;
    }
    if (cvd.name === 'protanopia') {
      const result = CVD_THRESHOLDS.protanopia;
      return result;
    }
    if (cvd.name === 'tritanopia') {
      const result = CVD_THRESHOLDS.tritanopia;
      return result;
    }
    throw new RangeError(`Unsupported CVD matrix name: ${cvd.name}`);
  }

  private static assertFinalCvd(roles: ReadonlyMap<string, ColorRecordEntity.Type>): void {
    const epsilon = 1e-12;
    const pairs = categoryW3cRoleSchema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = pairs[pairIndex];
      if (pair === undefined) {
        throw new RangeError('The category contrast-pair list contains an empty entry.');
      }
      const foreground = roles.get(pair.foreground);
      const background = roles.get(pair.background);
      if (foreground === undefined || background === undefined) {
        throw new RangeError(`CVD audit cannot resolve ${pair.foreground} on ${pair.background}.`);
      }
      const originalContrast = contrastWcag21.apply(foreground, background);
      for (let matrixIndex = 0; matrixIndex < cvdMatrices.length; matrixIndex += 1) {
        const matrix = cvdMatrices[matrixIndex];
        if (matrix === undefined) {
          throw new RangeError('The CVD matrix list contains an empty entry.');
        }
        const simulatedContrast = CategoryColorService.rgbContrast(
          CategoryColorService.simulateCvd(RgbEntity.intake(foreground.rgb), matrix),
          CategoryColorService.simulateCvd(RgbEntity.intake(background.rgb), matrix)
        );
        const threshold = CategoryColorService.thresholdFor(matrix);
        if (Math.abs(originalContrast - simulatedContrast) > threshold.dropMagnitude + epsilon || simulatedContrast < threshold.minimumSimulatedContrast - epsilon) {
          throw new RangeError(`${pair.foreground} on ${pair.background} fails the final ${matrix.name} audit.`);
        }
      }
    }
  }

  private static emittedRoles(
    state: PaletteStateInterface,
    cssVars: CssVarsOutputInterface
  ): ReadonlyMap<string, ColorRecordEntity.Type> {
    const declarations = new Map<string, string>();
    const lines = cssVars.scopedBlock.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (line === undefined) {
        throw new RangeError('The stylesheet output contains an empty line entry.');
      }
      const match = CATEGORY_COLOR_SERVICE_CONSTANTS.cssCustomPropertyDeclarationPattern.exec(line);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        declarations.set(match[1], match[2]);
      }
    }

    const emittedRoles = new Map<string, ColorRecordEntity.Type>();
    const roles = categoryW3cRoleSchema.roles;
    for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
      const role = roles[roleIndex];
      if (role === undefined) {
        throw new RangeError('The category role list contains an empty entry.');
      }
      const property = cssVars.map[role.name];
      const emittedHex = property === undefined ? undefined : declarations.get(property);
      const resolvedRole = state.roles[role.name];
      if (emittedHex === undefined || resolvedRole === undefined) {
        throw new TypeError(`The stylesheet output omitted the ${role.name} role.`);
      }
      const emittedRole = colorRecordFactory.fromHex(emittedHex);
      if (emittedRole.hex.toLowerCase() !== resolvedRole.hex.toLowerCase()) {
        throw new TypeError(`The emitted ${role.name} value does not match the terminal palette.`);
      }
      emittedRoles.set(role.name, emittedRole);
    }
    return emittedRoles;
  }

  private static luminance(rgb: RgbEntity.Type): number {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
    return result;
  }

  private static rgbContrast(foreground: RgbEntity.Type, background: RgbEntity.Type): number {
    const foregroundLuminance = CategoryColorService.luminance(foreground);
    const backgroundLuminance = CategoryColorService.luminance(background);
    const result = (
      Math.max(foregroundLuminance, backgroundLuminance) + 0.05
    ) / (
      Math.min(foregroundLuminance, backgroundLuminance) + 0.05
    );
    return result;
  }

  private static simulateCvd(
    rgb: RgbEntity.Type,
    cvd: CvdMatrixEntity.Type
  ): RgbEntity.Type {
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

export const categoryColorService = CategoryColorService.shared();
