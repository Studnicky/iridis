import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface
} from '@studnicky/iridis';
import type { StatusBarOutputInterfaceType } from '@studnicky/iridis-capacitor';
import type { CvdMatrixInterfaceTypeEntity } from '@studnicky/iridis-contrast';
import type { CssVarsOutputInterface } from '@studnicky/iridis-stylesheet';
import type { JSONSchema7Type } from 'json-schema';

import {
  clamp01,
  colorRecordFactory,
  contrastApca,
  ContrastPairInterfaceTypeEntity,
  contrastWcag21,
  coreTasks,
  Engine,
  InputInterfaceTypeEntity,
  linearToSrgb,
  RgbInterfaceTypeEntity,
  srgbToLinear
} from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';
import {
  ApcaPairResultSetInterfaceTypeEntity,
  contrastPlugin,
  CVD_THRESHOLDS,
  cvdMatrices,
  CvdResultSetInterfaceTypeEntity,
  WcagPairResultSetInterfaceTypeEntity
} from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';

import { categoryW3cRoleSchema } from './categoryW3cRoleSchema.ts';
import { CATEGORY_COLOR_SERVICE_CONSTANTS } from './constants/CategoryColorServiceConstants.ts';

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
    readonly 'apca': ApcaPairResultSetInterfaceTypeEntity.Type;
    readonly 'cssVars': CssVarsOutputInterface;
    readonly 'cvd': CvdResultSetInterfaceTypeEntity.Type;
    readonly 'statusBar': StatusBarOutputInterfaceType;
    readonly 'wcagAa': WcagPairResultSetInterfaceTypeEntity.Type;
    readonly 'wcagAaa': WcagPairResultSetInterfaceTypeEntity.Type;
  } {
    CategoryColorService.assertCategory(category);
    const state = this.engine.run(InputInterfaceTypeEntity.create({
      'colors': [seed],
      'contrast': {
        'algorithm': 'wcag21',
        'cvdCorrect': true,
        'extra': CategoryColorService.apcaPairs(),
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

  private static apcaPairs(): ContrastPairInterfaceTypeEntity.Type[] {
    const pairs: ContrastPairInterfaceTypeEntity.Type[] = [];
    const contrastPairs = categoryW3cRoleSchema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < contrastPairs.length; pairIndex += 1) {
      const pair = contrastPairs[pairIndex];
      if (pair === undefined) {
        throw new RangeError('The category contrast-pair list contains an empty entry.');
      }
      if ((pair.algorithm ?? 'wcag21') === 'wcag21') {
        pairs.push(ContrastPairInterfaceTypeEntity.intake({
          ...pair,
          'algorithm': 'apca'
        }));
      }
    }
    return pairs;
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

  private static isStatusBarOutput(value: JSONSchema7Type | undefined): value is StatusBarOutputInterfaceType {
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

  private static statusBarOutput(value: JSONSchema7Type | undefined): StatusBarOutputInterfaceType {
    if (!CategoryColorService.isStatusBarOutput(value)) {
      throw new TypeError('The Capacitor plugin returned an invalid status-bar output.');
    }
    const result = value;
    return result;
  }

  private static contrastMetadata(metadata: PaletteStateInterface['metadata']): {
    readonly 'apca': ApcaPairResultSetInterfaceTypeEntity.Type;
    readonly 'cvd': CvdResultSetInterfaceTypeEntity.Type;
    readonly 'wcagAa': WcagPairResultSetInterfaceTypeEntity.Type;
    readonly 'wcagAaa': WcagPairResultSetInterfaceTypeEntity.Type;
  } {
    const apcaValue = metadata['contrast:apca'];
    const cvdValue = metadata['contrast:cvd'];
    const wcagAaValue = metadata['contrast:aa'];
    const wcagAaaValue = metadata['contrast:aaa'];
    if (apcaValue === undefined || cvdValue === undefined || wcagAaValue === undefined || wcagAaaValue === undefined) {
      throw new TypeError('The contrast plugin did not return complete enforcement metadata.');
    }
    const result = {
      'apca': ApcaPairResultSetInterfaceTypeEntity.intake(apcaValue),
      'cvd': CvdResultSetInterfaceTypeEntity.intake(cvdValue),
      'wcagAa': WcagPairResultSetInterfaceTypeEntity.intake(wcagAaValue),
      'wcagAaa': WcagPairResultSetInterfaceTypeEntity.intake(wcagAaaValue)
    };
    return result;
  }

  private static assertPassingContrastResults(
    pairs: ApcaPairResultSetInterfaceTypeEntity.Type['pairs'] | WcagPairResultSetInterfaceTypeEntity.Type['pairs']
  ): void {
    const hasFailedPair = pairs.some((pair) => {
      const result = !pair.pass;
      return result;
    });
    if (hasFailedPair) {
      throw new RangeError('The palette does not satisfy every configured contrast contract.');
    }
  }

  private static assertCompleteCvdResults(results: CvdResultSetInterfaceTypeEntity.Type): void {
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
    readonly 'apca': ApcaPairResultSetInterfaceTypeEntity.Type;
    readonly 'cvd': CvdResultSetInterfaceTypeEntity.Type;
    readonly 'wcagAa': WcagPairResultSetInterfaceTypeEntity.Type;
    readonly 'wcagAaa': WcagPairResultSetInterfaceTypeEntity.Type;
  } {
    const metadata = CategoryColorService.contrastMetadata(state.metadata);
    const { apca, cvd, wcagAa, wcagAaa } = metadata;
    CategoryColorService.assertPassingContrastResults(apca.pairs);
    CategoryColorService.assertPassingContrastResults(wcagAa.pairs);
    CategoryColorService.assertPassingContrastResults(wcagAaa.pairs);
    CategoryColorService.assertCompleteCvdResults(cvd);
    const emittedRoles = CategoryColorService.emittedRoles(state, cssVars);
    const wcagEvidence = CategoryColorService.finalWcagEvidence(
      emittedRoles,
      wcagAa,
      wcagAaa
    );
    const apcaEvidence = CategoryColorService.finalApcaEvidence(emittedRoles, apca);
    CategoryColorService.assertFinalCvd(emittedRoles);

    const result = {
      'apca': { 'pairs': apcaEvidence },
      'cvd': cvd,
      'wcagAa': { 'pairs': wcagEvidence.aa },
      'wcagAaa': { 'pairs': wcagEvidence.aaa }
    };
    return result;
  }

  private static finalWcagEvidence(
    roles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>,
    wcagAa: WcagPairResultSetInterfaceTypeEntity.Type,
    wcagAaa: WcagPairResultSetInterfaceTypeEntity.Type
  ): {
    readonly 'aa': WcagPairResultSetInterfaceTypeEntity.Type['pairs'];
    readonly 'aaa': WcagPairResultSetInterfaceTypeEntity.Type['pairs'];
  } {
    const aa: WcagPairResultSetInterfaceTypeEntity.Type['pairs'] = [];
    const aaa: WcagPairResultSetInterfaceTypeEntity.Type['pairs'] = [];
    const configuredPairs = categoryW3cRoleSchema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < configuredPairs.length; pairIndex += 1) {
      const configuredPair = configuredPairs[pairIndex];
      if (configuredPair === undefined) {
        throw new RangeError('The category contrast-pair list contains an empty entry.');
      }
      if ((configuredPair.algorithm ?? 'wcag21') !== 'wcag21') {
        continue;
      }
      const pair = ContrastPairInterfaceTypeEntity.intake(configuredPair);
      const aaResult = CategoryColorService.wcagResult(wcagAa, pair);
      const aaaResult = CategoryColorService.wcagResult(wcagAaa, pair);
      const foreground = roles.get(pair.foreground);
      const background = roles.get(pair.background);
      if (aaResult === undefined || aaaResult === undefined || foreground === undefined || background === undefined) {
        throw new RangeError(`WCAG enforcement did not evaluate ${pair.foreground} on ${pair.background}.`);
      }
      const actualRatio = contrastWcag21.apply(foreground, background);
      const minimumContrastRatio = pair.minimumContrastRatio;
      if (minimumContrastRatio === undefined) {
        throw new RangeError(`WCAG pair ${pair.foreground} on ${pair.background} is missing its required minimum contrast ratio.`);
      }
      if (!aaResult.pass || !aaaResult.pass || aaResult.required < minimumContrastRatio || aaaResult.required < minimumContrastRatio || actualRatio < minimumContrastRatio) {
        throw new RangeError(`${pair.foreground} on ${pair.background} does not meet ${minimumContrastRatio}:1 WCAG contrast.`);
      }
      aa.push({ ...aaResult, 'after': actualRatio, 'pass': true });
      aaa.push({ ...aaaResult, 'after': actualRatio, 'pass': true });
    }
    const result = { 'aa': aa, 'aaa': aaa };
    return result;
  }

  private static finalApcaEvidence(
    roles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>,
    apca: ApcaPairResultSetInterfaceTypeEntity.Type
  ): ApcaPairResultSetInterfaceTypeEntity.Type['pairs'] {
    const finalApca: ApcaPairResultSetInterfaceTypeEntity.Type['pairs'] = [];
    const apcaPairs = CategoryColorService.apcaPairs();
    for (let pairIndex = 0; pairIndex < apcaPairs.length; pairIndex += 1) {
      const pair = apcaPairs[pairIndex];
      if (pair === undefined) {
        throw new RangeError('The APCA contrast-pair list contains an empty entry.');
      }
      const pairResult = CategoryColorService.apcaResult(apca, pair);
      const foreground = roles.get(pair.foreground);
      const background = roles.get(pair.background);
      if (pairResult === undefined || foreground === undefined || background === undefined) {
        throw new RangeError(`APCA enforcement did not evaluate ${pair.foreground} on ${pair.background}.`);
      }
      const actualLc = Math.abs(contrastApca.apply(foreground, background));
      if (!pairResult.pass || actualLc < pairResult.requiredLc) {
        throw new RangeError(`${pair.foreground} on ${pair.background} does not meet APCA Lc ${pairResult.requiredLc}.`);
      }
      finalApca.push({ ...pairResult, 'afterLc': actualLc, 'pass': true });
    }
    return finalApca;
  }

  private static apcaResult(
    results: ApcaPairResultSetInterfaceTypeEntity.Type,
    pair: ContrastPairInterfaceTypeEntity.Type
  ): ApcaPairResultSetInterfaceTypeEntity.Type['pairs'][number] | undefined {
    const result = results.pairs.find((candidate) => {
      const matchesPair = candidate.background === pair.background
        && candidate.foreground === pair.foreground;
      return matchesPair;
    });
    return result;
  }

  private static thresholdFor(
    cvd: CvdMatrixInterfaceTypeEntity.Type
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

  private static assertFinalCvd(roles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): void {
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
          CategoryColorService.simulateCvd(RgbInterfaceTypeEntity.intake(foreground.rgb), matrix),
          CategoryColorService.simulateCvd(RgbInterfaceTypeEntity.intake(background.rgb), matrix)
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
  ): ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type> {
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

    const emittedRoles = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
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

  private static luminance(rgb: RgbInterfaceTypeEntity.Type): number {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
    return result;
  }

  private static rgbContrast(foreground: RgbInterfaceTypeEntity.Type, background: RgbInterfaceTypeEntity.Type): number {
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
    rgb: RgbInterfaceTypeEntity.Type,
    cvd: CvdMatrixInterfaceTypeEntity.Type
  ): RgbInterfaceTypeEntity.Type {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const matrix = cvd.matrix;
    const result = linearToSrgb.apply(
      clamp01.apply(matrix[0] * linear.r + matrix[1] * linear.g + matrix[2] * linear.b),
      clamp01.apply(matrix[3] * linear.r + matrix[4] * linear.g + matrix[5] * linear.b),
      clamp01.apply(matrix[6] * linear.r + matrix[7] * linear.g + matrix[8] * linear.b)
    );
    return result;
  }

  private static wcagResult(
    results: WcagPairResultSetInterfaceTypeEntity.Type,
    pair: ContrastPairInterfaceTypeEntity.Type
  ): WcagPairResultSetInterfaceTypeEntity.Type['pairs'][number] | undefined {
    for (let resultIndex = 0; resultIndex < results.pairs.length; resultIndex += 1) {
      const result = results.pairs[resultIndex];
      if (result === undefined) {
        throw new RangeError('The WCAG result list contains an empty entry.');
      }
      if (result.background === pair.background && result.foreground === pair.foreground) {
        return result;
      }
    }
    return undefined;
  }
}

export const categoryColorService = CategoryColorService.shared();
