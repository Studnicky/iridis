import type {
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { galleryAssignRoles } from './tasks/GalleryAssignRoles.ts';
import { galleryExtract }     from './tasks/GalleryExtract.ts';
import { galleryHarmonize }   from './tasks/GalleryHarmonize.ts';

/**
 * GalleryPlugin
 *
 * Provides three tasks for art-gallery chrome re-skinning:
 *   gallery:extract     — reduce image pixels to K dominant colors
 *   gallery:assignRoles — map dominant colors to gallery roles
 *   gallery:harmonize   — shift accent hue if too close to frame
 */
export class GalleryPlugin implements PluginInterface {
  readonly 'name'    = 'gallery';
  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [galleryExtract, galleryAssignRoles, galleryHarmonize];
  }
}

export const galleryPlugin = new GalleryPlugin();
