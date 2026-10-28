import { Engine } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { mock, test } from 'node:test';

import { OutputKeyEntity } from '../app/composables/entities/OutputKeyEntity.ts';
import { PaletteResolveRequestEntity } from '../app/composables/entities/PaletteResolveRequestEntity.ts';
import { PaletteSnapshotEntity } from '../app/composables/entities/PaletteSnapshotEntity.ts';
import { OUTPUT_FORMAT_CARDS } from '../app/composables/outputFormatCards.ts';
import { PaletteResolve } from '../app/composables/paletteResolve.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';
import { RdfRunIdentifier } from './fixtures/RdfRunIdentifier.ts';

registerHooks(NuxtImportsLoader);

class PinnedRow {
  public readonly 'hash': string;
  public readonly 'label': string;
  public readonly 'language': string;

  public constructor(label: string, language: string, hash: string) {
    this.hash = hash;
    this.label = label;
    this.language = language;
  }
}

/** Row labels, languages, and text hashes captured from the main-thread builder for the fixture request. */
class PinnedRows {
  public static readonly dark = new Map<OutputKeyEntity.Type, PinnedRow>([
    ['androidThemeXml', new PinnedRow('Android theme.xml', 'xml', '6c8032d6a8303919ed2d48a5d2deef1d96c2bd8822851c480573e9164a5a34c0')],
    ['capacitor', new PinnedRow('Capacitor', 'javascript', 'b40cba63ded61497b4ccd0b8f3bb1c570a5c481e4e52e935bd8f8a5f6a531bed')],
    ['chakra', new PinnedRow('Chakra UI', 'javascript', '669d51b30f5c6f967d74a0bdf85bd1d644fb6ab27b84358fdbedc165546b5514')],
    ['cssVars', new PinnedRow('CSS variables', 'css', 'cdfaa1b53c26adbbf2bb0066b0ba32f7725c62ec026de661f04b9ef037cc51de')],
    ['cssVarsScoped', new PinnedRow('CSS variables (scoped)', 'css', '5f79838c03748b13516eba76617b49ef8177e698206a7397fb9cbeb900540e75')],
    ['json', new PinnedRow('JSON', 'javascript', 'dca1df09e8769860d45cfa1df87014c7e04a471f12b7be88e05b46aef1221dfd')],
    ['mui', new PinnedRow('MUI', 'javascript', 'e879f75b416b81631bbbf31e678c09b05f151a3bb42aef4d462d11348fcd8d38')],
    ['panda', new PinnedRow('Panda CSS', 'javascript', '5a924903e0f66b37abd169bee479d849e26a7f9e1f120739c69dff86ebf2fe27')],
    ['rdf', new PinnedRow('RDF (Turtle)', 'turtle', '86430994b5b8d0198ab14c10b45b509054aa25fa85d3229649ad076b392631b2')],
    ['shadcn', new PinnedRow('shadcn/ui', 'css', '0677453164dcd6f33da8c20938bc6ecb3749b714d8a6afe1b61c8686a34f933c')],
    ['tailwind', new PinnedRow('Tailwind', 'javascript', '0beb4d3e5166498fb038f32a2842efd28a6a454b0cfbae1a7fa1885fac86f571')],
    ['unocss', new PinnedRow('UnoCSS', 'javascript', 'b8b0de10565e9c1404367e7ef6a88039f89738779622627ad23dc05db072741b')]
  ]);

  public static readonly light = new Map<OutputKeyEntity.Type, PinnedRow>([
    ['androidThemeXml', new PinnedRow('Android theme.xml', 'xml', 'c76e0e3cfb30cfc85c7a832c7a4f1af5f6ad80d51d2dadedbac57749e1668c83')],
    ['capacitor', new PinnedRow('Capacitor', 'javascript', '1146d007f02774b57f991f5cc88137b9a46d97868adc2fbc91fcfd0216768f55')],
    ['chakra', new PinnedRow('Chakra UI', 'javascript', '52e705246d480dceecd0ef0463fb2990fdd1e2072d9863707b7fa13e8dfcfd91')],
    ['cssVars', new PinnedRow('CSS variables', 'css', '0b406b89f32a1426b30824a26f9193203492ae972d6c90ae62579703f4228c60')],
    ['cssVarsScoped', new PinnedRow('CSS variables (scoped)', 'css', 'bc3b31de84c311f2a147d4b0a6cb7019d1e65b3cc6818dce30d3b36838be9af9')],
    ['json', new PinnedRow('JSON', 'javascript', 'da4175e9d6fb335bb9b4e61e2f5c4e7b14ee6fecb858ce4de1faf3e1f8e23f44')],
    ['mui', new PinnedRow('MUI', 'javascript', 'a62c79d8b6d22260bb803464486c5871db03f73a3971a334ed8e00ecbd7d31e8')],
    ['panda', new PinnedRow('Panda CSS', 'javascript', '9f17d37d37120cd315abed2ab926db2085b079721b4ee68810893f4890800b5f')],
    ['rdf', new PinnedRow('RDF (Turtle)', 'turtle', 'a3f23d8e79bac9b387e3d02e2e7f83ba3161c64755d2585d60e4838c50fe9412')],
    ['shadcn', new PinnedRow('shadcn/ui', 'css', '5d49391a0a324ed51f31104d94133b5d79dd70056a6ab65384f94560e5846471')],
    ['tailwind', new PinnedRow('Tailwind', 'javascript', '504ea38f5be674bac11f3dbce357af0842a606ed9c26b4d950a21fe5bef06171')],
    ['unocss', new PinnedRow('UnoCSS', 'javascript', 'd69ed598db2eec6fec5dc3088cc41f11c292a98344849eae32ba263c22f40a8d')]
  ]);

  public static assertRows(snapshot: PaletteSnapshotEntity.Type, pinned: ReadonlyMap<OutputKeyEntity.Type, PinnedRow>): void {
    const outputs = PaletteSnapshotEntity.intake(JSON.parse(JSON.stringify(snapshot))).outputs;
    assert.notEqual(outputs, void 0);
    assert.deepEqual(new Set(Object.keys(outputs ?? {})), new Set(pinned.keys()));
    for (const [key, expected] of pinned) {
      const row = outputs?.[key];
      assert.equal(row?.label, expected.label, `${key} label`);
      assert.equal(row?.language, expected.language, `${key} language`);
      const hash = createHash('sha256').update(RdfRunIdentifier.mask(row?.text ?? '')).digest('hex');
      assert.equal(hash, expected.hash, `${key} text`);
    }
  }
}

class Stages {
  public static isCompliance(stage: string): boolean {
    const result = stage === 'enforce:compliance';
    return result;
  }

  public static isEmit(stage: string): boolean {
    const result = stage.startsWith('emit:');
    return result;
  }
}

await test('OUTPUT_FORMAT_CARDS lists every output key in vocabulary order', () => {
  const keys = OUTPUT_FORMAT_CARDS.map((card) => {
    const key = card.key.replace('output-', '');
    return key;
  });
  assert.deepEqual(keys, [...OutputKeyEntity.Schema.enum]);
  assert.deepEqual(
    OUTPUT_FORMAT_CARDS.map((card) => {
      const label = card.label;
      return label;
    }),
    ['CSS variables', 'CSS vars (scoped)', 'Tailwind', 'shadcn/ui', 'MUI', 'Chakra UI', 'Panda CSS', 'UnoCSS', 'Capacitor', 'Android theme.xml', 'JSON', 'RDF (Turtle)']
  );
});

await test('a request without enableOutputs is rejected at the boundary', () => {
  assert.throws(() => {
    PaletteResolveRequestEntity.intake({ ...PaletteResolveFixture.request(), 'enableOutputs': void 0 });
  });
});

await test('enableOutputs false resolves the palette without output rows', () => {
  const snapshot = PaletteResolve.run(PaletteResolveRequestEntity.create(PaletteResolveFixture.request()));
  assert.equal(snapshot.outputs, void 0);
  assert.equal(snapshot.vscodeTheme, void 0);
  assert.equal(snapshot.roles.length > 0, true);
});

await test('enableOutputs true produces every dark output row with pinned text, labels, and languages', () => {
  const snapshot = PaletteResolve.run(PaletteResolveRequestEntity.create({ ...PaletteResolveFixture.request(), 'enableOutputs': true }));
  PinnedRows.assertRows(snapshot, PinnedRows.dark);
  assert.notEqual(snapshot.vscodeTheme, undefined);
  assert.notEqual(snapshot.vscodeCompliance, undefined);
});

await test('enableOutputs true produces every light output row with pinned text, labels, and languages', () => {
  const snapshot = PaletteResolve.run(PaletteResolveRequestEntity.create({ ...PaletteResolveFixture.request(), 'enableOutputs': true, 'framing': 'light' }));
  PinnedRows.assertRows(snapshot, PinnedRows.light);
  assert.notEqual(snapshot.vscodeTheme, undefined);
  assert.notEqual(snapshot.vscodeCompliance, undefined);
});

await test('one worker resolution runs the palette and canonical VS Code pipelines once each', () => {
  const run = mock.method(Engine.prototype, 'run');
  const pipeline = mock.method(Engine.prototype, 'pipeline');
  try {
    PaletteResolve.run(PaletteResolveRequestEntity.create({ ...PaletteResolveFixture.request(), 'enableOutputs': true }));
    assert.equal(run.mock.callCount(), 2);
    assert.equal(pipeline.mock.callCount(), 2);
    const paletteStages = pipeline.mock.calls[0]?.arguments[0] ?? [];
    const vscodeStages = pipeline.mock.calls[1]?.arguments[0] ?? [];
    assert.equal(paletteStages.filter(Stages.isCompliance).length, 1);
    assert.equal(paletteStages.includes('vscode:bridgeRoles'), true);
    assert.equal(paletteStages.includes('emit:cssVars'), true);
    assert.equal(paletteStages.includes('reason:serialize'), true);
    assert.equal(vscodeStages.includes('enforce:contrast'), true);
    assert.equal(vscodeStages.includes('emit:vscodeThemeJson'), true);
  } finally {
    run.mock.restore();
    pipeline.mock.restore();
  }
});

await test('enableOutputs false runs the palette stages only', () => {
  const pipeline = mock.method(Engine.prototype, 'pipeline');
  try {
    PaletteResolve.run(PaletteResolveRequestEntity.create(PaletteResolveFixture.request()));
    const stages = pipeline.mock.calls[0]?.arguments[0] ?? [];
    assert.equal(stages.some(Stages.isEmit), false);
  } finally {
    pipeline.mock.restore();
  }
});
