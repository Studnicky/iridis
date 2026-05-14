import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { clusterMedianCut, getOrCreateMetadata } from '@studnicky/iridis';

/**
 * `gallery:extract`
 *
 * Reads `state.colors` (raw image pixels as ColorRecordInterface[]), runs
 * median-cut clustering via the `clusterMedianCut` math primitive, and
 * reduces the set to K representative colors.
 *
 * Configuration (via `state.metadata.gallery`):
 *   k — number of dominant colors to extract (default: 5)
 *
 * Writes:
 *   state.metadata.gallery.dominantColors — the K representative colors
 *   state.colors                          — replaced with the K-color set
 */
export class GalleryExtract implements TaskInterface {
  readonly 'name' = 'gallery:extract';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'gallery:extract',
    'reads':       ['colors', 'metadata.gallery.k'],
    'writes':      ['colors', 'metadata.gallery.dominantColors'],
    'description': 'Reduce image pixels to K dominant colors via median-cut clustering',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const galleryMeta = getOrCreateMetadata(state, 'gallery');
    const k = galleryMeta['k'] ?? 5;

    ctx.logger.debug('GalleryExtract', 'run', 'extracting dominant colors', { 'inputCount': state.colors.length, 'k': k });

    if (state.colors.length === 0) {
      ctx.logger.warn('GalleryExtract', 'run', 'state.colors is empty — nothing to extract');
      return;
    }

    const clamp = Math.min(k, state.colors.length);

    const dominant = clusterMedianCut.apply(state.colors, clamp);

    galleryMeta['dominantColors'] = dominant;

    state.colors.splice(0, state.colors.length, ...dominant);

    ctx.logger.info('GalleryExtract', 'run', 'extraction complete', { 'dominantCount': dominant.length });
  }
}

export const galleryExtract = new GalleryExtract();
