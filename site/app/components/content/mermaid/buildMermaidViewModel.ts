export const buildMermaidViewModel = class MermaidViewModelBuilder {
  public static readonly expandFitDelaysMs = [50, 320] as const;
  public static readonly initialFitDelayMs = 50;
  private static readonly wheelZoomFactor = 0.0015;

  public static createRenderId(): string {
    const identifier = globalThis.crypto.randomUUID();
    const renderId = `mermaid-${identifier}`;
    return renderId;
  }

  public static zoomFactorFromWheelDelta(deltaY: number): number {
    const scaledDelta = -deltaY * MermaidViewModelBuilder.wheelZoomFactor;
    const zoomFactor = Math.exp(scaledDelta);
    return zoomFactor;
  }
};
