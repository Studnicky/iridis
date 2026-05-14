import { DataFactory, Store } from 'n3';

import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { contrastWcag21, getOrCreateOutput } from '@studnicky/iridis';
import { colorologyVocab } from '../data/colorologyVocab.ts';

const xsdDecimal = 'http://www.w3.org/2001/XMLSchema#decimal';
const xsdString  = 'http://www.w3.org/2001/XMLSchema#string';
const rdfType    = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function colorIri(hex: string): string {
  return `https://studnicky.dev/colorology/color/${hex.replace('#', '')}`;
}

function roleIri(name: string): string {
  return `https://studnicky.dev/colorology/role/${name}`;
}

function paletteIri(startedAt: number): string {
  return `https://studnicky.dev/colorology/palette/run-${startedAt}`;
}


export class ReasonAnnotate implements TaskInterface {
  readonly 'name' = 'reason:annotate';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'reason:annotate',
    'reads':       ['roles', 'colors'],
    'writes':      ['outputs.reasoning.graph'],
    'description': 'Annotate palette with RDF triples via n3 Store',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const store       = new Store();
    const paletteNode = DataFactory.namedNode(paletteIri(ctx.startedAt));
    const roleType    = DataFactory.namedNode(colorologyVocab.Role);
    const rdfTypeNode = DataFactory.namedNode(rdfType);
    const hasRoleNode = DataFactory.namedNode(colorologyVocab.hasRole);
    const hasColorNode = DataFactory.namedNode(colorologyVocab.hasColor);
    const oklchNode   = DataFactory.namedNode(colorologyVocab.oklch);
    const rgbNode     = DataFactory.namedNode(colorologyVocab.rgb);
    const hexNode     = DataFactory.namedNode(colorologyVocab.hex);
    const ratioNode   = DataFactory.namedNode(colorologyVocab.wcag21Ratio);
    const p3RNode     = DataFactory.namedNode(colorologyVocab.displayP3R);
    const p3GNode     = DataFactory.namedNode(colorologyVocab.displayP3G);
    const p3BNode     = DataFactory.namedNode(colorologyVocab.displayP3B);
    const xsdDecimalNode = DataFactory.namedNode(xsdDecimal);

    for (const [roleName, color] of Object.entries(state.roles)) {
      const role  = DataFactory.namedNode(roleIri(roleName));
      const colorN = DataFactory.namedNode(colorIri(color.hex));

      store.addQuad(DataFactory.quad(role,    rdfTypeNode,  roleType));
      store.addQuad(DataFactory.quad(role,    hasColorNode, colorN));
      store.addQuad(DataFactory.quad(colorN,  hexNode,      DataFactory.literal(color.hex, DataFactory.namedNode(xsdString))));
      store.addQuad(DataFactory.quad(colorN,  oklchNode,    DataFactory.blankNode()));
      store.addQuad(DataFactory.quad(colorN,  rgbNode,      DataFactory.blankNode()));

      // Display-P3 channels: emitted ONLY when the record carries a
      // wide-gamut value (out-of-sRGB OKLCH input or `intake:p3` origin).
      // Channels are xsd:decimal literals at 4dp, matching CSS Color 4
      // `color(display-p3 r g b)` semantics — SPARQL consumers can join
      // these triples with the hex literal to surface the wide-gamut
      // form when supported, fall back to hex when not.
      if (color.displayP3) {
        store.addQuad(DataFactory.quad(colorN, p3RNode, DataFactory.literal(color.displayP3.r.toFixed(4), xsdDecimalNode)));
        store.addQuad(DataFactory.quad(colorN, p3GNode, DataFactory.literal(color.displayP3.g.toFixed(4), xsdDecimalNode)));
        store.addQuad(DataFactory.quad(colorN, p3BNode, DataFactory.literal(color.displayP3.b.toFixed(4), xsdDecimalNode)));
      }

      store.addQuad(DataFactory.quad(paletteNode, hasRoleNode, role));
    }

    const roleEntries = Object.entries(state.roles);

    for (let i = 0; i < roleEntries.length; i += 1) {
      for (let j = 0; j < roleEntries.length; j += 1) {
        if (i === j) {
          continue;
        }
        const [fgName, fg] = roleEntries[i] as [string, ColorRecordInterface];
        const [bgName, bg] = roleEntries[j] as [string, ColorRecordInterface];
        const pairIri      = `https://studnicky.dev/colorology/pair/${fgName}-on-${bgName}`;
        const ratio        = contrastWcag21.apply(fg, bg);

        store.addQuad(DataFactory.quad(
          DataFactory.namedNode(pairIri),
          ratioNode,
          DataFactory.literal(ratio.toFixed(2), DataFactory.namedNode(xsdDecimal)),
        ));
      }
    }

    const reasoning = getOrCreateOutput(state, 'reasoning');
    reasoning['graph'] = store;

    ctx.logger.info('ReasonAnnotate', 'run', 'RDF annotation complete', {
      'roleCount': Object.keys(state.roles).length,
    });
  }
}

export const reasonAnnotate = new ReasonAnnotate();
