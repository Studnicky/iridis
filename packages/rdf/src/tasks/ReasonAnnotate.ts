import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  contrastWcag21,
  Metadata,
  TaskManifestEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { DataFactory, Store, Writer } from 'n3';

import { iridisVocab } from '../data/iridisVocab.ts';
import { XSD_IRI }     from './constants/XsdIri.ts';

class NQuads {
  static serialize(store: Store): string {
    const writer = new Writer({ 'format': 'N-Quads' });
    for (const quad of store) {writer.addQuad(quad);}
    let result = '';
    writer.end((error: Error | null, output: string) => {
      if (error !== null) {throw error;}
      result = output;
    });
    return result;
  }
}

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

  static adjustment(roleName: string, index: number): string {
    const result = `https://studnicky.dev/iridis/role/${roleName}/adjustment/${index}`;
    return result;
  }
}

class ReasonAnnotate implements TaskInterface {
  readonly 'name' = 'reason:annotate';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Annotate palette with RDF triples via n3 Store',
    'name':        'reason:annotate',
    'reads':       ['roles', 'colors'],
    'writes':      ['rdf:reasoningGraph']
  });

  private static emitColor(store: Store, roleName: string, color: PaletteStateInterface['roles'][string]): void {
    const colorNode = DataFactory.namedNode(Iri.color(color.hex));
    const decimalNode = DataFactory.namedNode(XSD_IRI.DECIMAL);
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.hex), DataFactory.literal(color.hex, DataFactory.namedNode(XSD_IRI.STRING))));
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.oklchL), DataFactory.literal(color.oklch.l.toFixed(4), decimalNode)));
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.oklchC), DataFactory.literal(color.oklch.c.toFixed(4), decimalNode)));
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.oklchH), DataFactory.literal(color.oklch.h.toFixed(2), decimalNode)));
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.rgbR), DataFactory.literal(color.rgb.r.toFixed(4), decimalNode)));
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.rgbG), DataFactory.literal(color.rgb.g.toFixed(4), decimalNode)));
    store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.rgbB), DataFactory.literal(color.rgb.b.toFixed(4), decimalNode)));
    if (color.displayP3 !== undefined) {
      store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.displayP3R), DataFactory.literal(color.displayP3.r.toFixed(4), decimalNode)));
      store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.displayP3G), DataFactory.literal(color.displayP3.g.toFixed(4), decimalNode)));
      store.addQuad(DataFactory.quad(colorNode, DataFactory.namedNode(iridisVocab.displayP3B), DataFactory.literal(color.displayP3.b.toFixed(4), decimalNode)));
    }
    const roleNode = DataFactory.namedNode(Iri.role(roleName));
    store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.hasColor), colorNode));
  }

  private static emitDefinition(store: Store, state: PaletteStateInterface, roleName: string): void {
    const definitions = state.input.roles?.roles ?? [];
    const definitionCount = definitions.length;
    for (let definitionIndex = 0; definitionIndex < definitionCount; definitionIndex++) {
      const definition = definitions[definitionIndex];
      if (definition?.name !== roleName) {
        continue;
      }
      const roleNode = DataFactory.namedNode(Iri.role(roleName));
      const decimalNode = DataFactory.namedNode(XSD_IRI.DECIMAL);
      if (definition.derivedFrom !== undefined) {store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.derivedFrom), DataFactory.namedNode(Iri.role(definition.derivedFrom))));}
      if (definition.intent !== undefined) {store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.intent), DataFactory.literal(definition.intent, DataFactory.namedNode(XSD_IRI.STRING))));}
      if (definition.lightnessRange !== undefined) {
        store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.leastPermittedLightness), DataFactory.literal(definition.lightnessRange[0].toFixed(4), decimalNode)));
        store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.greatestPermittedLightness), DataFactory.literal(definition.lightnessRange[1].toFixed(4), decimalNode)));
      }
      if (definition.chromaRange !== undefined) {
        store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.leastPermittedChroma), DataFactory.literal(definition.chromaRange[0].toFixed(4), decimalNode)));
        store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.greatestPermittedChroma), DataFactory.literal(definition.chromaRange[1].toFixed(4), decimalNode)));
      }
      if (definition.hueClamp !== undefined) {store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.hueClamp), DataFactory.literal(definition.hueClamp.toFixed(2), decimalNode)));}
      return;
    }
  }

  private static emitProvenance(store: Store, state: PaletteStateInterface, roleName: string): void {
    const provenance = Metadata.roleProvenance(state.metadata).get(roleName);
    if (provenance === undefined) {
      return;
    }
    const roleNode = DataFactory.namedNode(Iri.role(roleName));
    const booleanNode = DataFactory.namedNode(XSD_IRI.BOOLEAN);
    store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.resolutionOrigin), DataFactory.literal(provenance.origin, DataFactory.namedNode(XSD_IRI.STRING))));
    if (provenance.origin === 'stated') {store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.pinned), DataFactory.literal('true', booleanNode)));}
    if (provenance.origin === 'synthesized') {store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.synthesized), DataFactory.literal('true', booleanNode)));}
    const adjustmentCount = provenance.adjustments.length;
    for (let adjustmentIndex = 0; adjustmentIndex < adjustmentCount; adjustmentIndex++) {
      const adjustment = provenance.adjustments[adjustmentIndex];
      if (adjustment === undefined) {
        continue;
      }
      const adjustmentNode = DataFactory.namedNode(Iri.adjustment(roleName, adjustmentIndex));
      store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.hasAdjustment), adjustmentNode));
      store.addQuad(DataFactory.quad(adjustmentNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.Adjustment)));
      store.addQuad(DataFactory.quad(adjustmentNode, DataFactory.namedNode(iridisVocab.adjustedFrom), DataFactory.namedNode(Iri.color(adjustment.beforeHex))));
      store.addQuad(DataFactory.quad(adjustmentNode, DataFactory.namedNode(iridisVocab.adjustedTo), DataFactory.namedNode(Iri.color(adjustment.afterHex))));
      store.addQuad(DataFactory.quad(adjustmentNode, DataFactory.namedNode(iridisVocab.adjustmentOperation), DataFactory.literal(adjustment.operation, DataFactory.namedNode(XSD_IRI.STRING))));
      if (adjustment.operation === 'role-range') {store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.clampedFrom), DataFactory.namedNode(Iri.color(adjustment.beforeHex))));}
    }
  }

  private static emitContrasts(store: Store, state: PaletteStateInterface): void {
    const entries = Object.entries(state.roles);
    const roleCount = entries.length;
    const decimalNode = DataFactory.namedNode(XSD_IRI.DECIMAL);
    for (let foregroundIndex = 0; foregroundIndex < roleCount; foregroundIndex++) {
      const foregroundEntry = entries[foregroundIndex];
      if (foregroundEntry === undefined) {continue;}
      for (let backgroundIndex = 0; backgroundIndex < roleCount; backgroundIndex++) {
        if (foregroundIndex === backgroundIndex) {continue;}
        const backgroundEntry = entries[backgroundIndex];
        if (backgroundEntry === undefined) {continue;}
        const ratio = contrastWcag21.apply(foregroundEntry[1], backgroundEntry[1]);
        const pairIri = `https://studnicky.dev/iridis/pair/${foregroundEntry[0]}-on-${backgroundEntry[0]}`;
        store.addQuad(DataFactory.quad(DataFactory.namedNode(pairIri), DataFactory.namedNode(iridisVocab.wcag21Ratio), DataFactory.literal(ratio.toFixed(2), decimalNode)));
      }
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const store = new Store();
    const entries = Object.entries(state.roles);
    const roleCount = entries.length;
    const paletteNode = DataFactory.namedNode(Iri.palette(context.startedAt));
    for (let roleIndex = 0; roleIndex < roleCount; roleIndex++) {
      const entry = entries[roleIndex];
      if (entry === undefined) {continue;}
      const [roleName, color] = entry;
      const roleNode = DataFactory.namedNode(Iri.role(roleName));
      store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.Role)));
      store.addQuad(DataFactory.quad(paletteNode, DataFactory.namedNode(iridisVocab.hasRole), roleNode));
      ReasonAnnotate.emitColor(store, roleName, color);
      ReasonAnnotate.emitDefinition(store, state, roleName);
      ReasonAnnotate.emitProvenance(store, state, roleName);
    }
    ReasonAnnotate.emitContrasts(store, state);
    state.outputs['rdf:reasoningGraph'] = NQuads.serialize(store);
    context.logger.info(LogBody.create({ 'component': 'ReasonAnnotate', 'context': { 'roleCount': roleCount }, 'message': 'RDF annotation complete', 'operation': 'run', 'status': LOG_STATUS.SUCCESS }));
  }
}
export const reasonAnnotate = new ReasonAnnotate();
