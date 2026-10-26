import type { AmbientCanvasContextInterface } from '../../app/components/layout/ambient/AmbientCanvasContextInterface.ts';

/** Captures canvas calls: clears, filled rectangles, and gradient colour stops. */
export class RecordingCanvasContext implements AmbientCanvasContextInterface {
  public clears = 0;

  public fillRects: number[][] = [];

  public fillStyle: CanvasGradient | CanvasPattern | string = '';

  public filter = '';

  public stops: string[] = [];

  public clearRect(): void {
    this.clears += 1;
  }

  public createRadialGradient(): CanvasGradient {
    const gradient: CanvasGradient = {
      'addColorStop': (_offset: number, color: string): void => {
        this.stops.push(color);
      }
    };

    return gradient;
  }

  public fillRect(left: number, top: number, width: number, height: number): void {
    this.fillRects.push([
      left,
      top,
      width,
      height
    ]);
  }
}
