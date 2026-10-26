/** The graph camera a view restoration drives. */
export interface ColorGraphViewTargetInterface {
  'applyZoom': (zoom: number) => void;
  'readZoom': () => number;
}
