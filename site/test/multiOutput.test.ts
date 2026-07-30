import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
import { createRenderer, h } from 'vue';

import type { OutputRowType } from '../app/composables/types/outputRow.ts';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

class HostNode {
  readonly children: HostNode[] = [];
  parent: HostElement | null = null;
  text: string;

  constructor(text = '') {
    this.text = text;
  }
}

class HostElement extends HostNode {
  readonly tag: string;

  constructor(tag: string) {
    super();
    this.tag = tag;
  }
}

class HostOperations {
  static createComment(): HostNode {return new HostNode();}
  static createElement(tag: string): HostElement {return new HostElement(tag);}
  static createText(text: string): HostNode {return new HostNode(text);}

  static insert(child: HostNode, parent: HostElement, anchor: HostNode | null): void {
    child.parent = parent;
    const anchorIndex = anchor === null ? -1 : parent.children.indexOf(anchor);
    if (anchorIndex === -1) {parent.children.push(child);} else {parent.children.splice(anchorIndex, 0, child);}
  }

  static insertStaticContent(content: string, parent: HostElement, anchor: HostNode | null): [HostNode, HostNode] {
    const node = new HostNode(content);
    HostOperations.insert(node, parent, anchor);
    return [node, node];
  }

  static nextSibling(node: HostNode): HostNode | null {
    if (node.parent === null) {return null;}
    const index = node.parent.children.indexOf(node);
    return node.parent.children.at(index + 1) ?? null;
  }

  static parentNode(node: HostNode): HostElement | null {
    const parent = node.parent;
    if (parent === null) {return null;}
    return parent;
  }
  static patchProp(): void {}

  static remove(child: HostNode): void {
    if (child.parent === null) {return;}
    const index = child.parent.children.indexOf(child);
    if (index !== -1) {child.parent.children.splice(index, 1);}
    child.parent = null;
  }

  static setElementText(element: HostElement, text: string): void {element.text = text;}
  static setScopeId(): void {}
  static setText(node: HostNode, text: string): void {node.text = text;}
}

class OutputHarness {
  static operation: (() => { readonly 'outputsByKey': { 'value': Record<string, OutputRowType | undefined> } }) | undefined;
  static outputs: { 'value': Record<string, OutputRowType | undefined> } | undefined;

  static render() {
    const properties = { 'data-test': 'multi-output-harness' };
    return h('div', properties);
  }

  static setup(): typeof OutputHarness.render {
    const operation = OutputHarness.operation;
    if (operation === undefined) {throw new Error('Output operation is not registered');}
    OutputHarness.outputs = operation().outputsByKey;
    return OutputHarness.render;
  }
}

class OutputAssertions {
  static hasText(row: { readonly 'text': string } | undefined): boolean {
    return row !== undefined && row.text.length > 0;
  }
}

await test('useMultiOutput validates real plugin slots and falls back from an unknown schema', async () => {
  const { useIridis } = await import('../app/composables/useIridis.ts');
  const { useMultiOutput } = await import('../app/composables/useMultiOutput.ts');
  const iridis = useIridis();
  iridis.schemaName.value = 'not-registered';

  const renderer = createRenderer<HostNode, HostElement>({
    'createComment':       HostOperations.createComment,
    'createElement':       HostOperations.createElement,
    'createText':          HostOperations.createText,
    'insert':              HostOperations.insert,
    'insertStaticContent': HostOperations.insertStaticContent,
    'nextSibling':         HostOperations.nextSibling,
    'parentNode':          HostOperations.parentNode,
    'patchProp':           HostOperations.patchProp,
    'remove':              HostOperations.remove,
    'setElementText':      HostOperations.setElementText,
    'setScopeId':          HostOperations.setScopeId,
    'setText':             HostOperations.setText
  });
  OutputHarness.operation = useMultiOutput;
  const app = renderer.createApp({ 'setup': OutputHarness.setup });
  app.mount(new HostElement('root'));

  if (OutputHarness.outputs === undefined) {throw new Error('Output ref was not registered during component setup');}
  const rows = OutputHarness.outputs.value;
  const expectedKeys = ['androidThemeXml', 'capacitor', 'chakra', 'cssVars', 'cssVarsScoped', 'json', 'mui', 'panda', 'rdf', 'shadcn', 'tailwind', 'unocss', 'vscode'];
  assert.deepEqual(Object.keys(rows).toSorted(), expectedKeys);
  assert.equal(Object.values(rows).every(OutputAssertions.hasText), true);
});
