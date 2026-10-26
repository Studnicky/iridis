/** The 2D drawing surface the starfield painter needs; CanvasRenderingContext2D satisfies it. */
export interface AmbientStarContextInterface {
  'arc': (x: number, y: number, radius: number, startAngle: number, endAngle: number) => void;
  'beginPath': () => void;
  'clearRect': (x: number, y: number, width: number, height: number) => void;
  'fill': () => void;
  'fillStyle': CanvasGradient | CanvasPattern | string;
  'globalAlpha': number;
  'moveTo': (x: number, y: number) => void;
  'shadowBlur': number;
  'shadowColor': string;
}
