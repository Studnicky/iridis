import type { AmbientStarContextInterface } from './AmbientStarContextInterface.ts';
import type { AmbientStarLayerInterface } from './AmbientStarLayerInterface.ts';

/** Paints the twinkling, slowly rotating starfield: every layer turns about the viewport centre and fades between a dim and a bright opacity. */
export class AmbientStarfieldPainter {
  public static readonly dimOpacity = 0.1;

  public static readonly brightOpacity = 0.95;

  private static readonly turn = Math.PI * 2;

  /** Opacity of a layer at `timeMs`: a smooth dim-bright-dim cycle offset by the layer delay. */
  public static twinkleOpacity(layer: AmbientStarLayerInterface, timeMs: number, speed: number): number {
    const cycleMs = layer.twinkleSeconds * 1000 / speed;
    const phase = (((timeMs - layer.twinkleDelaySeconds * 1000) / cycleMs) % 1 + 1) % 1;
    const swing = AmbientStarfieldPainter.brightOpacity - AmbientStarfieldPainter.dimOpacity;
    const result = AmbientStarfieldPainter.dimOpacity + swing * (1 - Math.cos(AmbientStarfieldPainter.turn * phase)) / 2;

    return result;
  }

  /** Rotation of a layer about the viewport centre at `timeMs`, in radians. */
  public static rotation(layer: AmbientStarLayerInterface, timeMs: number, speed: number): number {
    const result = AmbientStarfieldPainter.turn * timeMs / (layer.rotateSeconds * 1000 / speed);

    return result;
  }

  public static paint(
    context: AmbientStarContextInterface,
    width: number,
    height: number,
    layers: readonly AmbientStarLayerInterface[],
    timeMs: number,
    speed: number
  ): void {
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;

    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index];

      if (layer !== undefined) {
        const angle = AmbientStarfieldPainter.rotation(layer, timeMs, speed);

        context.globalAlpha = AmbientStarfieldPainter.twinkleOpacity(layer, timeMs, speed);
        context.fillStyle = layer.color;
        context.shadowColor = layer.color;
        context.shadowBlur = layer.blurPx;
        AmbientStarfieldPainter.paintDots(context, layer, width, height, centerX, centerY, Math.cos(angle), Math.sin(angle));
      }
    }
  }

  private static paintDots(
    context: AmbientStarContextInterface,
    layer: AmbientStarLayerInterface,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    cosine: number,
    sine: number
  ): void {
    const radius = layer.diameterPx / 2;

    context.beginPath();
    for (let index = 0; index < layer.dots.length; index += 1) {
      const dot = layer.dots[index];

      if (dot !== undefined) {
        const offsetX = dot.x / 100 * width - centerX;
        const offsetY = dot.y / 100 * height - centerY;
        const x = centerX + offsetX * cosine - offsetY * sine;
        const y = centerY + offsetX * sine + offsetY * cosine;

        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, AmbientStarfieldPainter.turn);
      }
    }
    context.fill();
  }
}
