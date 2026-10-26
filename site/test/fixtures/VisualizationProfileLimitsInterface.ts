/** The frame, long-task and structure limits one profile target class is judged against. */
export interface VisualizationProfileLimitsInterface {
  readonly 'maximumAverageFrameMs': number;
  readonly 'maximumCanvasElements': number;
  readonly 'maximumDomElements': number;
  readonly 'maximumFrameMs': number;
  readonly 'maximumLongTaskCount': number;
  readonly 'maximumLongTaskTotalMs': number;
  readonly 'maximumP90FrameMs': number;
}
