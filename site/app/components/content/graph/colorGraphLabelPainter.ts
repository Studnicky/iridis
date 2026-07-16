import { colorRecordFactory } from '@studnicky/iridis';
import { contrastRatio } from '~/theme/ContrastRatio.ts';

export type ColorGraphPointMeta = {
  readonly name: string;
  readonly hex: string;
  readonly clamped: boolean;
  readonly category: 'pinned' | 'synthesized' | 'derived' | 'direct';
  readonly algorithm: string | null;
};

type GraphProjectionHandle = {
  spaceToScreenPosition(point: readonly [number, number]): readonly [number, number];
  getPointPositions(): readonly number[];
};

export function backgroundColorFromTheme(): [number, number, number, number] {
  if (typeof document === 'undefined') return [0, 0, 0, 1];
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--ui-bg').trim();
  if (hex === '') return [0, 0, 0, 1];
  const [r, g, b] = rgbOf(hex);
  return [r, g, b, 1];
}

export function resizeColorGraphLabelCanvas(canvas: HTMLCanvasElement, container: HTMLDivElement): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const targetWidth = Math.round(rect.width * dpr);
  const targetHeight = Math.round(rect.height * dpr);
  if (canvas.width === targetWidth && canvas.height === targetHeight) return;
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.width = `${String(rect.width)}px`;
  canvas.style.height = `${String(rect.height)}px`;
}

export function paintColorGraphLabels(
  handle: GraphProjectionHandle,
  canvas: HTMLCanvasElement,
  labelMeta: readonly ColorGraphPointMeta[],
  categoryVisible: Readonly<Record<ColorGraphPointMeta['category'], boolean>>
): void {
  resizeColorGraphLabelCanvas(canvas, canvas.parentElement as HTMLDivElement);
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);
  if (labelMeta.length === 0) return;

  let positions: readonly number[] = [];
  try { positions = handle.getPointPositions(); } catch { return; }
  if (positions.length === 0) return;

  const mono = getComputedStyle(document.body).getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace';
  ctx.font = `600 12px ${mono}`;
  ctx.textBaseline = 'middle';
  const padX = 5;
  const padY = 2;

  for (let index = 0; index < labelMeta.length; index++) {
    const meta = labelMeta[index];
    if (meta === undefined || !categoryVisible[meta.category]) continue;
    const wx = positions[index * 2];
    const wy = positions[index * 2 + 1];
    if (wx === undefined || wy === undefined) continue;
    let sx = 0;
    let sy = 0;
    try {
      const point = handle.spaceToScreenPosition([wx, wy]);
      sx = point[0];
      sy = point[1];
    } catch {
      continue;
    }
    if (sx < 0 || sy < 0 || sx > width || sy > height) continue;

    const label = meta.algorithm !== null ? `${meta.name} · ${meta.algorithm}` : meta.name;
    const text = meta.clamped ? `${label} ⏚` : label;
    const textWidth = ctx.measureText(text).width;
    const pillWidth = textWidth + padX * 2;
    const pillHeight = 13 + padY * 2;
    const x = sx + 8;
    const y = sy - pillHeight / 2;

    ctx.fillStyle = meta.hex;
    roundRect(ctx, x, y, pillWidth, pillHeight, 4);
    ctx.fill();
    ctx.fillStyle = readableTextColor(meta.hex);
    ctx.fillText(text, x + padX, y + pillHeight / 2);
  }
}

function rgbOf(hex: string): [number, number, number] {
  const { r, g, b } = colorRecordFactory.fromHex(hex).rgb;
  return [r, g, b];
}

function readableTextColor(hex: string): string {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#000000') ? '#ffffff' : '#000000';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const safeRadius = Math.min(radius, height / 2, width / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}
