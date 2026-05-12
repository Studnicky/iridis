import type {
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { galleryAssignRoles } from './tasks/GalleryAssignRoles.ts';
import { galleryExtract }     from './tasks/GalleryExtract.ts';
import { galleryHarmonize }   from './tasks/GalleryHarmonize.ts';

/**
 * ImagePlugin
 *
 * Provides three tasks for image-derived palette extraction:
 *   gallery:extract     — reduce image pixels to K dominant colors
 *   gallery:assignRoles — map dominant colors to gallery roles
 *   gallery:harmonize   — shift accent hue if too close to frame
 */
export class ImagePlugin implements PluginInterface {
  readonly 'name'    = 'image';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [galleryExtract, galleryAssignRoles, galleryHarmonize];
  }
}

export const imagePlugin = new ImagePlugin();
