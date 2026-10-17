import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  oklchToRgb,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

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

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Assign dominant colors to gallery roles: canvas, frame, accent, muted, text',
    'name':        'gallery:assignRoles',
    'reads':       ['colors'],
    'writes':      ['roles']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colors = state.colors;

    if (colors.length === 0) {
      context.logger.warn(
        LogBody.create({
          'component': 'GalleryAssignRoles',
          'context': {},
          'message': 'state.colors is empty; cannot assign roles',
          'operation': 'run',
          'status': LOG_STATUS.INVALID
        })
      );
      return;
    }

    context.logger.debug(
      LogBody.create({
        'component': 'GalleryAssignRoles',
        'context': { 'colorCount': colors.length },
        'message': 'assigning gallery roles',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );

    const firstColor = colors[0];
    if (firstColor === undefined) {
      throw new RangeError('A non-empty color list must have a first color');
    }

    // canvas: darkest (lowest L)
    const canvas = colors.reduce((best: ColorRecordInterfaceTypeEntity.Type, color: ColorRecordInterfaceTypeEntity.Type) => {
      const result = color.oklch.l < best.oklch.l ? color : best;
      return result;
    }, firstColor);

    // frame: closest to mid-luminance (L nearest 0.5)
    const frame = colors.reduce((best: ColorRecordInterfaceTypeEntity.Type, color: ColorRecordInterfaceTypeEntity.Type) => {
      const distance  = Math.abs(color.oklch.l - 0.5);
      const bestDistance = Math.abs(best.oklch.l - 0.5);
      const result = distance < bestDistance ? color : best;
      return result;
    }, firstColor);

    // accent: highest chroma
    const accent = colors.reduce((best: ColorRecordInterfaceTypeEntity.Type, color: ColorRecordInterfaceTypeEntity.Type) => {
      const result = color.oklch.c > best.oklch.c ? color : best;
      return result;
    }, firstColor);

    // muted: lowest chroma among non-neutral colors (C > 0.02), excluding accent
    const nonNeutral = colors.filter((color) => {
      const result = color.oklch.c > 0.02 && color !== accent;
      return result;
    });
    const muteSource = nonNeutral.length > 0 ? nonNeutral : colors;
    const muted = muteSource.reduce((best: ColorRecordInterfaceTypeEntity.Type, color: ColorRecordInterfaceTypeEntity.Type) => {
      const result = color.oklch.c < best.oklch.c ? color : best;
      return result;
    }, firstColor);

    // text: auto-derived: white when canvas is dark (L <= 0.5), black otherwise
    const text = this.deriveTextColor(canvas);

    state.roles.canvas = canvas;
    state.roles.frame  = frame;
    state.roles.accent = accent;
    state.roles.muted  = muted;
    state.roles.text   = text;

    context.logger.info(
      LogBody.create({
        'component': 'GalleryAssignRoles',
        'context': {
          'accent': accent.hex,
          'canvas': canvas.hex,
          'frame':  frame.hex,
          'muted':  muted.hex,
          'text':   text.hex
        },
        'message': 'roles assigned',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }

  private deriveTextColor(canvas: ColorRecordInterfaceTypeEntity.Type): ColorRecordInterfaceTypeEntity.Type {
    if (canvas.oklch.l <= 0.5) {
      const result = oklchToRgb.apply(1.0, 0.0, 0.0, 1.0);
      return result;
    }
    const result = oklchToRgb.apply(0.0, 0.0, 0.0, 1.0);
    return result;
  }
}

export const galleryAssignRoles = new GalleryAssignRoles();
