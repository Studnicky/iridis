/** The visible framing of a graph, kept while its live instance is disposed. */
export interface ColorGraphViewStateInterface {
  readonly 'fitZoomLevel': number;
  readonly 'originScreenX': number;
  readonly 'originScreenY': number;
  readonly 'positions': readonly number[];
  readonly 'zoomLevel': number;
}
