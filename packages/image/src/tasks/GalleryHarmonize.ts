import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { deltaE2000, getOrCreateMetadata, hueShift } from '@studnicky/iridis';

/**
 * `gallery:harmonize`
 *
 * Checks whether `accent` hue is too close to `frame` hue using deltaE2000.
 * If deltaE < 10, shifts the accent hue by 30° away from frame.
 *
 * Writes:
 *   state.roles.accent                      — potentially updated accent
 *   state.metadata.gallery.harmonized       — true/false
 *   state.metadata.gallery.harmonizeDetails — { before, after, deltaE } if changed
 */
function setHarmonized(state: PaletteStateInterface, value: boolean): void {
  getOrCreateMetadata(state, 'gallery')['harmonized'] = value;
}

export class GalleryHarmonize implements TaskInterface {
  readonly 'name' = 'gallery:harmonize';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'gallery:harmonize',
    'reads':       ['roles', 'metadata.gallery'],
    'writes':      ['roles.accent', 'metadata.gallery.harmonized'],
    'description': 'Shift accent hue by 30° when deltaE2000 vs frame is < 10',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const accent = state.roles['accent'];
    const frame  = state.roles['frame'];

    if (!accent || !frame) {
      ctx.logger.warn('GalleryHarmonize', 'run', 'accent or frame role missing — skipping harmonize');
      setHarmonized(state, false);
      return;
    }

    const galleryConfig = state.metadata['gallery'] as { 'harmonizeThreshold'?: number } | undefined;
    const threshold = galleryConfig?.harmonizeThreshold ?? 10;
    const deltaE = deltaE2000.apply(accent, frame);

    ctx.logger.debug('GalleryHarmonize', 'run', 'deltaE2000 between accent and frame', { 'deltaE': deltaE, 'threshold': threshold });

    if (deltaE >= threshold) {
      ctx.logger.info('GalleryHarmonize', 'run', 'accent hue is sufficiently distinct — no shift needed', { 'deltaE': deltaE });
      setHarmonized(state, false);
      return;
    }

    // Determine shift direction: move accent hue away from frame hue
    const accentHue = accent.oklch.h;
    const frameHue  = frame.oklch.h;
    const diff      = ((accentHue - frameHue + 540) % 360) - 180;
    // If diff > 0 accent is clockwise from frame → continue clockwise (+30)
    // If diff ≤ 0 accent is counterclockwise  → continue counterclockwise (-30)
    const shift    = diff > 0 ? 30 : -30;
    const newAccent = hueShift.apply(accent, shift);

    state.roles['accent'] = newAccent;

    const galleryMeta = getOrCreateMetadata(state, 'gallery');
    galleryMeta['harmonized'] = true;
    galleryMeta['harmonizeDetails'] = {
      'before':   accent.hex,
      'after':    newAccent.hex,
      'deltaE':   deltaE,
      'hueShift': shift,
    };

    ctx.logger.info('GalleryHarmonize', 'run', 'accent hue shifted', {
      'before':  accent.hex,
      'after':   newAccent.hex,
      'shift':   shift,
      'deltaE':  deltaE,
    });
  }
}

export const galleryHarmonize = new GalleryHarmonize();
