import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { oklchToRgb } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

/**
 * `gallery:assignRoles`
 *
 * Given the K dominant colors in `state.colors`, assigns them to the
 * five gallery roles:
 *
 *   canvas: darkest neutral (lowest lightness)
 *   frame:  closest to mid-luminance (L nearest 0.5)
 *   accent: highest chroma
 *   muted:  lowest chroma among non-neutral colors (C > 0.02)
 *   text:   auto-derived: pure white if canvas L <= 0.5, pure black otherwise
 *
 * Writes to `state.roles`.
 */
class GalleryAssignRoles implements TaskInterface {
  readonly 'name' = 'gallery:assignRoles';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Assign dominant colors to gallery roles: canvas, frame, accent, muted, text',
    'name':        'gallery:assignRoles',
    'reads':       ['colors'],
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const colors = state.colors;

    if (colors.length === 0) {
      ctx.logger.warn(
        LogBody.create()
          .component('GalleryAssignRoles')
          .operation('run')
          .status(LOG_STATUS.INVALID)
          .message('state.colors is empty; cannot assign roles')
          .context({})
          .build()
      );
      return;
    }

    ctx.logger.debug(
      LogBody.create()
        .component('GalleryAssignRoles')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('assigning gallery roles')
        .context({ 'colorCount': colors.length })
        .build()
    );

    // canvas: darkest (lowest L)
    const canvas = colors.reduce((best: ColorRecordInterfaceType, c: ColorRecordInterfaceType) =>
    {return c.oklch.l < best.oklch.l ? c : best;}
    );

    // frame: closest to mid-luminance (L nearest 0.5)
    const frame = colors.reduce((best: ColorRecordInterfaceType, c: ColorRecordInterfaceType) => {
      const d  = Math.abs(c.oklch.l - 0.5);
      const bd = Math.abs(best.oklch.l - 0.5);
      return d < bd ? c : best;
    });

    // accent: highest chroma
    const accent = colors.reduce((best: ColorRecordInterfaceType, c: ColorRecordInterfaceType) =>
    {return c.oklch.c > best.oklch.c ? c : best;}
    );

    // muted: lowest chroma among non-neutral colors (C > 0.02), excluding accent
    const nonNeutral = colors.filter((c) => {return c.oklch.c > 0.02 && c !== accent;});
    const muteSource = nonNeutral.length > 0 ? nonNeutral : colors;
    const muted      = muteSource.reduce((best: ColorRecordInterfaceType, c: ColorRecordInterfaceType) =>
    {return c.oklch.c < best.oklch.c ? c : best;}
    );

    // text: auto-derived: white when canvas is dark (L <= 0.5), black otherwise
    const text = this.deriveTextColor(canvas);

    state.roles.canvas = canvas;
    state.roles.frame  = frame;
    state.roles.accent = accent;
    state.roles.muted  = muted;
    state.roles.text   = text;

    ctx.logger.info(
      LogBody.create()
        .component('GalleryAssignRoles')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('roles assigned')
        .context({
          'accent': accent.hex,
          'canvas': canvas.hex,
          'frame':  frame.hex,
          'muted':  muted.hex,
          'text':   text.hex
        })
        .build()
    );
  }

  private deriveTextColor(canvas: ColorRecordInterfaceType): ColorRecordInterfaceType {
    if (canvas.oklch.l <= 0.5) {
      return oklchToRgb.apply(1.0, 0.0, 0.0, 1.0);
    }
    return oklchToRgb.apply(0.0, 0.0, 0.0, 1.0);
  }
}

export const galleryAssignRoles = new GalleryAssignRoles();
