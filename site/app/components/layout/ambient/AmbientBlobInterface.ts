/** One drifting glow of the ambient canvas; positions and sizes are fractions of the canvas width/height. */
export interface AmbientBlobInterface {
  readonly 'inner': string;
  readonly 'outer': string;
  readonly 'periodMs': number;
  readonly 'phase': number;
  readonly 'radius': number;
  readonly 'swayAmount': number;
  readonly 'x': number;
}
