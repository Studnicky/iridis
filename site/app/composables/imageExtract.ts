import type { Engine } from '@studnicky/iridis';

import { InputEntity } from '@studnicky/iridis';
import { imagePlugin } from '@studnicky/iridis-image';
import { JsonValue } from '@studnicky/types/browser';

import type { ExtractionSettingsEntity } from './entities/ExtractionSettingsEntity.ts';
import type { WorkerMessageEntity } from './entities/WorkerMessageEntity.ts';
import type { ImagePixels } from './imagePixels.ts';

import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { cloneRanges } from '../utils/cloneRanges.ts';
import { isValidHex } from '../utils/isValidHex.ts';
import { IRIDIS_CONSTANTS } from './constants/IridisConstants.ts';
import { ContrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { ImageCombineResultEntity } from './entities/ImageCombineResultEntity.ts';
import { ImageExtractionResultEntity } from './entities/ImageExtractionResultEntity.ts';
import { GalleryMetadataSlot } from './galleryMetadataSlot.ts';
import { roleSchemaFor } from './roleSchemaFor.ts';
import { schemaRoleCount } from './schemaRoleCount.ts';
import { VARIANT_CONFIG } from './variantConfig.ts';

const HISTOGRAM_BIN_LIMIT = 96;

/** Runs the image engine stages: per-image extraction and the combine extraction; executes inside the engine worker. */
export class ImageExtract {
  public static combine(message: Extract<WorkerMessageEntity.Type, { 'kind': 'combine' }>): ImageCombineResultEntity.Type {
    const pair = roleSchemaByName[message.schemaName];
    const selected = message.framing === 'dark' ? pair.dark : pair.light;
    const engine = ImageExtract.engine();
    engine.pipeline([...IRIDIS_CONSTANTS.COMBINE_EXTRACTION_STAGES]);
    const state = engine.run(InputEntity.create({
      'colors': message.hexes,
      'contrast': ContrastConfigFor.forStrictness(message.strictness),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(message.derivationConfig),
        'derivation:semanticHuesEnabled': JsonValue.from(message.semanticHuesEnabled),
        'gallery': ImageExtract.gallery(message.settings)
      },
      'roles': roleSchemaFor(selected),
      'runtime': { 'colorSpace': message.colorSpace, 'framing': message.framing }
    }));
    const dominant = GalleryMetadataSlot.dominantColors(state.metadata);
    const schemaCount = schemaRoleCount(message.schemaName);
    const extracted: string[] = [];
    for (let index = 0; index < dominant.length && extracted.length < schemaCount; index += 1) {
      const color = dominant[index];
      if (color !== undefined && isValidHex(color.hex)) { extracted.push(color.hex); }
    }
    const result = ImageCombineResultEntity.create({
      'candidates': GalleryMetadataSlot.candidates(state.metadata),
      'extracted': extracted,
      'histogram': ImageExtract.heaviestBins(state.metadata)
    });
    return result;
  }

  public static extract(settings: ExtractionSettingsEntity.Type, pixels: ImagePixels): ImageExtractionResultEntity.Type {
    const engine = ImageExtract.engine();
    engine.pipeline(IRIDIS_CONSTANTS.IMAGE_ENTRY_STAGES);
    const state = engine.run(InputEntity.create({
      'colors': [pixels.input()],
      'metadata': { 'gallery': ImageExtract.gallery(settings) }
    }));
    const dominant = GalleryMetadataSlot.dominantColors(state.metadata);
    const dominantColorRecords: { 'hex': string; 'weight': number }[] = [];
    for (let index = 0; index < dominant.length; index += 1) {
      const color = dominant[index];
      if (color === undefined) {
        throw new RangeError(`Dominant color list is missing entry ${index}`);
      }
      if (isValidHex(color.hex)) {
        dominantColorRecords.push({ 'hex': color.hex, 'weight': color.hints?.weight ?? 1 });
      }
    }
    const result = ImageExtractionResultEntity.create({
      'candidates': GalleryMetadataSlot.candidates(state.metadata),
      'dominantColorRecords': dominantColorRecords,
      'histogram': ImageExtract.heaviestBins(state.metadata)
    });
    return result;
  }

  private static engine(): Engine {
    const engine = createColorEngine();
    engine.adopt(imagePlugin);
    return engine;
  }

  private static gallery(settings: ExtractionSettingsEntity.Type): ReturnType<typeof JsonValue.from> {
    const result = JsonValue.from({
      'algorithm': settings.algorithm,
      'candidates': IRIDIS_CONSTANTS.ALL_CANDIDATE_ALGORITHM_NAMES.map((algorithm) => {
        const candidate = { 'algorithm': algorithm, 'k': settings.k, 'label': algorithm };
        return candidate;
      }),
      'chromaRange': cloneRanges(settings.chromaRange),
      'deltaECap': settings.deltaECap,
      'harmonizeThreshold': settings.harmonizeThreshold,
      'histogramBits': settings.histogramBits,
      'k': settings.k,
      'lightnessRange': cloneRanges(settings.lightnessRange)
    });
    return result;
  }

  private static heaviestBins(metadata: Parameters<typeof GalleryMetadataSlot.histogram>[0]): { 'hex': string; 'weight': number }[] {
    const sorted = [...GalleryMetadataSlot.histogram(metadata)].sort((left, right) => {
      const result = right.weight - left.weight;
      return result;
    });
    const result = sorted.slice(0, HISTOGRAM_BIN_LIMIT);
    return result;
  }
}
