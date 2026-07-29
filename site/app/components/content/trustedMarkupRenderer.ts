import type { DefaultTreeAdapterTypes } from 'parse5';
import type { Root, Rule } from 'postcss';

import { parseFragment } from 'parse5';
import { parse } from 'postcss';
import parseCssValue from 'postcss-value-parser';

import { TRUSTED_MARKUP_RENDERER_PATTERNS } from './constants/TrustedMarkupRendererPatterns.ts';

class TrustedMarkupRenderResult {
  public readonly accepted: boolean;
  public readonly changed: boolean;

  public constructor(accepted: boolean, changed: boolean) {
    this.accepted = accepted;
    this.changed = changed;
  }
}

class TrustedMarkupRenderRecord {
  public readonly accepted: boolean;
  public readonly signature: string;

  public constructor(accepted: boolean, signature: string) {
    this.accepted = accepted;
    this.signature = signature;
  }
}

class TrustedMarkupValidationError extends Error {}

export const trustedMarkupRenderer = class TrustedMarkupRenderer {
  static readonly #htmlNamespace = 'http://www.w3.org/1999/xhtml';
  static readonly #svgNamespace = 'http://www.w3.org/2000/svg';

  static readonly #htmlElements = new Set([
    'a',
    'b',
    'br',
    'code',
    'div',
    'em',
    'i',
    'p',
    'pre',
    'span',
    'strong'
  ]);

  static readonly #svgElements = new Set([
    'a',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'fedropshadow',
    'filter',
    'foreignobject',
    'g',
    'image',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'stop',
    'style',
    'svg',
    'switch',
    'text',
    'title',
    'tspan',
    'use'
  ]);

  static readonly #attributes = new Set([
    'alignment-baseline',
    'class',
    'clip-path',
    'clip-rule',
    'color',
    'cx',
    'cy',
    'd',
    'dir',
    'dominant-baseline',
    'dx',
    'dy',
    'fill',
    'fill-opacity',
    'fill-rule',
    'flood-color',
    'flood-opacity',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'gradienttransform',
    'gradientunits',
    'height',
    'href',
    'id',
    'lang',
    'marker-end',
    'marker-mid',
    'marker-start',
    'markerheight',
    'markerunits',
    'markerwidth',
    'mask',
    'offset',
    'opacity',
    'orient',
    'patterncontentunits',
    'patterntransform',
    'patternunits',
    'points',
    'preserveaspectratio',
    'r',
    'refx',
    'refy',
    'role',
    'rx',
    'ry',
    'shape-rendering',
    'spreadmethod',
    'stddeviation',
    'stop-color',
    'stop-opacity',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'style',
    'tabindex',
    'target',
    'text-anchor',
    'text-decoration',
    'transform',
    'type',
    'vector-effect',
    'viewbox',
    'width',
    'x',
    'x1',
    'x2',
    'xlink:href',
    'xmlns',
    'xmlns:xlink',
    'y',
    'y1',
    'y2'
  ]);

  static readonly #cssProperties = new Set([
    'alignment-baseline',
    'background-color',
    'border',
    'border-color',
    'border-radius',
    'border-style',
    'border-width',
    'box-sizing',
    'color',
    'display',
    'dominant-baseline',
    'fill',
    'fill-opacity',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'height',
    'line-height',
    'margin',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'margin-top',
    'marker-end',
    'marker-mid',
    'marker-start',
    'max-width',
    'opacity',
    'overflow',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
    'stroke',
    'stroke-dasharray',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-width',
    'text-align',
    'text-anchor',
    'text-decoration',
    'transform',
    'transform-origin',
    'white-space',
    'width'
  ]);

  static readonly #urlAttributes = new Set(['href', 'xlink:href']);
  static readonly #fragmentUrlAttributes = new Set([
    'clip-path',
    'fill',
    'filter',
    'flood-color',
    'marker-end',
    'marker-mid',
    'marker-start',
    'mask',
    'stroke'
  ]);

  static readonly #rendered = new WeakMap<HTMLElement, TrustedMarkupRenderRecord>();

  public static render(
    host: HTMLElement,
    markup: string,
    format: 'html' | 'svg'
  ): TrustedMarkupRenderResult {
    const requireSvgRoot = format === 'svg';
    const signature = `${format}\u0000${markup}`;
    const current = TrustedMarkupRenderer.#rendered.get(host);
    if (current?.signature === signature) {
      return new TrustedMarkupRenderResult(current.accepted, false);
    }

    try {
      const parsed = parseFragment(markup);
      const fragment = TrustedMarkupRenderer.#buildFragment(
        host.ownerDocument,
        parsed,
        requireSvgRoot
      );
      host.replaceChildren(fragment);
      TrustedMarkupRenderer.#rendered.set(
        host,
        new TrustedMarkupRenderRecord(true, signature)
      );
      return new TrustedMarkupRenderResult(true, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Markup validation failed';
      return TrustedMarkupRenderer.#reject(host, signature, message);
    }
  }

  public static renderError(host: HTMLElement, error: unknown): TrustedMarkupRenderResult {
    const message = error instanceof Error ? error.message : String(error);
    return TrustedMarkupRenderer.#reject(host, `error\u0000${message}`, message);
  }

  static #reject(
    host: HTMLElement,
    signature: string,
    message: string
  ): TrustedMarkupRenderResult {
    const current = TrustedMarkupRenderer.#rendered.get(host);
    if (current?.signature === signature && !current.accepted) {
      return new TrustedMarkupRenderResult(false, false);
    }
    host.textContent = `Unable to render markup: ${message}`;
    TrustedMarkupRenderer.#rendered.set(
      host,
      new TrustedMarkupRenderRecord(false, signature)
    );
    return new TrustedMarkupRenderResult(false, true);
  }

  static #buildFragment(
    document: Document,
    parsed: DefaultTreeAdapterTypes.DocumentFragment,
    requireSvgRoot: boolean
  ): DocumentFragment {
    if (requireSvgRoot) {
      TrustedMarkupRenderer.#validateSvgRoot(parsed.childNodes);
    }

    const fragment = document.createDocumentFragment();
    const stylesheets: string[] = [];
    for (const child of parsed.childNodes) {
      const node = TrustedMarkupRenderer.#buildNode(document, child, stylesheets);
      if (node !== null) {
        fragment.appendChild(node);
      }
    }
    if (stylesheets.length > 0) {
      const svg = fragment.querySelector('svg');
      if (!(svg instanceof SVGSVGElement)) {
        throw new TrustedMarkupValidationError('SVG styles require one SVG root');
      }
      TrustedMarkupRenderer.#applySvgStyles(svg, stylesheets);
    }
    return fragment;
  }

  static #validateSvgRoot(nodes: readonly DefaultTreeAdapterTypes.ChildNode[]): void {
    let rootCount = 0;
    for (const node of nodes) {
      if (TrustedMarkupRenderer.#isText(node)) {
        if (node.value.trim().length > 0) {
          throw new TrustedMarkupValidationError('SVG markup must contain one SVG root');
        }
        continue;
      }
      if (TrustedMarkupRenderer.#isComment(node)) {
        continue;
      }
      if (!TrustedMarkupRenderer.#isElement(node)
        || node.namespaceURI !== TrustedMarkupRenderer.#svgNamespace
        || node.tagName.toLowerCase() !== 'svg') {
        throw new TrustedMarkupValidationError('SVG markup must contain one SVG root');
      }
      rootCount += 1;
    }
    if (rootCount !== 1) {
      throw new TrustedMarkupValidationError('SVG markup must contain one SVG root');
    }
  }

  static #buildNode(
    document: Document,
    node: DefaultTreeAdapterTypes.ChildNode,
    stylesheets: string[]
  ): Node | null {
    if (TrustedMarkupRenderer.#isText(node)) {
      return document.createTextNode(node.value);
    }
    if (TrustedMarkupRenderer.#isComment(node)) {
      return document.createComment(node.data);
    }
    if (!TrustedMarkupRenderer.#isElement(node)) {
      throw new TrustedMarkupValidationError('Document type nodes are not allowed');
    }
    return TrustedMarkupRenderer.#buildElement(document, node, stylesheets);
  }

  static #buildElement(
    document: Document,
    source: DefaultTreeAdapterTypes.Element,
    stylesheets: string[]
  ): Element | null {
    const tagName = source.tagName.toLowerCase();
    TrustedMarkupRenderer.#validateElement(source.namespaceURI, tagName);

    if (source.namespaceURI === TrustedMarkupRenderer.#svgNamespace && tagName === 'style') {
      stylesheets.push(TrustedMarkupRenderer.#readStyleText(source.childNodes));
      return null;
    }

    const element = source.namespaceURI === TrustedMarkupRenderer.#htmlNamespace
      ? document.createElement(source.tagName)
      : document.createElementNS(TrustedMarkupRenderer.#svgNamespace, source.tagName);

    for (const attribute of source.attrs) {
      const qualifiedName = attribute.prefix === undefined || attribute.prefix.length === 0
        ? attribute.name
        : `${attribute.prefix}:${attribute.name}`;
      const normalizedName = qualifiedName.toLowerCase();
      const value = TrustedMarkupRenderer.#validateAttribute(
        source.namespaceURI,
        normalizedName,
        attribute.value
      );
      if (attribute.namespace === undefined) {
        element.setAttribute(qualifiedName, value);
      } else {
        element.setAttributeNS(attribute.namespace, qualifiedName, value);
      }
    }

    for (const child of source.childNodes) {
      const childNode = TrustedMarkupRenderer.#buildNode(document, child, stylesheets);
      if (childNode !== null) {
        element.appendChild(childNode);
      }
    }
    return element;
  }

  static #validateElement(namespace: string, tagName: string): void {
    let allowed: ReadonlySet<string> | undefined;
    if (namespace === TrustedMarkupRenderer.#htmlNamespace) {
      allowed = TrustedMarkupRenderer.#htmlElements;
    } else if (namespace === TrustedMarkupRenderer.#svgNamespace) {
      allowed = TrustedMarkupRenderer.#svgElements;
    }
    if (allowed?.has(tagName) !== true) {
      throw new TrustedMarkupValidationError(`Element <${tagName}> is not allowed`);
    }
  }

  static #validateAttribute(namespace: string, name: string, rawValue: string): string {
    if (name.startsWith('on')) {
      throw new TrustedMarkupValidationError(`Attribute ${name} is not allowed`);
    }
    if (!TrustedMarkupRenderer.#attributes.has(name)
      && !name.startsWith('aria-')
      && !name.startsWith('data-')) {
      throw new TrustedMarkupValidationError(`Attribute ${name} is not allowed`);
    }
    if (name === 'style') {
      return TrustedMarkupRenderer.#validateInlineStyle(rawValue);
    }
    if (TrustedMarkupRenderer.#urlAttributes.has(name)) {
      if (namespace === TrustedMarkupRenderer.#svgNamespace) {
        TrustedMarkupRenderer.#validateLocalFragment(rawValue);
      } else {
        TrustedMarkupRenderer.#validateUrl(rawValue);
      }
    }
    if (TrustedMarkupRenderer.#fragmentUrlAttributes.has(name)) {
      TrustedMarkupRenderer.#validateFragmentUrl(rawValue);
    }
    return rawValue;
  }

  static #validateInlineStyle(style: string): string {
    const root = TrustedMarkupRenderer.#parseStylesheet(`trusted-inline{${style}}`);
    const rule = root.nodes[0];
    if (root.nodes.length !== 1
      || rule?.type !== 'rule'
      || rule.selector !== 'trusted-inline') {
      throw new TrustedMarkupValidationError('Malformed inline style');
    }
    const declarations: string[] = [];
    for (const node of rule.nodes) {
      if (node.type === 'comment') {
        continue;
      }
      if (node.type !== 'decl') {
        throw new TrustedMarkupValidationError('Malformed inline style');
      }
      const property = TrustedMarkupRenderer.#validateCssDeclaration(node.prop, node.value);
      const priority = node.important ? ' !important' : '';
      declarations.push(`${property}: ${node.value}${priority}`);
    }
    return declarations.join('; ');
  }

  static #readStyleText(nodes: readonly DefaultTreeAdapterTypes.ChildNode[]): string {
    let css = '';
    for (const node of nodes) {
      if (!TrustedMarkupRenderer.#isText(node)) {
        throw new TrustedMarkupValidationError('SVG style elements may only contain text');
      }
      css += node.value;
    }
    return css;
  }

  static #applySvgStyles(svg: SVGSVGElement, stylesheets: readonly string[]): void {
    const originalProperties = new WeakMap<Element, ReadonlySet<string>>();
    for (const stylesheet of stylesheets) {
      const root = TrustedMarkupRenderer.#parseStylesheet(stylesheet);
      for (const node of root.nodes) {
        if (node.type === 'atrule' || node.type === 'comment') {
          continue;
        }
        if (node.type !== 'rule') {
          throw new TrustedMarkupValidationError(`CSS ${node.type} rules are not allowed`);
        }
        TrustedMarkupRenderer.#applySvgStyleRule(svg, node, originalProperties);
      }
    }
  }

  static #parseStylesheet(stylesheet: string): Root {
    try {
      return parse(stylesheet, { 'from': undefined });
    } catch {
      throw new TrustedMarkupValidationError('SVG stylesheet is malformed');
    }
  }

  static #applySvgStyleRule(
    svg: SVGSVGElement,
    rule: Rule,
    originalProperties: WeakMap<Element, ReadonlySet<string>>
  ): void {
    const targets: Element[] = [];
    try {
      if (svg.matches(rule.selector)) {
        targets.push(svg);
      }
      const descendants = svg.querySelectorAll(rule.selector);
      for (const descendant of descendants) {
        targets.push(descendant);
      }
    } catch {
      throw new TrustedMarkupValidationError('SVG stylesheet contains an invalid selector');
    }
    if (targets.length === 0) {
      return;
    }

    for (const node of rule.nodes) {
      if (node.type === 'comment') {
        continue;
      }
      if (node.type !== 'decl') {
        throw new TrustedMarkupValidationError('Nested CSS rules are not allowed');
      }
      const property = TrustedMarkupRenderer.#validateCssDeclaration(node.prop, node.value);
      for (const target of targets) {
        const style = TrustedMarkupRenderer.#elementStyle(target);
        if (style !== null
          && !TrustedMarkupRenderer.#originalProperties(target, style, originalProperties)
            .has(property)) {
          style.setProperty(property, node.value, node.important ? 'important' : '');
        }
      }
    }
  }

  static #elementStyle(element: Element): CSSStyleDeclaration | null {
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      return element.style;
    }
    return null;
  }

  static #validateCssDeclaration(rawProperty: string, value: string): string {
    const property = rawProperty.trim().toLowerCase();
    if (!TrustedMarkupRenderer.#cssProperties.has(property)) {
      throw new TrustedMarkupValidationError(`CSS property ${property} is not allowed`);
    }
    TrustedMarkupRenderer.#validateCssValue(value);
    return property;
  }

  static #originalProperties(
    element: Element,
    style: CSSStyleDeclaration,
    originalProperties: WeakMap<Element, ReadonlySet<string>>
  ): ReadonlySet<string> {
    const existing = originalProperties.get(element);
    if (existing !== undefined) {
      return existing;
    }
    const properties = new Set<string>();
    const propertyCount = style.length;
    for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
      const property = style.item(propertyIndex);
      if (property.length > 0) {
        properties.add(property);
      }
    }
    originalProperties.set(element, properties);
    return properties;
  }

  static #validateCssValue(value: string): void {
    if (value.includes('\\')) {
      throw new TrustedMarkupValidationError('CSS escapes are not allowed');
    }
    const parsed = parseCssValue(value);
    parsed.walk((node) => {
      if ('unclosed' in node && node.unclosed === true) {
        throw new TrustedMarkupValidationError('CSS value is malformed');
      }
      if (node.type !== 'function') {
        return;
      }
      const functionName = node.value.toLowerCase();
      if (functionName === 'url') {
        if (node.nodes.length !== 1) {
          throw new TrustedMarkupValidationError('CSS URL is malformed');
        }
        const resource = node.nodes[0];
        if (resource === undefined
          || (resource.type !== 'string' && resource.type !== 'word')) {
          throw new TrustedMarkupValidationError('CSS URL is malformed');
        }
        TrustedMarkupRenderer.#validateLocalFragment(resource.value);
        return;
      }
      if (functionName === 'attr'
        || functionName === 'element'
        || functionName === 'env'
        || functionName === 'image'
        || functionName === 'image-set'
        || functionName === 'src'
        || functionName === 'var') {
        throw new TrustedMarkupValidationError(`CSS function ${functionName} is not allowed`);
      }
    });
  }

  static #validateUrl(value: string): void {
    if (TRUSTED_MARKUP_RENDERER_PATTERNS.controlCharacters.test(value)) {
      throw new TrustedMarkupValidationError('URL contains control characters');
    }
    const trimmed = value.trim();
    if (TRUSTED_MARKUP_RENDERER_PATTERNS.fragment.test(trimmed)) {
      return;
    }
    const parsed = new URL(trimmed, 'https://trusted-markup.invalid/');
    if (parsed.protocol !== 'https:'
      && parsed.protocol !== 'http:'
      && parsed.protocol !== 'mailto:') {
      throw new TrustedMarkupValidationError(`URL scheme ${parsed.protocol} is not allowed`);
    }
  }

  static #validateFragmentUrl(value: string): void {
    TrustedMarkupRenderer.#validateCssValue(value);
  }

  static #validateLocalFragment(value: string): void {
    const trimmed = value.trim();
    if (!TRUSTED_MARKUP_RENDERER_PATTERNS.fragment.test(trimmed)) {
      throw new TrustedMarkupValidationError('SVG resources must reference a local fragment');
    }
  }

  static #isElement(
    node: DefaultTreeAdapterTypes.ChildNode
  ): node is DefaultTreeAdapterTypes.Element {
    return 'tagName' in node;
  }

  static #isText(
    node: DefaultTreeAdapterTypes.ChildNode
  ): node is DefaultTreeAdapterTypes.TextNode {
    return node.nodeName === '#text' && 'value' in node;
  }

  static #isComment(
    node: DefaultTreeAdapterTypes.ChildNode
  ): node is DefaultTreeAdapterTypes.CommentNode {
    return node.nodeName === '#comment' && 'data' in node;
  }
};
