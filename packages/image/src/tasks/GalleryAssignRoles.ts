import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { oklchToRgb } from '@studnicky/iridis';

/**
 * `gallery:assignRoles`
 *
 * Given the K dominant colors in `state.colors`, assigns them to the
 * five gallery roles:
 *
 *   canvas — darkest neutral (lowest lightness)
 *   frame  — closest to mid-luminance (L nearest 0.5)
 *   accent — highest chroma
 *   muted  — lowest chroma among non-neutral colors (C > 0.02)
 *   text   — auto-derived: pure white if canvas L <= 0.5, pure black otherwise
 *
 * Writes to `state.roles`.
 */
export class GalleryAssignRoles implements TaskInterface {
  readonly 'name' = 'gallery:assignRoles';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'gallery:assignRoles',
    'reads':       ['colors'],
    'writes':      ['roles'],
    'description': 'Assign dominant colors to gallery roles: canvas, frame, accent, muted, text',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const colors = state.colors;

    if (colors.length === 0) {
      ctx.logger.warn('GalleryAssignRoles', 'run', 'state.colors is empty — cannot assign roles');
      return;
    }

    ctx.logger.debug('GalleryAssignRoles', 'run', 'assigning gallery roles', { 'colorCount': colors.length });

    // canvas — darkest (lowest L)
    const canvas = colors.reduce((best: ColorRecordInterface, c: ColorRecordInterface) =>
      c.oklch.l < best.oklch.l ? c : best,
    );

    // frame — closest to mid-luminance (L nearest 0.5)
    const frame = colors.reduce((best: ColorRecordInterface, c: ColorRecordInterface) => {
      const d  = Math.abs(c.oklch.l - 0.5);
      const bd = Math.abs(best.oklch.l - 0.5);
      return d < bd ? c : best;
    });

    // accent — highest chroma
    const accent = colors.reduce((best: ColorRecordInterface, c: ColorRecordInterface) =>
      c.oklch.c > best.oklch.c ? c : best,
    );

    // muted — lowest chroma among non-neutral colors (C > 0.02), excluding accent
    const nonNeutral = colors.filter((c) => c.oklch.c > 0.02 && c !== accent);
    const muteSource = nonNeutral.length > 0 ? nonNeutral : colors;
    const muted      = muteSource.reduce((best: ColorRecordInterface, c: ColorRecordInterface) =>
      c.oklch.c < best.oklch.c ? c : best,
    );

    // text — auto-derived: white when canvas is dark (L <= 0.5), black otherwise
    const text = this.deriveTextColor(canvas);

    (state.roles as Record<string, ColorRecordInterface>)['canvas'] = canvas;
    (state.roles as Record<string, ColorRecordInterface>)['frame']  = frame;
    (state.roles as Record<string, ColorRecordInterface>)['accent'] = accent;
    (state.roles as Record<string, ColorRecordInterface>)['muted']  = muted;
    (state.roles as Record<string, ColorRecordInterface>)['text']   = text;

    ctx.logger.info('GalleryAssignRoles', 'run', 'roles assigned', {
      'canvas': canvas.hex,
      'frame':  frame.hex,
      'accent': accent.hex,
      'muted':  muted.hex,
      'text':   text.hex,
    });
  }

  private deriveTextColor(canvas: ColorRecordInterface): ColorRecordInterface {
    if (canvas.oklch.l <= 0.5) {
      return oklchToRgb.apply(1.0, 0.0, 0.0, 1.0);
    }
    return oklchToRgb.apply(0.0, 0.0, 0.0, 1.0);
  }
}

export const galleryAssignRoles = new GalleryAssignRoles();
