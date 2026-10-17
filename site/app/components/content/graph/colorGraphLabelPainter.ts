import type { Graph } from '@cosmos.gl/graph';

import { colorRecordFactory } from '@studnicky/iridis';

import { contrastRatio } from '~/theme/ContrastRatio.ts';

import type { ColorGraphCategoryVisibility } from './ColorGraphCategoryVisibility.ts';
import type { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';

class ColorGraphPointMeta {
  public readonly algorithm: string | null;
  public readonly category: ColorGraphNodeCategory;
  public readonly hex: string;
  public readonly labelSuffix: string;
  public readonly name: string;

  public constructor(
    algorithm: string | null,
    category: ColorGraphNodeCategory,
    hex: string,
    labelSuffix: string,
    name: string
  ) {
    this.algorithm = algorithm;
    this.category = category;
    this.hex = hex;
    this.labelSuffix = labelSuffix;
    this.name = name;
  }
}

export const colorGraphLabelPainter = class ColorGraphLabelPainter {
  public static backgroundColorFromTheme(): [number, number, number, number] {
    if (typeof document === 'undefined') {
      const fallbackColor: [number, number, number, number] = [0, 0, 0, 1];
      return fallbackColor;
    }
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--ui-bg').trim();
    if (hex.length === 0) {
      const fallbackColor: [number, number, number, number] = [0, 0, 0, 1];
      return fallbackColor;
    }
    const [red, green, blue] = ColorGraphLabelPainter.rgbOf(hex);
    return [red, green, blue, 1];
  }

  private static devicePixelRatio(): number {
    const devicePixelRatio = window.devicePixelRatio;
    const resolvedRatio = devicePixelRatio === 0 || Number.isNaN(devicePixelRatio)
      ? 1
      : devicePixelRatio;
    return resolvedRatio;
  }

  public static paintLabels(
    handle: Graph,
    canvas: HTMLCanvasElement,
    labelMeta: readonly ColorGraphPointMeta[],
    categoryVisible: ColorGraphCategoryVisibility
  ): void {
    const container = canvas.parentElement;
    if (!(container instanceof HTMLDivElement)) {return;}
    ColorGraphLabelPainter.resizeLabelCanvas(canvas, container);
    const devicePixelRatio = ColorGraphLabelPainter.devicePixelRatio();
    const context = canvas.getContext('2d');
    if (context === null) {return;}
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const width = canvas.width / devicePixelRatio;
    const height = canvas.height / devicePixelRatio;
    context.clearRect(0, 0, width, height);
    const labelCount = labelMeta.length;
    if (labelCount === 0) {return;}

    const positions = ColorGraphLabelPainter.pointPositions(handle);
    if (positions === null || positions.length === 0) {return;}

    const monoToken = getComputedStyle(document.body).getPropertyValue('--font-mono').trim();
    const mono = monoToken.length === 0 ? 'ui-monospace, monospace' : monoToken;
    context.font = `600 12px ${mono}`;
    context.textBaseline = 'middle';
    const padX = 5;
    const padY = 2;

    for (let index = 0; index < labelCount; index++) {
      const meta = labelMeta[index];
      if (meta === undefined) {continue;}
      ColorGraphLabelPainter.paintLabel(
        categoryVisible,
        context,
        handle,
        height,
        index,
        meta,
        padX,
        padY,
        positions,
        width
      );
    }
  }

  private static paintLabel(
    categoryVisible: ColorGraphCategoryVisibility,
    context: CanvasRenderingContext2D,
    handle: Graph,
    height: number,
    index: number,
    meta: ColorGraphPointMeta,
    padX: number,
    padY: number,
    positions: readonly number[],
    width: number
  ): void {
    if (!categoryVisible.isVisible(meta.category)) {return;}
    const worldX = positions[index * 2];
    const worldY = positions[index * 2 + 1];
    if (worldX === undefined || worldY === undefined) {return;}
    const screenPosition = ColorGraphLabelPainter.screenPosition(handle, worldX, worldY);
    if (screenPosition === null) {return;}
    const [screenX, screenY] = screenPosition;
    if (screenX < 0 || screenY < 0 || screenX > width || screenY > height) {return;}
    const label = meta.algorithm !== null ? `${meta.name} · ${meta.algorithm}` : meta.name;
    const text = `${label}${meta.labelSuffix}`;
    const textWidth = context.measureText(text).width;
    const pillWidth = textWidth + padX * 2;
    const pillHeight = 13 + padY * 2;
    const x = screenX + 8;
    const y = screenY - pillHeight / 2;
    context.fillStyle = meta.hex;
    ColorGraphLabelPainter.roundRect(context, x, y, pillWidth, pillHeight, 4);
    context.fill();
    context.fillStyle = ColorGraphLabelPainter.readableTextColor(meta.hex);
    context.fillText(text, x + padX, y + pillHeight / 2);
  }

  private static pointPositions(handle: Graph): readonly number[] | null {
    try {
      const positions = handle.getPointPositions();
      return positions;
    } catch {
      return null;
    }
  }

  private static readableTextColor(hex: string): string {
    const readableTextColor = contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#000000')
      ? '#ffffff'
      : '#000000';
    return readableTextColor;
  }

  public static resizeLabelCanvas(canvas: HTMLCanvasElement, container: HTMLDivElement): void {
    const devicePixelRatio = ColorGraphLabelPainter.devicePixelRatio();
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {return;}
    const targetWidth = Math.round(rect.width * devicePixelRatio);
    const targetHeight = Math.round(rect.height * devicePixelRatio);
    if (canvas.width === targetWidth && canvas.height === targetHeight) {return;}
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = `${String(rect.width)}px`;
    canvas.style.height = `${String(rect.height)}px`;
  }

  private static rgbOf(hex: string): [number, number, number] {
    const { 'b': blue, 'g': green, 'r': red } = colorRecordFactory.fromHex(hex).rgb;
    const rgb: [number, number, number] = [red, green, blue];
    return rgb;
  }

  private static roundRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const safeRadius = Math.min(radius, height / 2, width / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
  }

  private static screenPosition(
    handle: Graph,
    worldX: number,
    worldY: number
  ): readonly [number, number] | null {
    try {
      const position = handle.spaceToScreenPosition([worldX, worldY]);
      return position;
    } catch {
      return null;
    }
  }
};
