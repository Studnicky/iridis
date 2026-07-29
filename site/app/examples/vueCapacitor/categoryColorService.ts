import type { StatusBarOutputInterfaceType } from '@studnicky/iridis-capacitor/types';
import type {
  ApcaPairResultSetInterfaceType,
  CvdMatrixInterfaceType,
  CvdResultSetInterfaceType,
  WcagPairResultSetInterfaceType
} from '@studnicky/iridis-contrast';
import type { CssVarsOutputInterfaceType } from '@studnicky/iridis-stylesheet/types';
import type {
  ColorRecordInterfaceType,
  ContrastPairInterfaceType,
  PaletteStateInterface,
  RgbInterfaceType
} from '@studnicky/iridis/types';

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

import { categoryW3cRoleSchema } from './categoryW3cRoleSchema.ts';
import { CATEGORY_COLOR_SERVICE_CONSTANTS } from './constants/CategoryColorServiceConstants.ts';

class CategoryColorService {
  private readonly engine: Engine;

  // #region construct
  private constructor() {
    this.engine = new Engine();
    for (const task of coreTasks) {
      this.engine.tasks.register(task);
    }
    this.engine.adopt(contrastPlugin);
    this.engine.adopt(stylesheetPlugin);
    this.engine.adopt(capacitorPlugin);
    /* The recipe evaluates the declared pairs through WCAG AA/AAA and
       APCA, then corrects remaining CVD instability before emission. */
    this.engine.pipeline([
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
  }
  // #endregion construct

  private static instance: CategoryColorService | undefined;

  static shared(): CategoryColorService {
    CategoryColorService.instance ??= new CategoryColorService();
    return CategoryColorService.instance;
  }

  // #region apply
  apply(category: string, seed: string): {
    readonly 'apca': ApcaPairResultSetInterfaceType;
    readonly 'cssVars': CssVarsOutputInterfaceType;
    readonly 'cvd': CvdResultSetInterfaceType;
    readonly 'statusBar': StatusBarOutputInterfaceType;
    readonly 'wcagAa': WcagPairResultSetInterfaceType;
    readonly 'wcagAaa': WcagPairResultSetInterfaceType;
  } {
    CategoryColorService.assertCategory(category);
    const state = this.engine.run({
      'bypass': undefined,
      'colors': [seed],
      'contrast': {
        'algorithm': 'wcag21',
        'cvdCorrect': true,
        'extra': CategoryColorService.apcaPairs(),
        'level': 'AAA'
      },
      'emit': undefined,
      'maxColors': undefined,
      'metadata': {
        'category': category,
        'cssVarPrefix': '--c-',
        'scopeAttr': 'data-category',
        'scopePrefix': 'category',
        'themeName': category
      },
      'roles': categoryW3cRoleSchema,
      'runtime': undefined
    });
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
      'apca': contrastEvidence.apca,
      'cssVars': cssVars,
      'cvd': contrastEvidence.cvd,
      'statusBar': statusBar,
      'wcagAa': contrastEvidence.wcagAa,
      'wcagAaa': contrastEvidence.wcagAaa
    };
  }
  // #endregion apply

  private static assertCategory(category: string): void {
    if (!CATEGORY_COLOR_SERVICE_CONSTANTS.categoryNamePattern.test(category)) {
      throw new TypeError('Category names must be lowercase kebab-case identifiers.');
    }
  }

  private static apcaPairs(): ContrastPairInterfaceType[] {
    const pairs: ContrastPairInterfaceType[] = [];
    for (const pair of categoryW3cRoleSchema.contrastPairs ?? []) {
      if ((pair.algorithm ?? 'wcag21') === 'wcag21') {
        pairs.push({
          ...pair,
          'algorithm': 'apca'
        });
      }
    }
    return pairs;
  }

  private static cssVarsOutput(value: unknown): CssVarsOutputInterfaceType {
    if (!CategoryColorService.isCssVarsOutput(value)) {
      throw new TypeError('The stylesheet plugin returned an invalid css-vars output.');
    }
    return value;
  }

  private static isCssVarsOutput(value: unknown): value is CssVarsOutputInterfaceType {
    if (!CategoryColorService.isRecord(value)) {
      return false;
    }
    return (
      typeof value.darkScheme === 'string'
      && typeof value.forcedColors === 'string'
      && typeof value.full === 'string'
      && CategoryColorService.isStringRecord(value.map)
      && typeof value.rootBlock === 'string'
      && typeof value.scopedBlock === 'string'
      && typeof value.wideGamut === 'string'
    );
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static isStatusBarOutput(value: unknown): value is StatusBarOutputInterfaceType {
    if (!CategoryColorService.isRecord(value)) {
      return false;
    }
    return (
      typeof value.backgroundColor === 'string'
      && typeof value.overlay === 'boolean'
      && (value.style === 'DARK' || value.style === 'LIGHT')
    );
  }

  private static isStringRecord(value: unknown): value is Record<string, string> {
    if (!CategoryColorService.isRecord(value)) {
      return false;
    }
    for (const member of Object.values(value)) {
      if (typeof member !== 'string') {
        return false;
      }
    }
    return true;
  }

  private static statusBarOutput(value: unknown): StatusBarOutputInterfaceType {
    if (!CategoryColorService.isStatusBarOutput(value)) {
      throw new TypeError('The Capacitor plugin returned an invalid status-bar output.');
    }
    return value;
  }

  private static contrastEvidence(
    state: PaletteStateInterface,
    cssVars: CssVarsOutputInterfaceType
  ): {
    readonly 'apca': ApcaPairResultSetInterfaceType;
    readonly 'cvd': CvdResultSetInterfaceType;
    readonly 'wcagAa': WcagPairResultSetInterfaceType;
    readonly 'wcagAaa': WcagPairResultSetInterfaceType;
  } {
    const apca = getContrastMetadata(state.metadata, 'contrast:apca');
    const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
    const wcagAa = getContrastMetadata(state.metadata, 'contrast:aa');
    const wcagAaa = getContrastMetadata(state.metadata, 'contrast:aaa');
    if (apca === undefined || cvd === undefined || wcagAa === undefined || wcagAaa === undefined) {
      throw new TypeError('The contrast plugin did not return complete enforcement metadata.');
    }
    if (
      apca.pairs.some((pair) => {return !pair.pass;})
      || wcagAa.pairs.some((pair) => {return !pair.pass;})
      || wcagAaa.pairs.some((pair) => {return !pair.pass;})
    ) {
      throw new RangeError('The palette does not satisfy every configured contrast contract.');
    }
    if (
      cvd.corrections === undefined
      || cvd.warnings.length > 0
      || cvd.corrections.some((correction) => {return correction.cvdTypesRemaining.length > 0;})
    ) {
      throw new RangeError('The palette retains correctable color-vision-deficiency warnings.');
    }
    const emittedRoles = CategoryColorService.emittedRoles(state, cssVars);
    const finalWcagAa: WcagPairResultSetInterfaceType['pairs'] = [];
    const finalWcagAaa: WcagPairResultSetInterfaceType['pairs'] = [];

    for (const pair of categoryW3cRoleSchema.contrastPairs ?? []) {
      if ((pair.algorithm ?? 'wcag21') !== 'wcag21') {
        continue;
      }
      const aaResult = CategoryColorService.wcagResult(wcagAa, pair);
      const aaaResult = CategoryColorService.wcagResult(wcagAaa, pair);
      const foreground = emittedRoles[pair.foreground];
      const background = emittedRoles[pair.background];
      if (
        aaResult === undefined
        || aaaResult === undefined
        || foreground === undefined
        || background === undefined
      ) {
        throw new RangeError(
          `WCAG enforcement did not evaluate ${pair.foreground} on ${pair.background}.`
        );
      }

      const actualRatio = contrastWcag21.apply(foreground, background);
      if (
        !aaResult.pass
        || !aaaResult.pass
        || aaResult.required < pair.minRatio
        || aaaResult.required < pair.minRatio
        || actualRatio < pair.minRatio
      ) {
        throw new RangeError(
          `${pair.foreground} on ${pair.background} does not meet ${pair.minRatio}:1 WCAG contrast.`
        );
      }
      finalWcagAa.push({ ...aaResult, 'after': actualRatio, 'pass': true });
      finalWcagAaa.push({ ...aaaResult, 'after': actualRatio, 'pass': true });
    }

    const finalApca: ApcaPairResultSetInterfaceType['pairs'] = [];
    for (const pair of CategoryColorService.apcaPairs()) {
      const result = CategoryColorService.apcaResult(apca, pair);
      const foreground = emittedRoles[pair.foreground];
      const background = emittedRoles[pair.background];
      if (result === undefined || foreground === undefined || background === undefined) {
        throw new RangeError(
          `APCA enforcement did not evaluate ${pair.foreground} on ${pair.background}.`
        );
      }
      const actualLc = Math.abs(contrastApca.apply(foreground, background));
      if (!result.pass || actualLc < result.requiredLc) {
        throw new RangeError(
          `${pair.foreground} on ${pair.background} does not meet APCA Lc ${result.requiredLc}.`
        );
      }
      finalApca.push({
        ...result,
        'afterLc': actualLc,
        'pass': true
      });
    }

    CategoryColorService.assertFinalCvd(emittedRoles);

    return {
      'apca': { 'pairs': finalApca },
      'cvd': cvd,
      'wcagAa': { 'pairs': finalWcagAa },
      'wcagAaa': { 'pairs': finalWcagAaa }
    };
  }

  private static apcaResult(
    results: ApcaPairResultSetInterfaceType,
    pair: ContrastPairInterfaceType
  ): ApcaPairResultSetInterfaceType['pairs'][number] | undefined {
    for (const result of results.pairs) {
      if (result.background === pair.background && result.foreground === pair.foreground) {
        return result;
      }
    }
    return undefined;
  }

  private static assertFinalCvd(roles: Record<string, ColorRecordInterfaceType>): void {
    const epsilon = 1e-12;
    for (const pair of categoryW3cRoleSchema.contrastPairs ?? []) {
      const foreground = roles[pair.foreground];
      const background = roles[pair.background];
      if (foreground === undefined || background === undefined) {
        throw new RangeError(
          `CVD audit cannot resolve ${pair.foreground} on ${pair.background}.`
        );
      }
      const originalContrast = contrastWcag21.apply(foreground, background);
      for (const matrix of cvdMatrices) {
        const simulatedContrast = CategoryColorService.rgbContrast(
          CategoryColorService.simulateCvd(foreground.rgb, matrix),
          CategoryColorService.simulateCvd(background.rgb, matrix)
        );
        const threshold = CVD_THRESHOLDS[matrix.name];
        if (
          Math.abs(originalContrast - simulatedContrast) > threshold.dropMagnitude + epsilon
          || simulatedContrast < threshold.minSimulatedContrast - epsilon
        ) {
          throw new RangeError(
            `${pair.foreground} on ${pair.background} fails the final ${matrix.name} audit.`
          );
        }
      }
    }
  }

  private static emittedRoles(
    state: PaletteStateInterface,
    cssVars: CssVarsOutputInterfaceType
  ): Record<string, ColorRecordInterfaceType> {
    const declarations = new Map<string, string>();
    for (const line of cssVars.scopedBlock.split('\n')) {
      const match = CATEGORY_COLOR_SERVICE_CONSTANTS.cssCustomPropertyDeclarationPattern.exec(line);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        declarations.set(match[1], match[2]);
      }
    }

    const emittedRoles: Record<string, ColorRecordInterfaceType> = {};
    for (const role of categoryW3cRoleSchema.roles) {
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
      emittedRoles[role.name] = emittedRole;
    }
    return emittedRoles;
  }

  private static luminance(rgb: RgbInterfaceType): number {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    return 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
  }

  private static rgbContrast(foreground: RgbInterfaceType, background: RgbInterfaceType): number {
    const foregroundLuminance = CategoryColorService.luminance(foreground);
    const backgroundLuminance = CategoryColorService.luminance(background);
    return (
      Math.max(foregroundLuminance, backgroundLuminance) + 0.05
    ) / (
      Math.min(foregroundLuminance, backgroundLuminance) + 0.05
    );
  }

  private static simulateCvd(
    rgb: RgbInterfaceType,
    cvd: CvdMatrixInterfaceType
  ): RgbInterfaceType {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const matrix = cvd.matrix;
    return linearToSrgb.apply(
      clamp01.apply(matrix[0] * linear.r + matrix[1] * linear.g + matrix[2] * linear.b),
      clamp01.apply(matrix[3] * linear.r + matrix[4] * linear.g + matrix[5] * linear.b),
      clamp01.apply(matrix[6] * linear.r + matrix[7] * linear.g + matrix[8] * linear.b)
    );
  }

  private static wcagResult(
    results: WcagPairResultSetInterfaceType,
    pair: ContrastPairInterfaceType
  ): WcagPairResultSetInterfaceType['pairs'][number] | undefined {
    for (const result of results.pairs) {
      if (result.background === pair.background && result.foreground === pair.foreground) {
        return result;
      }
    }
    return undefined;
  }
}

export const categoryColorService = CategoryColorService.shared();
