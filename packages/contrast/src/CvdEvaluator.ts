import type { ColorRecordEntity } from '@studnicky/iridis';

import { clamp01, linearToSrgb, srgbToLinear } from '@studnicky/iridis';

import type { CvdFailurePolicy } from './CvdFailurePolicy.ts';
import type { CvdEvalEntity } from './entities/CvdEvalEntity.ts';
import type { CvdMatrixEntity } from './entities/CvdMatrixEntity.ts';
import type { CvdPairWarningEntity } from './entities/CvdPairWarningEntity.ts';

import { cvdMatrices } from './data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from './data/cvdThresholds.ts';

/** Pure CVD simulation and floor/drop evaluation shared by correction and terminal reporting. */
export class CvdEvaluator {
  static readonly #EPSILON = 1e-12;
  static readonly #matricesByName = new Map<string, CvdMatrixEntity.Type>(
    cvdMatrices.map((matrix) => { return [matrix.name, matrix]; })
  );

  static color(
    rgb: ColorRecordEntity.Type['rgb'],
    cvd: CvdMatrixEntity.Type
  ): ColorRecordEntity.Type['rgb'] {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const matrix = cvd.matrix;
    const r = clamp01.apply(matrix[0] * linear.r + matrix[1] * linear.g + matrix[2] * linear.b);
    const g = clamp01.apply(matrix[3] * linear.r + matrix[4] * linear.g + matrix[5] * linear.b);
    const b = clamp01.apply(matrix[6] * linear.r + matrix[7] * linear.g + matrix[8] * linear.b);
    const encoded = linearToSrgb.apply(r, g, b);
    const result = { 'b': encoded.b, 'g': encoded.g, 'r': encoded.r };
    return result;
  }

  static contrast(
    foreground: ColorRecordEntity.Type['rgb'],
    background: ColorRecordEntity.Type['rgb']
  ): number {
    const result = CvdEvaluator.contrastFromLuminances(
      CvdEvaluator.luminance(foreground),
      CvdEvaluator.luminance(background)
    );
    return result;
  }

  static contrastFromLuminances(foreground: number, background: number): number {
    const lighter = Math.max(foreground, background);
    const darker = Math.min(foreground, background);
    const result = (lighter + 0.05) / (darker + 0.05);
    return result;
  }

  static evaluate(
    foreground: ColorRecordEntity.Type['rgb'],
    background: ColorRecordEntity.Type['rgb'],
    originalContrast: number,
    requiredTrichromat: number,
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type[] {
    const result: CvdEvalEntity.Type[] = [];
    for (let index = 0; index < cvdMatrices.length; index += 1) {
      const cvd = cvdMatrices[index];
      if (cvd === undefined) {
        continue;
      }
      const simulatedContrast = CvdEvaluator.contrast(
        CvdEvaluator.color(foreground, cvd),
        CvdEvaluator.color(background, cvd)
      );
      result.push(CvdEvaluator.evaluateMeasurements(
        cvd,
        originalContrast,
        simulatedContrast,
        requiredTrichromat,
        failurePolicy
      ));
    }
    return result;
  }

  static evaluateMeasurements(
    cvd: CvdMatrixEntity.Type,
    originalContrast: number,
    simulatedContrast: number,
    requiredTrichromat: number,
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type {
    const threshold = CVD_THRESHOLDS[cvd.name];
    const result = CvdEvaluator.fromMeasurements(
      cvd,
      originalContrast,
      simulatedContrast,
      Math.max(threshold.minimumSimulatedContrast, requiredTrichromat),
      threshold.dropMagnitude,
      CvdEvaluator.#EPSILON,
      failurePolicy
    );
    return result;
  }

  static fromWarning(
    warning: CvdPairWarningEntity.Type,
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type {
    const cvd = CvdEvaluator.matrixFor(warning.cvdType);
    const result = CvdEvaluator.fromMeasurements(
      cvd,
      warning.originalLuminanceContrast,
      warning.simulatedLuminanceContrast,
      warning.minimumSimulatedContrast,
      warning.dropThreshold,
      // Serialized warning values retain their exact terminal threshold semantics.
      0,
      failurePolicy
    );
    return result;
  }

  static luminance(rgb: ColorRecordEntity.Type['rgb']): number {
    const linear = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
    return result;
  }

  static simulatedLuminances(
    rgb: ColorRecordEntity.Type['rgb'],
    cache: Map<string, readonly number[]>,
    key: string
  ): readonly number[] {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result: number[] = [];
    for (let index = 0; index < cvdMatrices.length; index += 1) {
      const cvd = cvdMatrices[index];
      if (cvd === undefined) {
        throw new TypeError('CVD simulation matrix is missing');
      }
      result.push(CvdEvaluator.luminance(CvdEvaluator.color(rgb, cvd)));
    }
    cache.set(key, result);
    return result;
  }

  private static matrixFor(value: string): CvdMatrixEntity.Type {
    const result = CvdEvaluator.#matricesByName.get(value);
    if (result === undefined) {
      throw new TypeError(`Unknown CVD type: ${value}`);
    }
    return result;
  }

  private static fromMeasurements(
    cvd: CvdMatrixEntity.Type,
    originalContrast: number,
    simulatedContrast: number,
    requiredContrast: number,
    dropThreshold: number,
    epsilon: number,
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type {
    const drop = originalContrast - simulatedContrast;
    const belowFloor = simulatedContrast < requiredContrast - epsilon;
    const exceedsDrop = Math.abs(drop) > dropThreshold + epsilon;
    const result: CvdEvalEntity.Type = {
      'belowFloor': belowFloor,
      'cvdType': cvd.name,
      'drop': drop,
      'exceedsDrop': exceedsDrop,
      'fail': false,
      'originalContrast': originalContrast,
      'simContrast': simulatedContrast
    };
    result.fail = failurePolicy.blocks(result);
    return result;
  }
}
