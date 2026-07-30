import type {
  PluginInterface,
  PluginSchemaContributionInterfaceType,
  TaskInterface
} from '@studnicky/iridis';

import { IMAGE_PLUGIN_SCHEMAS } from './constants/ImagePluginSchemas.ts';
import { galleryAssignRoles }       from './tasks/GalleryAssignRoles.ts';
import { galleryExtract }           from './tasks/GalleryExtract.ts';
import { galleryExtractCandidates } from './tasks/GalleryExtractCandidates.ts';
import { galleryHarmonize }         from './tasks/GalleryHarmonize.ts';
import { galleryHistogram }         from './tasks/GalleryHistogram.ts';

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

  schemas(): PluginSchemaContributionInterfaceType {
    return {
      'metadata': {
        'gallery:candidates':     IMAGE_PLUGIN_SCHEMAS.GALLERY_CANDIDATES,
        'gallery:dominantColors': IMAGE_PLUGIN_SCHEMAS.GALLERY_DOMINANT_COLORS,
        'gallery:harmonized':    IMAGE_PLUGIN_SCHEMAS.GALLERY_HARMONIZED,
        'gallery:histogram':     IMAGE_PLUGIN_SCHEMAS.GALLERY_HISTOGRAM
      },
      'outputs': undefined
    };
  }
}
