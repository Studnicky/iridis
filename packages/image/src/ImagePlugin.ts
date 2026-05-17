import type {
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { galleryAssignRoles } from './tasks/GalleryAssignRoles.ts';
import { galleryExtract }     from './tasks/GalleryExtract.ts';
import { galleryHarmonize }   from './tasks/GalleryHarmonize.ts';
import { galleryHistogram }   from './tasks/GalleryHistogram.ts';

/**
 * ImagePlugin
 *
 * Provides four tasks for image-derived palette extraction:
 *   gallery:histogram   — quantise pixels into a weighted 5-bpc histogram
 *   gallery:extract     — reduce records to K dominant colors (median-cut or deltaE-merge)
 *   gallery:assignRoles — map dominant colors to gallery roles
 *   gallery:harmonize   — shift accent hue if too close to frame
 */
export class ImagePlugin implements PluginInterface {
  readonly 'name'    = 'image';

  readonly 'version' = '0.2.0';

  tasks(): readonly TaskInterface[] {
    return [galleryHistogram, galleryExtract, galleryAssignRoles, galleryHarmonize];
  }
}

export const imagePlugin = new ImagePlugin();
