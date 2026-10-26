import type { ColorSampleType } from '~/composables/types/colorSampleType.ts';
import type { RoleViewType } from '~/composables/types/roleViewType.ts';

import { colorStreamComparison } from '~/composables/colorStreamComparison.ts';
import { sampleIndexToX } from '~/composables/sampleIndexToX.ts';
import { scaleChromaToY } from '~/composables/scaleChromaToY.ts';

interface ColorStreamRoleInterface {
  readonly 'alias': string;
  readonly 'label': string;
  readonly 'roleName': string;
}

interface ColorStreamRowLayoutInterface {
  readonly 'comparisonHeight': number;
  readonly 'comparisonTop': number;
  readonly 'liveHeight': number;
  readonly 'top': number;
}

export const drawColorStream = class ColorStreamDrawing {
  private static readonly comparisonSampleCount = 48;

  private static readonly liveHeight = 48;

  private static readonly comparisonHeight = 24;

  private static readonly rowGap = 16;

  public static canvasHeightForRoleCount(roleCount: number): number {
    if (roleCount === 0) {
      return 0;
    }
    const rowHeight = ColorStreamDrawing.liveHeight + ColorStreamDrawing.comparisonHeight + ColorStreamDrawing.rowGap;
    const result = roleCount * rowHeight - ColorStreamDrawing.rowGap;

    return result;
  }

  public static drawAll(
    canvas: HTMLCanvasElement,
    roles: readonly ColorStreamRoleInterface[],
    samplesByAlias: ReadonlyMap<string, readonly ColorSampleType[]>,
    views: readonly RoleViewType[]
  ): void {
    const context = canvas.getContext('2d');

    if (context === null) {
      return;
    }

    const width = Math.max(canvas.clientWidth, 1);
    const height = ColorStreamDrawing.canvasHeightForRoleCount(roles.length);
    const ratio = Math.min(canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1, 2);
    const cssHeight = `${String(height)}px`;

    if (canvas.style.height !== cssHeight) {
      canvas.style.height = cssHeight;
    }
    const bitmapWidth = Math.round(width * ratio);
    const bitmapHeight = Math.round(height * ratio);

    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const viewsByName = new Map<string, RoleViewType>();

    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];

      if (view !== undefined) {
        viewsByName.set(view.name, view);
      }
    }

    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];

      if (role === undefined) {
        continue;
      }
      const layout = ColorStreamDrawing.layoutRow(index);
      const samples = samplesByAlias.get(role.alias) ?? [];

      ColorStreamDrawing.drawStrip(context, samples, 0, layout.top, width, layout.liveHeight);

      const view = viewsByName.get(role.roleName);

      if (view === undefined) {
        continue;
      }
      const bands = ColorStreamDrawing.comparisonBandsFor(view);
      const halfWidth = (width - 8) / 2;

      ColorStreamDrawing.drawComparisonBand(context, bands.naive, 0, layout.comparisonTop, halfWidth, layout.comparisonHeight);
      ColorStreamDrawing.drawComparisonBand(context, bands.engine, halfWidth + 8, layout.comparisonTop, halfWidth, layout.comparisonHeight);
    }
  }

  public static resolveCanvasElement(element: unknown): HTMLCanvasElement | null {
    const result = element instanceof HTMLCanvasElement ? element : null;

    return result;
  }

  private static comparisonBandsFor(view: RoleViewType): { readonly 'engine': readonly string[];
    readonly 'naive': readonly string[]; } {
    const toHue = (view.h + 180) % 360;
    const result = colorStreamComparison.buildComparisonBands(
      view.l,
      view.c,
      view.h,
      view.l,
      view.c,
      toHue,
      ColorStreamDrawing.comparisonSampleCount
    );

    return result;
  }

  private static drawComparisonBand(
    context: CanvasRenderingContext2D,
    colors: readonly string[],
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const segmentWidth = width / colors.length;

    for (let index = 0; index < colors.length; index += 1) {
      const color = colors[index];

      if (color === undefined) {
        continue;
      }
      context.fillStyle = color;
      context.fillRect(x + index * segmentWidth, y, segmentWidth + 1, height);
    }
  }

  private static drawStrip(
    context: CanvasRenderingContext2D,
    samples: readonly ColorSampleType[],
    xOffset: number,
    yOffset: number,
    width: number,
    height: number
  ): void {
    if (samples.length < 2) {
      return;
    }

    let minimumChroma = Number.POSITIVE_INFINITY;
    let maximumChroma = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];

      if (sample !== undefined) {
        minimumChroma = Math.min(minimumChroma, sample.chroma);
        maximumChroma = Math.max(maximumChroma, sample.chroma);
      }
    }

    const firstSample = samples[0];

    if (firstSample === undefined) {
      return;
    }
    let previousX = xOffset + sampleIndexToX(0, samples.length, width);
    let previousY = yOffset + scaleChromaToY(firstSample.chroma, minimumChroma, maximumChroma, height);

    context.save();
    context.beginPath();
    context.rect(xOffset, yOffset, width, height);
    context.clip();
    for (let index = 1; index < samples.length; index += 1) {
      const sample = samples[index];

      if (sample === undefined) {
        continue;
      }
      const nextX = xOffset + sampleIndexToX(index, samples.length, width);
      const nextY = yOffset + scaleChromaToY(sample.chroma, minimumChroma, maximumChroma, height);

      context.strokeStyle = sample.hex;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(nextX, nextY);
      context.stroke();
      previousX = nextX;
      previousY = nextY;
    }
    context.restore();
  }

  private static layoutRow(index: number): ColorStreamRowLayoutInterface {
    const top = index * (ColorStreamDrawing.liveHeight + ColorStreamDrawing.comparisonHeight + ColorStreamDrawing.rowGap);
    const result = {
      'comparisonHeight': ColorStreamDrawing.comparisonHeight,
      'comparisonTop': top + ColorStreamDrawing.liveHeight,
      'liveHeight': ColorStreamDrawing.liveHeight,
      'top': top
    };

    return result;
  }
};
