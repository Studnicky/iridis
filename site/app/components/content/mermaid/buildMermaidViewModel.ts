export const MERMAID_INITIAL_FIT_DELAY_MS = 50;
export const MERMAID_EXPAND_FIT_DELAYS_MS = [50, 320] as const;
const MERMAID_WHEEL_ZOOM_FACTOR = 0.0015;

export function createMermaidRenderId(): string {
  return `mermaid-${Math.random().toString(36).substring(2, 9)}`;
}

export function isMermaidExpandExitKey(key: string, isExpanded: boolean): boolean {
  return key === 'Escape' && isExpanded;
}

export function zoomFactorFromWheelDelta(deltaY: number): number {
  return Math.exp(-deltaY * MERMAID_WHEEL_ZOOM_FACTOR);
}

export function buildMermaidRenderErrorMarkup(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `<div class="text-error font-mono text-sm p-4 whitespace-pre-wrap">Failed to render Mermaid diagram:\n${message}</div>`;
}
