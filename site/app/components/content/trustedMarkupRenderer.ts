import type { DefaultTreeAdapterTypes } from 'parse5';
import type { Declaration, Root, Rule } from 'postcss';
import type { Node } from 'postcss-value-parser';

import { parseFragment } from 'parse5';
import { parse } from 'postcss';
import parseCssValue from 'postcss-value-parser';

import { TRUSTED_MARKUP_RENDERER_PATTERNS } from './constants/TrustedMarkupRendererPatterns.ts';

abstract class TrustedMarkupRenderOutcome {
  public abstract get accepted(): boolean;
  public abstract get changed(): boolean;
}

class TrustedMarkupAcceptedChangedOutcome extends TrustedMarkupRenderOutcome {
  public get accepted(): boolean {
    const result = true;
    return result;
  }

  public get changed(): boolean {
    const result = true;
    return result;
  }
}

class TrustedMarkupAcceptedUnchangedOutcome extends TrustedMarkupRenderOutcome {
  public get accepted(): boolean {
    const result = true;
    return result;
  }

  public get changed(): boolean {
    const result = false;
    return result;
  }
}

class TrustedMarkupRejectedChangedOutcome extends TrustedMarkupRenderOutcome {
  public get accepted(): boolean {
    const result = false;
    return result;
  }

  public get changed(): boolean {
    const result = true;
    return result;
  }
}

class TrustedMarkupRejectedUnchangedOutcome extends TrustedMarkupRenderOutcome {
  public get accepted(): boolean {
    const result = false;
    return result;
  }

  public get changed(): boolean {
    const result = false;
    return result;
  }
}

abstract class TrustedMarkupFormat {
  public abstract cacheKey(): string;

  public abstract validateRoot(
    nodes: readonly DefaultTreeAdapterTypes.ChildNode[],
    validateSvgRoot: (nodes: readonly DefaultTreeAdapterTypes.ChildNode[]) => void
  ): void;
}

class TrustedMarkupHtmlFormat extends TrustedMarkupFormat {
  public cacheKey(): string {
    const result = 'html';
    return result;
  }

  public validateRoot(
    _nodes: readonly DefaultTreeAdapterTypes.ChildNode[],
    _validateSvgRoot: (nodes: readonly DefaultTreeAdapterTypes.ChildNode[]) => void
  ): void {}
}

class TrustedMarkupSvgFormat extends TrustedMarkupFormat {
  public cacheKey(): string {
    const result = 'svg';
    return result;
  }

  public validateRoot(
    nodes: readonly DefaultTreeAdapterTypes.ChildNode[],
    validateSvgRoot: (nodes: readonly DefaultTreeAdapterTypes.ChildNode[]) => void
  ): void {
    validateSvgRoot(nodes);
  }
}

namespace TrustedMarkupFormatEntity {
  export class Format {
    static readonly #html = new TrustedMarkupHtmlFormat();
    static readonly #svg = new TrustedMarkupSvgFormat();

    public static intake(value: unknown): TrustedMarkupFormat {
      if (value === 'html') {
        const result = TrustedMarkupFormatEntity.Format.#html;
        return result;
      }
      if (value === 'svg') {
        const result = TrustedMarkupFormatEntity.Format.#svg;
        return result;
      }
      throw new TrustedMarkupValidationError('Markup format must be html or svg');
    }
  }
}

class TrustedMarkupRenderRecord {
  public readonly outcome: TrustedMarkupRenderOutcome;
  public readonly signature: string;

  public constructor(outcome: TrustedMarkupRenderOutcome, signature: string) {
    this.outcome = outcome;
    this.signature = signature;
  }
}

namespace TrustedMarkupErrorEntity {
  export class ErrorMessage {
    public static intake(value: unknown): string {
      const result = value instanceof Error ? value.message : String(value);
      return result;
    }
  }
}

class TrustedMarkupValidationError extends Error {}

export const trustedMarkupRenderer = class TrustedMarkupRenderer {
  static readonly #htmlNamespace = 'http://www.w3.org/1999/xhtml';
  static readonly #svgNamespace = 'http://www.w3.org/2000/svg';
  static readonly #acceptedChangedOutcome = new TrustedMarkupAcceptedChangedOutcome();
  static readonly #acceptedUnchangedOutcome = new TrustedMarkupAcceptedUnchangedOutcome();
  static readonly #rejectedChangedOutcome = new TrustedMarkupRejectedChangedOutcome();
  static readonly #rejectedUnchangedOutcome = new TrustedMarkupRejectedUnchangedOutcome();

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
    'position',
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
    'animation',
    'background',
    'background-color',
    'border',
    'border-color',
    'border-radius',
    'border-style',
    'border-width',
    'box-sizing',
    'color',
    'cursor',
    'display',
    'dominant-baseline',
    'fill',
    'fill-opacity',
    'filter',
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
    'pointer-events',
    'position',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-width',
    'text-align',
    'text-anchor',
    'text-decoration',
    'transform',
    'transform-origin',
    'vertical-align',
    'white-space',
    'width',
    'z-index'
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
    formatInput: unknown
  ): TrustedMarkupRenderOutcome {
    let signature = `invalid\u0000${markup}`;
    try {
      const format = TrustedMarkupFormatEntity.Format.intake(formatInput);
      signature = `${format.cacheKey()}\u0000${markup}`;
      const current = TrustedMarkupRenderer.#rendered.get(host);
      if (current?.signature === signature) {
        const result = current.outcome.accepted
          ? TrustedMarkupRenderer.#acceptedUnchangedOutcome
          : TrustedMarkupRenderer.#rejectedUnchangedOutcome;
        return result;
      }

      const parsed = parseFragment(markup);
      const fragment = TrustedMarkupRenderer.#buildFragment(
        host.ownerDocument,
        parsed,
        format
      );
      host.replaceChildren(fragment);
      TrustedMarkupRenderer.#rendered.set(
        host,
        new TrustedMarkupRenderRecord(TrustedMarkupRenderer.#acceptedChangedOutcome, signature)
      );
      const result = TrustedMarkupRenderer.#acceptedChangedOutcome;
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Markup validation failed';
      const result = TrustedMarkupRenderer.#reject(host, signature, message);
      return result;
    }
  }

  public static renderError(host: HTMLElement, error: string): TrustedMarkupRenderOutcome {
    const result = TrustedMarkupRenderer.#reject(host, `error\u0000${error}`, error);
    return result;
  }

  public static renderUnknownError(host: HTMLElement, error: unknown): TrustedMarkupRenderOutcome {
    const message = TrustedMarkupErrorEntity.ErrorMessage.intake(error);
    const result = TrustedMarkupRenderer.renderError(host, message);
    return result;
  }

  static #reject(
    host: HTMLElement,
    signature: string,
    message: string
  ): TrustedMarkupRenderOutcome {
    const current = TrustedMarkupRenderer.#rendered.get(host);
    if (current?.signature === signature && !current.outcome.accepted) {
      const result = TrustedMarkupRenderer.#rejectedUnchangedOutcome;
      return result;
    }
    host.textContent = `Unable to render markup: ${message}`;
    TrustedMarkupRenderer.#rendered.set(
      host,
      new TrustedMarkupRenderRecord(TrustedMarkupRenderer.#rejectedChangedOutcome, signature)
    );
    const result = TrustedMarkupRenderer.#rejectedChangedOutcome;
    return result;
  }

  static #buildFragment(
    document: Document,
    parsed: DefaultTreeAdapterTypes.DocumentFragment,
    format: TrustedMarkupFormat
  ): DocumentFragment {
    format.validateRoot(parsed.childNodes, TrustedMarkupRenderer.#validateSvgRoot);

    const fragment = document.createDocumentFragment();
    const stylesheets: string[] = [];
    for (let childIndex = 0; childIndex < parsed.childNodes.length; childIndex += 1) {
      const child = parsed.childNodes[childIndex];
      if (child === undefined) {
        throw new TrustedMarkupValidationError('Markup contains an invalid child node');
      }
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
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (node === undefined) {
        throw new TrustedMarkupValidationError('SVG markup contains an invalid child node');
      }
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
  ): globalThis.Node | null {
    if (TrustedMarkupRenderer.#isText(node)) {
      const result = document.createTextNode(node.value);
      return result;
    }
    if (TrustedMarkupRenderer.#isComment(node)) {
      const result = document.createComment(node.data);
      return result;
    }
    if (!TrustedMarkupRenderer.#isElement(node)) {
      throw new TrustedMarkupValidationError('Document type nodes are not allowed');
    }
    const result = TrustedMarkupRenderer.#buildElement(document, node, stylesheets);
    return result;
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
      const result = null;
      return result;
    }

    const element = source.namespaceURI === TrustedMarkupRenderer.#htmlNamespace
      ? document.createElement(source.tagName)
      : document.createElementNS(TrustedMarkupRenderer.#svgNamespace, source.tagName);

    for (let attributeIndex = 0; attributeIndex < source.attrs.length; attributeIndex += 1) {
      const attribute = TrustedMarkupRenderer.#required(source.attrs[attributeIndex], 'Markup contains an invalid attribute');
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

    for (let childIndex = 0; childIndex < source.childNodes.length; childIndex += 1) {
      const child = TrustedMarkupRenderer.#required(source.childNodes[childIndex], 'Markup contains an invalid child node');
      const childNode = TrustedMarkupRenderer.#buildNode(document, child, stylesheets);
      if (childNode !== null) {
        element.appendChild(childNode);
      }
    }
    return element;
  }

  static #required<Value>(value: Value | undefined, message: string): Value {
    if (value === undefined) {
      throw new TrustedMarkupValidationError(message);
    }
    const result = value;
    return result;
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
      const result = TrustedMarkupRenderer.#validateInlineStyle(rawValue);
      return result;
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
    const result = rawValue;
    return result;
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
    for (let nodeIndex = 0; nodeIndex < rule.nodes.length; nodeIndex += 1) {
      const node = rule.nodes[nodeIndex];
      if (node?.type === 'comment') {
        continue;
      }
      if (!TrustedMarkupRenderer.#isCssDeclaration(node)) {
        throw new TrustedMarkupValidationError('Malformed inline style');
      }
      const property = TrustedMarkupRenderer.#validateCssDeclaration(node.prop, node.value);
      const priority = node.important === true ? ' !important' : '';
      declarations.push(`${property}: ${node.value}${priority}`);
    }
    const result = declarations.join('; ');
    return result;
  }

  static #readStyleText(nodes: readonly DefaultTreeAdapterTypes.ChildNode[]): string {
    let css = '';
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (node === undefined || !TrustedMarkupRenderer.#isText(node)) {
        throw new TrustedMarkupValidationError('SVG style elements may only contain text');
      }
      css += node.value;
    }
    return css;
  }

  static #applySvgStyles(svg: SVGSVGElement, stylesheets: readonly string[]): void {
    const originalProperties = new WeakMap<Element, ReadonlySet<string>>();
    for (let stylesheetIndex = 0; stylesheetIndex < stylesheets.length; stylesheetIndex += 1) {
      const stylesheet = stylesheets[stylesheetIndex];
      if (stylesheet === undefined) {
        throw new TrustedMarkupValidationError('SVG stylesheet is malformed');
      }
      const root = TrustedMarkupRenderer.#parseStylesheet(stylesheet);
      for (let nodeIndex = 0; nodeIndex < root.nodes.length; nodeIndex += 1) {
        const node = root.nodes[nodeIndex];
        if (node?.type === 'atrule' || node?.type === 'comment') {
          continue;
        }
        if (!TrustedMarkupRenderer.#isCssRule(node)) {
          const ruleType = node?.type ?? 'unknown';
          throw new TrustedMarkupValidationError(`CSS ${ruleType} rules are not allowed`);
        }
        TrustedMarkupRenderer.#applySvgStyleRule(svg, node, originalProperties);
      }
    }
  }

  static #parseStylesheet(stylesheet: string): Root {
    try {
      const result = parse(stylesheet, { 'from': undefined });
      return result;
    } catch {
      throw new TrustedMarkupValidationError('SVG stylesheet is malformed');
    }
  }

  static #applySvgStyleRule(
    svg: SVGSVGElement,
    rule: Rule,
    originalProperties: WeakMap<Element, ReadonlySet<string>>
  ): void {
    const selector = rule.selector;
    const targets = TrustedMarkupRenderer.#styleTargets(svg, selector);
    for (let nodeIndex = 0; nodeIndex < rule.nodes.length; nodeIndex += 1) {
      const node = rule.nodes[nodeIndex];
      if (node?.type === 'comment') {
        continue;
      }
      if (!TrustedMarkupRenderer.#isCssDeclaration(node)) {
        throw new TrustedMarkupValidationError('Nested CSS rules are not allowed');
      }
      const property = TrustedMarkupRenderer.#validateCssDeclaration(node.prop, node.value);
      TrustedMarkupRenderer.#applySvgStyleProperty(
        targets,
        property,
        originalProperties,
        (style: CSSStyleDeclaration): void => {
          style.setProperty(property, node.value, node.important === true ? 'important' : '');
        }
      );
    }
  }

  static #applySvgStyleProperty(
    targets: readonly Element[],
    property: string,
    originalProperties: WeakMap<Element, ReadonlySet<string>>,
    writeStyle: (style: CSSStyleDeclaration) => void
  ): void {
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      const target = targets[targetIndex];
      if (target === undefined) {
        continue;
      }
      const style = target instanceof HTMLElement || target instanceof SVGElement
        ? target.style
        : null;
      if (style !== null
        && !TrustedMarkupRenderer.#originalProperties(target, style, originalProperties)
          .has(property)) {
        writeStyle(style);
      }
    }
  }

  static #isCssDeclaration(node: Root['nodes'][number] | undefined): node is Declaration {
    const result = node?.type === 'decl';
    return result;
  }

  static #isCssRule(node: Root['nodes'][number] | undefined): node is Rule {
    const result = node?.type === 'rule';
    return result;
  }

  static #styleTargets(svg: SVGSVGElement, selector: string): Element[] {
    const targets: Element[] = [];
    try {
      if (svg.matches(selector)) {
        targets.push(svg);
      }
      const descendants = svg.querySelectorAll(selector);
      for (let descendantIndex = 0; descendantIndex < descendants.length; descendantIndex += 1) {
        const descendant = descendants.item(descendantIndex);
        targets.push(descendant);
      }
    } catch {
      throw new TrustedMarkupValidationError('SVG stylesheet contains an invalid selector');
    }
    const result = targets;
    return result;
  }

  static #validateCssDeclaration(rawProperty: string, value: string): string {
    const property = rawProperty.trim().toLowerCase();
    if (!TrustedMarkupRenderer.#cssProperties.has(property)
      && !property.startsWith('--mermaid-')) {
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
      const result = existing;
      return result;
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
    const result = properties;
    return result;
  }

  static #validateCssValue(value: string): void {
    if (value.includes('\\')) {
      throw new TrustedMarkupValidationError('CSS escapes are not allowed');
    }
    const parsed = parseCssValue(value);
    parsed.walk(TrustedMarkupRenderer.#validateNode);
  }

  static #validateNode(node: Node): void {
    if ('unclosed' in node && node.unclosed === true) {
      throw new TrustedMarkupValidationError('CSS value is malformed');
    }
    if (node.type === 'function') {
      TrustedMarkupRenderer.#validateCssFunction(node);
    }
  }

  static #validateCssFunction(node: Node & { readonly 'type': 'function' }): void {
    const functionName = node.value.toLowerCase();
    if (functionName === 'url') {
      TrustedMarkupRenderer.#validateCssUrlFunction(node);
    } else {
      const forbiddenFunctions = new Set(['attr', 'element', 'env', 'image', 'image-set', 'src', 'var']);
      if (forbiddenFunctions.has(functionName)) {
        throw new TrustedMarkupValidationError(`CSS function ${functionName} is not allowed`);
      }
    }
  }

  static #validateCssUrlFunction(node: Node & { readonly 'type': 'function' }): void {
    if (node.nodes.length !== 1) {
      throw new TrustedMarkupValidationError('CSS URL is malformed');
    }
    const resource = node.nodes[0];
    if (resource === undefined || (resource.type !== 'string' && resource.type !== 'word')) {
      throw new TrustedMarkupValidationError('CSS URL is malformed');
    }
    TrustedMarkupRenderer.#validateLocalFragment(resource.value);
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
    const result = 'tagName' in node;
    return result;
  }

  static #isText(
    node: DefaultTreeAdapterTypes.ChildNode
  ): node is DefaultTreeAdapterTypes.TextNode {
    const result = node.nodeName === '#text' && 'value' in node;
    return result;
  }

  static #isComment(
    node: DefaultTreeAdapterTypes.ChildNode
  ): node is DefaultTreeAdapterTypes.CommentNode {
    const result = node.nodeName === '#comment' && 'data' in node;
    return result;
  }
};
