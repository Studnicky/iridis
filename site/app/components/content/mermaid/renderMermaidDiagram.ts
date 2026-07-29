import mermaid from 'mermaid/dist/mermaid.esm.min.mjs';

import { MERMAID_RENDER_CONSTANTS } from './constants/MermaidRenderConstants.ts';

export const renderMermaidDiagram = class MermaidDiagramRenderer {
  private static cachedThemeSignature: string | null = null;
  private static readonly svgBoundsPadding = 24;

  private static contentBounds(svg: SVGSVGElement): DOMRect | null {
    try {
      const bounds = svg.getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        return bounds;
      }
    } catch {
      // Mermaid can transiently expose an SVG before layout settles.
    }
    return null;
  }

  private static getComputedColor(variableName: string): string {
    const computedStyles = getComputedStyle(document.documentElement);
    const propertyValue = computedStyles.getPropertyValue(variableName);
    return propertyValue.trim();
  }

  private static naturalSize(svg: SVGSVGElement): { 'height': number; 'width': number } {
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox !== null && viewBox.length > 0) {
      const parts = viewBox.trim().split(MERMAID_RENDER_CONSTANTS.viewBoxPartsPattern);
      const width = parseFloat(parts[2] ?? '0');
      const height = parseFloat(parts[3] ?? '0');
      if (width > 0 && height > 0) {return { 'height': height, 'width': width };}
    }

    try {
      const bounds = svg.getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        return { 'height': bounds.height, 'width': bounds.width };
      }
    } catch {
      // Mermaid can transiently expose an SVG before layout/bounds stabilize.
    }

    return { 'height': 768, 'width': 1024 };
  }

  private static normalizeBounds(svg: SVGSVGElement): void {
    MermaidDiagramRenderer.showOverflow(svg);
    const bounds = MermaidDiagramRenderer.contentBounds(svg);
    if (bounds === null) {return;}
    const x = bounds.x - MermaidDiagramRenderer.svgBoundsPadding;
    const y = bounds.y - MermaidDiagramRenderer.svgBoundsPadding;
    const width = bounds.width + (MermaidDiagramRenderer.svgBoundsPadding * 2);
    const height = bounds.height + (MermaidDiagramRenderer.svgBoundsPadding * 2);
    if (width > 0 && height > 0) {
      svg.setAttribute('viewBox', `${String(x)} ${String(y)} ${String(width)} ${String(height)}`);
    }
  }

  public static normalizeSvg(svg: SVGSVGElement): void {
    MermaidDiagramRenderer.normalizeBounds(svg);
    const size = MermaidDiagramRenderer.naturalSize(svg);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = `${size.width}px`;
    svg.style.height = `${size.height}px`;
    svg.style.maxWidth = 'none';
    svg.style.display = 'block';
  }

  public static async render(renderId: string, code: string): Promise<string> {
    const themeSignature = MermaidDiagramRenderer.themeSignature();
    if (MermaidDiagramRenderer.cachedThemeSignature !== themeSignature) {
      mermaid.initialize({
        'startOnLoad': false,
        'theme': 'base',
        'themeVariables': MermaidDiagramRenderer.themeVariables()
      });
      MermaidDiagramRenderer.cachedThemeSignature = themeSignature;
    }

    const { svg } = await mermaid.render(renderId, code);
    return svg;
  }

  private static showOverflow(svg: SVGSVGElement): void {
    svg.style.overflow = 'visible';
    const nodes = svg.querySelectorAll<SVGGraphicsElement>('*');
    const nodeCount = nodes.length;
    for (let index = 0; index < nodeCount; index++) {
      const node = nodes[index];
      if (node !== undefined) {
        node.style.overflow = 'visible';
      }
    }
  }

  public static themeSignature(): string {
    const themeColors = [
      MermaidDiagramRenderer.getComputedColor('--ui-bg-elevated'),
      MermaidDiagramRenderer.getComputedColor('--ui-text-highlighted'),
      MermaidDiagramRenderer.getComputedColor('--ui-primary'),
      MermaidDiagramRenderer.getComputedColor('--ui-bg')
    ];
    return themeColors.join('|');
  }

  private static themeVariables() {
    return {
      'lineColor': MermaidDiagramRenderer.getComputedColor('--ui-primary'),
      'primaryBorderColor': MermaidDiagramRenderer.getComputedColor('--ui-primary'),
      'primaryColor': MermaidDiagramRenderer.getComputedColor('--ui-bg-elevated'),
      'primaryTextColor': MermaidDiagramRenderer.getComputedColor('--ui-text-highlighted'),
      'secondaryColor': MermaidDiagramRenderer.getComputedColor('--ui-bg-elevated'),
      'tertiaryColor': MermaidDiagramRenderer.getComputedColor('--ui-bg')
    };
  }
};
