import type { RoleHexMapType } from '../../../composables/types/roleHexMapType.ts';
import type { AmbientBlobInterface } from './AmbientBlobInterface.ts';
import type { AmbientCanvasContextInterface } from './AmbientCanvasContextInterface.ts';

/** Paints the drifting colour field: soft glows that rise, swell and sway, coloured by the frame's decorative tokens. */
export class AmbientFieldPainter {
  /** Decorative aliases blobs pair up in order; blob `i` blends alias `i` into alias `i + 2`. */
  private static readonly blobAliases: readonly string[] = [
    'primary',
    'info',
    'secondary',
    'success',
    'warning',
    'error'
  ];

  private static readonly goldenFraction = 0.618033988749895;

  private static readonly silverFraction = 0.381966011250105;

  private static readonly turn = Math.PI * 2;

  /** Deterministic blob layout, so server and client agree and tests are repeatable. */
  public static buildBlobs(count: number): AmbientBlobInterface[] {
    const blobs: AmbientBlobInterface[] = [];

    for (let index = 0; index < count; index += 1) {
      blobs.push({
        'inner': `--ui-color-${AmbientFieldPainter.blobAliases[index % AmbientFieldPainter.blobAliases.length] ?? 'primary'}-500`,
        'outer': `--ui-color-${AmbientFieldPainter.blobAliases[(index + 2) % AmbientFieldPainter.blobAliases.length] ?? 'primary'}-500`,
        'periodMs': 18000 + ((index * 5) % 12) * 1000,
        'phase': (index * AmbientFieldPainter.silverFraction) % 1,
        'radius': 0.05 + ((index * 7) % 5) * 0.0125,
        'swayAmount': index % 2 === 0 ? 0.02 + ((index * 3) % 5) * 0.005 : 0,
        'x': (index * AmbientFieldPainter.goldenFraction) % 1
      });
    }

    return blobs;
  }

  public static paint(
    context: AmbientCanvasContextInterface,
    width: number,
    height: number,
    tokens: RoleHexMapType,
    animationMs: number,
    blobs: readonly AmbientBlobInterface[],
    blurPx: number
  ): void {
    context.clearRect(0, 0, width, height);
    context.filter = blurPx > 0 ? `blur(${String(blurPx)}px)` : 'none';
    for (let index = 0; index < blobs.length; index += 1) {
      const blob = blobs[index];
      const inner = blob === undefined ? undefined : tokens[blob.inner];
      const outer = blob === undefined ? undefined : tokens[blob.outer];

      if (blob !== undefined && inner !== undefined && outer !== undefined) {
        AmbientFieldPainter.paintBlob(context, width, height, animationMs, blob, [
          inner,
          outer
        ]);
      }
    }
  }

  private static paintBlob(
    context: AmbientCanvasContextInterface,
    width: number,
    height: number,
    animationMs: number,
    blob: AmbientBlobInterface,
    colors: readonly [string, string]
  ): void {
    const cycle = animationMs / blob.periodMs + blob.phase;
    const centerX = (blob.x + blob.swayAmount * Math.sin(AmbientFieldPainter.turn * cycle * 0.7)) * width;
    const centerY = (0.5 + 0.55 * Math.cos(AmbientFieldPainter.turn * cycle)) * height;
    const radius = blob.radius * width * (1 + 0.1 * Math.sin(AmbientFieldPainter.turn * cycle));
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.55, colors[1]);
    gradient.addColorStop(1, `${colors[1]}00`);
    context.fillStyle = gradient;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
}
