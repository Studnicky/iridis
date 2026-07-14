import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { galleryAssignRoles }       from './tasks/GalleryAssignRoles.ts';
import { galleryExtract }           from './tasks/GalleryExtract.ts';
import { galleryExtractCandidates } from './tasks/GalleryExtractCandidates.ts';
import { galleryHarmonize }         from './tasks/GalleryHarmonize.ts';
import { galleryHistogram }         from './tasks/GalleryHistogram.ts';

const galleryHistogramSchema = {
  'additionalProperties': false,
  'properties': {
    'binCount':    { 'minimum': 0, 'type': 'number' },
    'bins':        { 'type': 'array' },
    'totalPixels': { 'minimum': 0, 'type': 'number' }
  },
  'type': 'object'
} as const;

const galleryDominantColorsSchema = {
  'type': 'array'
} as const;

const galleryHarmonizedSchema = {
  'type': 'boolean'
} as const;

const galleryCandidatesSchema = {
  'items': {
    'additionalProperties': false,
    'properties': {
      'algorithm': { 'type': 'string' },
      'colors':    { 'type': 'array' },
      'k':         { 'minimum': 0, 'type': 'number' },
      'label':     { 'type': 'string' }
    },
    'required': ['algorithm', 'k', 'label', 'colors'],
    'type': 'object'
  },
  'type': 'array'
} as const;

/**
 * ImagePlugin
 *
 * Provides five tasks for image-derived palette extraction:
 *   gallery:histogram:          quantise pixels into a weighted 5-bpc histogram
 *   gallery:extract:            reduce records to K dominant colors (median-cut or deltaE-merge)
 *   gallery:extractCandidates:  non-destructively collect several labeled candidate palettes
 *   gallery:assignRoles:        map dominant colors to gallery roles
 *   gallery:harmonize:          shift accent hue if too close to frame
 */
export class ImagePlugin implements PluginInterface {
  readonly 'name'    = 'image';

  readonly 'version' = '0.2.0';

  tasks(): readonly TaskInterface[] {
    return [galleryHistogram, galleryExtract, galleryExtractCandidates, galleryAssignRoles, galleryHarmonize];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'metadata': {
        'gallery:candidates':     galleryCandidatesSchema,
        'gallery:dominantColors': galleryDominantColorsSchema,
        'gallery:harmonized':    galleryHarmonizedSchema,
        'gallery:histogram':     galleryHistogramSchema
      }
    };
  }
}

/** Singleton instance registered as the `image` plugin. */
export const imagePlugin = new ImagePlugin();
