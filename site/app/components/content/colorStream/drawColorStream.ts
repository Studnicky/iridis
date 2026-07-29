import type { ColorSampleType } from '~/composables/types/colorSample.ts';
import type { RoleViewType } from '~/composables/types/index.ts';

import { colorStreamComparison } from '~/composables/colorStreamComparison.ts';
import { sampleIndexToX } from '~/composables/sampleIndexToX.ts';
import { scaleChromaToY } from '~/composables/scaleChromaToY.ts';

class ColorStreamRole {
  public readonly roleName: string;

  public constructor(roleName: string) {
    this.roleName = roleName;
  }
}

export const drawColorStream = class ColorStreamDrawing {
  private static readonly comparisonSampleCount = 48;

  public static resolveCanvasElement(element: unknown): HTMLCanvasElement | null {
    return element instanceof HTMLCanvasElement ? element : null;
  }

  private static drawComparisonBand(canvas: HTMLCanvasElement, colors: readonly string[]): void {
    const context = canvas.getContext('2d');
    if (context === null) {return;}

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    const colorCount = colors.length;
    const segmentWidth = width / colorCount;
    for (let index = 0; index < colorCount; index++) {
      const color = colors[index];
      if (color === undefined) {continue;}
      context.fillStyle = color;
      context.fillRect(index * segmentWidth, 0, segmentWidth + 1, height);
    }
  }

  public static drawComparisonBands(
    roles: readonly ColorStreamRole[],
    views: readonly RoleViewType[],
    naiveCanvases: readonly (HTMLCanvasElement | null)[],
    engineCanvases: readonly (HTMLCanvasElement | null)[]
  ): void {
    const viewsByName = new Map<string, RoleViewType>();
    for (const view of views) {
      viewsByName.set(view.name, view);
    }
    const roleCount = roles.length;
    for (let index = 0; index < roleCount; index++) {
      const role = roles[index];
      if (role === undefined) {continue;}
      const view = viewsByName.get(role.roleName);
      if (view === undefined) {continue;}

      const toHue = (view.h + 180) % 360;
      const bands = colorStreamComparison.buildComparisonBands(
        view.l,
        view.c,
        view.h,
        view.l,
        view.c,
        toHue,
        ColorStreamDrawing.comparisonSampleCount
      );

      const naiveCanvas = naiveCanvases[index];
      if (naiveCanvas !== null && naiveCanvas !== undefined) {
        ColorStreamDrawing.drawComparisonBand(naiveCanvas, bands.naive);
      }

      const engineCanvas = engineCanvases[index];
      if (engineCanvas !== null && engineCanvas !== undefined) {
        ColorStreamDrawing.drawComparisonBand(engineCanvas, bands.engine);
      }
    }
  }

  public static drawStrip(canvas: HTMLCanvasElement, samples: readonly ColorSampleType[]): void {
    const context = canvas.getContext('2d');
    if (context === null) {return;}

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    const sampleCount = samples.length;
    if (sampleCount < 2) {return;}

    let minimumChroma = Number.POSITIVE_INFINITY;
    let maximumChroma = Number.NEGATIVE_INFINITY;
    for (const sample of samples) {
      if (sample.chroma < minimumChroma) {minimumChroma = sample.chroma;}
      if (sample.chroma > maximumChroma) {maximumChroma = sample.chroma;}
    }

    const firstSample = samples[0];
    if (firstSample === undefined) {return;}
    let previousX = sampleIndexToX(0, sampleCount, width);
    let previousY = scaleChromaToY(firstSample.chroma, minimumChroma, maximumChroma, height);

    for (let index = 1; index < sampleCount; index++) {
      const sample = samples[index];
      if (sample === undefined) {continue;}
      const x = sampleIndexToX(index, sampleCount, width);
      const y = scaleChromaToY(sample.chroma, minimumChroma, maximumChroma, height);

      context.strokeStyle = sample.hex;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(x, y);
      context.stroke();

      previousX = x;
      previousY = y;
    }
  }
};
