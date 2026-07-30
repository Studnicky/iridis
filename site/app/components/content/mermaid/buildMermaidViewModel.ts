export const buildMermaidViewModel = class MermaidViewModelBuilder {
  public static readonly expandFitDelaysMs = [50, 320] as const;
  public static readonly initialFitDelayMs = 50;
  private static readonly wheelZoomFactor = 0.0015;

  public static createRenderId(): string {
    const randomSegment = Math.random().toString(36).substring(2, 9);
    return `mermaid-${randomSegment}`;
  }

  public static isExpandExitKey(key: string, isExpanded: boolean): boolean {
    return key === 'Escape' && isExpanded;
  }

  public static renderErrorMarkup(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `<div class="text-error font-mono text-sm p-4 whitespace-pre-wrap">Failed to render Mermaid diagram:\n${message}</div>`;
  }

  public static zoomFactorFromWheelDelta(deltaY: number): number {
    const scaledDelta = -deltaY * MermaidViewModelBuilder.wheelZoomFactor;
    return Math.exp(scaledDelta);
  }
};
