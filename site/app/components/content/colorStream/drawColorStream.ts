import { colorStreamComparison } from '~/composables/colorStreamComparison.ts';
import { sampleIndexToX } from '~/composables/sampleIndexToX.ts';
import { scaleChromaToY } from '~/composables/scaleChromaToY.ts';
import type { ColorSampleType } from '~/composables/types/colorSample.ts';
import type { RoleViewType } from '~/composables/types/index.ts';

export const COLOR_STREAM_COMPARISON_SAMPLE_COUNT = 48;

export function asCanvasElement(el: unknown): HTMLCanvasElement | null {
  return el !== null && typeof el === 'object' && 'tagName' in el && (el as HTMLElement).tagName === 'CANVAS' ? el as HTMLCanvasElement : null;
}

export function drawComparisonBand(canvas: HTMLCanvasElement, colors: readonly string[]): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const segmentWidth = width / colors.length;
  for (let index = 0; index < colors.length; index++) {
    ctx.fillStyle = colors[index]!;
    ctx.fillRect(index * segmentWidth, 0, segmentWidth + 1, height);
  }
}

export function drawComparisonBands(
  roles: readonly { roleName: string }[],
  views: readonly RoleViewType[],
  naiveCanvasRefs: readonly (HTMLCanvasElement | null)[],
  engineCanvasRefs: readonly (HTMLCanvasElement | null)[]
): void {
  for (let index = 0; index < roles.length; index++) {
    const role = roles[index]!;
    const view = views.find((candidate) => candidate.name === role.roleName);
    if (view === undefined) continue;

    const toHue = (view.h + 180) % 360;
    const bands = colorStreamComparison.buildComparisonBands(
      view.l,
      view.c,
      view.h,
      view.l,
      view.c,
      toHue,
      COLOR_STREAM_COMPARISON_SAMPLE_COUNT
    );

    const naiveCanvas = naiveCanvasRefs[index];
    if (naiveCanvas !== null && naiveCanvas !== undefined) drawComparisonBand(naiveCanvas, bands.naive);

    const engineCanvas = engineCanvasRefs[index];
    if (engineCanvas !== null && engineCanvas !== undefined) drawComparisonBand(engineCanvas, bands.engine);
  }
}

export function drawColorStreamStrip(canvas: HTMLCanvasElement, samples: ReadonlyArray<ColorSampleType>): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (samples.length < 2) return;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const sample of samples) {
    if (sample.chroma < min) min = sample.chroma;
    if (sample.chroma > max) max = sample.chroma;
  }

  let prevX = sampleIndexToX(0, samples.length, width);
  let prevY = scaleChromaToY(samples[0]!.chroma, min, max, height);

  for (let index = 1; index < samples.length; index++) {
    const sample = samples[index]!;
    const x = sampleIndexToX(index, samples.length, width);
    const y = scaleChromaToY(sample.chroma, min, max, height);

    ctx.strokeStyle = sample.hex;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    prevX = x;
    prevY = y;
  }
}
