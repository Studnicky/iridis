import type {
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { contrastWcag21, getEngineMetadata } from '@studnicky/iridis';
import { LogBody }        from '@studnicky/logger/builders';
import { LOG_STATUS }     from '@studnicky/logger/constants';
import { DataFactory, Store } from 'n3';

import { iridisVocab } from '../data/iridisVocab.ts';

const xsdDecimal = 'http://www.w3.org/2001/XMLSchema#decimal';
const xsdString  = 'http://www.w3.org/2001/XMLSchema#string';
const xsdBoolean = 'http://www.w3.org/2001/XMLSchema#boolean';
const rdfType    = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

class Iri {
  static color(hex: string): string {
    const result = `https://studnicky.dev/iridis/color/${hex.replace('#', '')}`;
    return result;
  }

  static role(name: string): string {
    const result = `https://studnicky.dev/iridis/role/${name}`;
    return result;
  }

  static palette(startedAt: number): string {
    const result = `https://studnicky.dev/iridis/palette/run-${startedAt}`;
    return result;
  }
}

class ReasonAnnotate implements TaskInterface {
  readonly 'name' = 'reason:annotate';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Annotate palette with RDF triples via n3 Store',
    'name':        'reason:annotate',
    'reads':       ['roles', 'colors'],
    'writes':      ['rdf:reasoningGraph']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const store       = new Store();
    const paletteNode = DataFactory.namedNode(Iri.palette(ctx.startedAt));
    const roleType    = DataFactory.namedNode(iridisVocab.Role);
    const rdfTypeNode = DataFactory.namedNode(rdfType);
    const hasRoleNode  = DataFactory.namedNode(iridisVocab.hasRole);
    const hasColorNode = DataFactory.namedNode(iridisVocab.hasColor);
    const oklchLNode  = DataFactory.namedNode(iridisVocab.oklchL);
    const oklchCNode  = DataFactory.namedNode(iridisVocab.oklchC);
    const oklchHNode  = DataFactory.namedNode(iridisVocab.oklchH);
    const rgbRNode    = DataFactory.namedNode(iridisVocab.rgbR);
    const rgbGNode    = DataFactory.namedNode(iridisVocab.rgbG);
    const rgbBNode    = DataFactory.namedNode(iridisVocab.rgbB);
    const hexNode     = DataFactory.namedNode(iridisVocab.hex);
    const ratioNode   = DataFactory.namedNode(iridisVocab.wcag21Ratio);
    const p3RNode     = DataFactory.namedNode(iridisVocab.displayP3R);
    const p3GNode     = DataFactory.namedNode(iridisVocab.displayP3G);
    const p3BNode     = DataFactory.namedNode(iridisVocab.displayP3B);
    const derivedFromNode = DataFactory.namedNode(iridisVocab.derivedFrom);
    const pinnedNode      = DataFactory.namedNode(iridisVocab.pinned);
    const synthesizedNode = DataFactory.namedNode(iridisVocab.synthesized);
    const intentNode      = DataFactory.namedNode(iridisVocab.intent);
    const lightnessMinNode = DataFactory.namedNode(iridisVocab.lightnessRangeMin);
    const lightnessMaxNode = DataFactory.namedNode(iridisVocab.lightnessRangeMax);
    const chromaMinNode    = DataFactory.namedNode(iridisVocab.chromaRangeMin);
    const chromaMaxNode    = DataFactory.namedNode(iridisVocab.chromaRangeMax);
    const hueClampNode     = DataFactory.namedNode(iridisVocab.hueClamp);
    const clampedFromNode  = DataFactory.namedNode(iridisVocab.clampedFrom);
    const xsdDecimalNode = DataFactory.namedNode(xsdDecimal);
    const xsdBooleanNode = DataFactory.namedNode(xsdBoolean);

    // Schema role definitions (derivedFrom/intent/ranges/hueClamp) and this
    // run's own resolution metadata (which roles were pinned/synthesized/
    // clamped) — both already flow through the engine, just never read by
    // this task before. Neither requires new plumbing.
    const roleDefByName = new Map<string, RoleDefinitionInterfaceType>(
      (state.input.roles?.roles ?? []).map((def) => [def.name, def])
    );
    const rolesPinned      = getEngineMetadata(state.metadata, 'core:rolesPinned') ?? [];
    const rolesSynthesized = getEngineMetadata(state.metadata, 'core:rolesSynthesized') ?? [];
    const roleClamps       = getEngineMetadata(state.metadata, 'core:roleClamps') ?? {};

    for (const [roleName, color] of Object.entries(state.roles)) {
      const role  = DataFactory.namedNode(Iri.role(roleName));
      const colorN = DataFactory.namedNode(Iri.color(color.hex));

      store.addQuad(DataFactory.quad(role,    rdfTypeNode,  roleType));
      store.addQuad(DataFactory.quad(role,    hasColorNode, colorN));
      store.addQuad(DataFactory.quad(colorN,  hexNode,      DataFactory.literal(color.hex, DataFactory.namedNode(xsdString))));
      store.addQuad(DataFactory.quad(colorN,  oklchLNode,   DataFactory.literal(color.oklch.l.toFixed(4), xsdDecimalNode)));
      store.addQuad(DataFactory.quad(colorN,  oklchCNode,   DataFactory.literal(color.oklch.c.toFixed(4), xsdDecimalNode)));
      store.addQuad(DataFactory.quad(colorN,  oklchHNode,   DataFactory.literal(color.oklch.h.toFixed(2), xsdDecimalNode)));
      store.addQuad(DataFactory.quad(colorN,  rgbRNode,     DataFactory.literal(color.rgb.r.toFixed(4), xsdDecimalNode)));
      store.addQuad(DataFactory.quad(colorN,  rgbGNode,     DataFactory.literal(color.rgb.g.toFixed(4), xsdDecimalNode)));
      store.addQuad(DataFactory.quad(colorN,  rgbBNode,     DataFactory.literal(color.rgb.b.toFixed(4), xsdDecimalNode)));

      // Display-P3 channels: emitted ONLY when the record carries a
      // wide-gamut value (out-of-sRGB OKLCH input or `intake:p3` origin).
      // Channels are xsd:decimal literals at 4dp, matching CSS Color 4
      // `color(display-p3 r g b)` semantics; SPARQL consumers can join
      // these triples with the hex literal to surface the wide-gamut
      // form when supported, fall back to hex when not.
      if (color.displayP3 !== undefined) {
        store.addQuad(DataFactory.quad(colorN, p3RNode, DataFactory.literal(color.displayP3.r.toFixed(4), xsdDecimalNode)));
        store.addQuad(DataFactory.quad(colorN, p3GNode, DataFactory.literal(color.displayP3.g.toFixed(4), xsdDecimalNode)));
        store.addQuad(DataFactory.quad(colorN, p3BNode, DataFactory.literal(color.displayP3.b.toFixed(4), xsdDecimalNode)));
      }

      // Resolution/relations — HOW this role's color was actually arrived
      // at, not just its final value.
      const def = roleDefByName.get(roleName);
      if (def?.derivedFrom !== undefined) {
        store.addQuad(DataFactory.quad(role, derivedFromNode, DataFactory.namedNode(Iri.role(def.derivedFrom))));
      }
      if (def?.intent !== undefined) {
        store.addQuad(DataFactory.quad(role, intentNode, DataFactory.literal(def.intent, DataFactory.namedNode(xsdString))));
      }
      if (def?.lightnessRange !== undefined) {
        store.addQuad(DataFactory.quad(role, lightnessMinNode, DataFactory.literal(def.lightnessRange[0].toFixed(4), xsdDecimalNode)));
        store.addQuad(DataFactory.quad(role, lightnessMaxNode, DataFactory.literal(def.lightnessRange[1].toFixed(4), xsdDecimalNode)));
      }
      if (def?.chromaRange !== undefined) {
        store.addQuad(DataFactory.quad(role, chromaMinNode, DataFactory.literal(def.chromaRange[0].toFixed(4), xsdDecimalNode)));
        store.addQuad(DataFactory.quad(role, chromaMaxNode, DataFactory.literal(def.chromaRange[1].toFixed(4), xsdDecimalNode)));
      }
      if (def?.hueClamp !== undefined) {
        store.addQuad(DataFactory.quad(role, hueClampNode, DataFactory.literal(def.hueClamp.toFixed(2), xsdDecimalNode)));
      }
      if (rolesPinned.includes(roleName)) {
        store.addQuad(DataFactory.quad(role, pinnedNode, DataFactory.literal('true', xsdBooleanNode)));
      }
      if (rolesSynthesized.includes(roleName)) {
        store.addQuad(DataFactory.quad(role, synthesizedNode, DataFactory.literal('true', xsdBooleanNode)));
      }
      const clamp = roleClamps[roleName];
      if (clamp !== undefined) {
        store.addQuad(DataFactory.quad(role, clampedFromNode, DataFactory.namedNode(Iri.color(clamp.seedHex))));
      }

      store.addQuad(DataFactory.quad(paletteNode, hasRoleNode, role));
    }

    const roleEntries = Object.entries(state.roles);

    for (let i = 0; i < roleEntries.length; i += 1) {
      for (let j = 0; j < roleEntries.length; j += 1) {
        if (i === j) {
          continue;
        }
        const [fgName, fg] = roleEntries[i]!;
        const [bgName, bg] = roleEntries[j]!;
        const pairIri      = `https://studnicky.dev/iridis/pair/${fgName}-on-${bgName}`;
        const ratio        = contrastWcag21.apply(fg, bg);

        store.addQuad(DataFactory.quad(
          DataFactory.namedNode(pairIri),
          ratioNode,
          DataFactory.literal(ratio.toFixed(2), DataFactory.namedNode(xsdDecimal))
        ));
      }
    }

    state.outputs['rdf:reasoningGraph'] = store;

    ctx.logger.info(
      LogBody.create()
        .component('ReasonAnnotate')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('RDF annotation complete')
        .context({ 'roleCount': Object.keys(state.roles).length })
        .build()
    );
  }
}

export const reasonAnnotate = new ReasonAnnotate();
