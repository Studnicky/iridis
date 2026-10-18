import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createRenderer, h } from 'vue';

import type { OutputRowInterfaceTypeEntity } from '../app/composables/entities/OutputRowInterfaceTypeEntity.ts';

import { SchemaNameInterfaceTypeEntity } from '../app/composables/entities/SchemaNameInterfaceTypeEntity.ts';
import { OUTPUT_FORMAT_CARDS } from '../app/composables/outputFormatCards.ts';
import { IridisUiEvent } from '../app/composables/types/iridisUiEvent.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

await test('OUTPUT_FORMAT_CARDS matches useMultiOutput non-VS-Code rows in pipeline order', () => {
  assert.deepEqual(
    OUTPUT_FORMAT_CARDS,
    [
      { 'key': 'output-cssVars', 'label': 'CSS variables' },
      { 'key': 'output-cssVarsScoped', 'label': 'CSS vars (scoped)' },
      { 'key': 'output-tailwind', 'label': 'Tailwind' },
      { 'key': 'output-shadcn', 'label': 'shadcn/ui' },
      { 'key': 'output-mui', 'label': 'MUI' },
      { 'key': 'output-chakra', 'label': 'Chakra UI' },
      { 'key': 'output-panda', 'label': 'Panda CSS' },
      { 'key': 'output-unocss', 'label': 'UnoCSS' },
      { 'key': 'output-capacitor', 'label': 'Capacitor' },
      { 'key': 'output-androidThemeXml', 'label': 'Android theme.xml' },
      { 'key': 'output-json', 'label': 'JSON' },
      { 'key': 'output-rdf', 'label': 'RDF (Turtle)' }
    ]
  );
});

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
    const sibling = node.parent.children.at(index + 1) ?? null;
    return sibling;
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
  static readonly state: {
    'operation': (() => { readonly 'outputsByKey': { 'value': Record<string, OutputRowInterfaceTypeEntity.Type | undefined> } }) | undefined;
    'outputs': { 'value': Record<string, OutputRowInterfaceTypeEntity.Type | undefined> } | undefined;
  } = { 'operation': undefined, 'outputs': undefined };

  static render() {
    const properties = { 'data-test': 'multi-output-harness' };
    const node = h('div', properties);
    return node;
  }

  static setup(): typeof OutputHarness.render {
    const operation = OutputHarness.state.operation;
    if (operation === undefined) {throw new Error('Output operation is not registered');}
    OutputHarness.state.outputs = operation().outputsByKey;
    const render = OutputHarness.render;
    return render;
  }
}

class OutputAssertions {
  static hasText(row: { readonly 'text': string } | undefined): boolean {
    const hasText = row !== undefined && row.text.length > 0;
    return hasText;
  }
}

await test('useMultiOutput uses the current framing for non-VS-Code outputs and falls back from an unknown schema', async () => {
  const { useIridis } = await import('../app/composables/useIridis.ts');
  const { useMultiOutput } = await import('../app/composables/useMultiOutput.ts');
  const iridis = useIridis();
  assert.throws(() => {
    const schemaName = SchemaNameInterfaceTypeEntity.intake('not-registered');
    return schemaName;
  });
  iridis.schemaName.value = SchemaNameInterfaceTypeEntity.defaultValue;
  iridis.send(IridisUiEvent.setLightFraming());
  assert.equal(iridis.framing.value, 'light');

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
  OutputHarness.state.operation = useMultiOutput;
  const app = renderer.createApp({ 'setup': OutputHarness.setup });
  app.mount(new HostElement('root'));

  const output = OutputHarness.state.outputs;
  if (output === undefined) {throw new Error('Output ref was not registered during component setup');}
  const rows = output.value;
  const expectedKeys = ['androidThemeXml', 'capacitor', 'chakra', 'cssVars', 'cssVarsScoped', 'json', 'mui', 'panda', 'rdf', 'shadcn', 'tailwind', 'unocss'];
  const sortedRowKeys = Object.keys(rows).toSorted((left, right) => {
    const comparison = left.localeCompare(right);
    return comparison;
  });
  assert.deepEqual(sortedRowKeys, expectedKeys);
  assert.equal(Object.values(rows).every(OutputAssertions.hasText), true);
  assert.equal(rows.vscode, undefined);
});

await test('useMultiOutput does not retain the legacy VS Code pipeline', async () => {
  const source = await readFile(new URL('../app/composables/useMultiOutput.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('intakeHexHint'), false);
  assert.equal(source.includes('vscodeRoleSchema16'), false);
  assert.equal(source.includes('VSCODE_ROLE_SCHEMAS_16'), false);
  assert.equal(source.includes('vscode:seedRoles'), false);
});
