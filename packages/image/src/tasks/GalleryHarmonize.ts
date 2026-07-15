import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { deltaE2000, hueShift } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

/**
 * `gallery:harmonize`
 *
 * Checks whether `accent` hue is too close to `frame` hue using deltaE2000.
 * If deltaE < 10, shifts the accent hue by 30° away from frame.
 *
 * Writes:
 *   state.roles.accent:                        potentially updated accent
 *   state.metadata['gallery:harmonized']:      true/false
 *   state.metadata['gallery:harmonizeDetails']: { before, after, deltaE } if changed
 */

class GalleryHarmonize implements TaskInterface {
  readonly 'name' = 'gallery:harmonize';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Shift accent hue by 30° when deltaE2000 vs frame is < 10',
    'name':        'gallery:harmonize',
    'phase':       undefined,
    'reads':       ['roles', 'metadata.gallery'],
    'requires':    undefined,
    'writes':      ['roles.accent', 'metadata.gallery:harmonized']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const accent = state.roles.accent;
    const frame  = state.roles.frame;

    if (accent === undefined || frame === undefined) {
      ctx.logger.warn(
        LogBody.create()
          .component('GalleryHarmonize')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('accent or frame role missing; skipping harmonize')
          .context({})
          .build()
      );
      state.metadata['gallery:harmonized'] = false;
      return;
    }

    const galleryConfig = state.metadata.gallery as { 'harmonizeThreshold'?: number } | undefined;
    const threshold = galleryConfig?.harmonizeThreshold ?? 10;
    const deltaE = deltaE2000.apply(accent, frame);

    ctx.logger.debug(
      LogBody.create()
        .component('GalleryHarmonize')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('deltaE2000 between accent and frame')
        .context({ 'deltaE': deltaE, 'threshold': threshold })
        .build()
    );

    if (deltaE >= threshold) {
      ctx.logger.info(
        LogBody.create()
          .component('GalleryHarmonize')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('accent hue is sufficiently distinct; no shift needed')
          .context({ 'deltaE': deltaE })
          .build()
      );
      state.metadata['gallery:harmonized'] = false;
      return;
    }

    // Determine shift direction: move accent hue away from frame hue
    const accentHue = accent.oklch.h;
    const frameHue  = frame.oklch.h;
    const diff      = ((accentHue - frameHue + 540) % 360) - 180;
    // If diff > 0 accent is clockwise from frame → continue clockwise (+30)
    // If diff ≤ 0 accent is counterclockwise  → continue counterclockwise (-30)
    const shift     = diff > 0 ? 30 : -30;
    const newAccent = hueShift.apply(accent, shift);

    state.roles.accent = newAccent;

    state.metadata['gallery:harmonized'] = true;
    state.metadata['gallery:harmonizeDetails'] = {
      'after':    newAccent.hex,
      'before':   accent.hex,
      'deltaE':   deltaE,
      'hueShift': shift
    };

    ctx.logger.info(
      LogBody.create()
        .component('GalleryHarmonize')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('accent hue shifted')
        .context({
          'after':   newAccent.hex,
          'before':  accent.hex,
          'deltaE':  deltaE,
          'shift':   shift
        })
        .build()
    );
  }
}

export const galleryHarmonize = new GalleryHarmonize();
