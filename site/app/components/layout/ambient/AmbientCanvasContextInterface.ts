/** The 2D drawing surface the ambient painter needs; CanvasRenderingContext2D satisfies it. */
export interface AmbientCanvasContextInterface {
  clearRect(x: number, y: number, width: number, height: number): void;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
  fillRect(x: number, y: number, width: number, height: number): void;
  'fillStyle': CanvasGradient | CanvasPattern | string;
}
