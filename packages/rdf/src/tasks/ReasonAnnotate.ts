import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  ColorRecordEntity,
  contrastWcag21,
  Metadata,
  RelationshipToleranceEntity,
  RoleRelationshipEntity,
  RoleRelationshipGraphEntity,
  RoleRelationshipGroupEntity,
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

  static relationshipGraph(schemaName: string): string {
    const result = `https://studnicky.dev/iridis/relationship-graph/${schemaName}`;
    return result;
  }

  static relationshipGroup(schemaName: string, groupId: string): string {
    const result = `${Iri.relationshipGraph(schemaName)}/group/${groupId}`;
    return result;
  }

  static harmonyMode(schemaName: string, groupId: string, modeId: string): string {
    const result = `${Iri.relationshipGroup(schemaName, groupId)}/mode/${modeId}`;
    return result;
  }

  static harmonyVariant(schemaName: string, groupId: string, modeId: string, variantId: string): string {
    const result = `${Iri.harmonyMode(schemaName, groupId, modeId)}/variant/${variantId}`;
    return result;
  }

  static relationship(schemaName: string, groupId: string, relationshipId: string): string {
    const result = `${Iri.relationshipGroup(schemaName, groupId)}/relationship/${relationshipId}`;
    return result;
  }

  static relationshipTolerance(schemaName: string, groupId: string, relationshipId: string): string {
    const result = `${Iri.relationship(schemaName, groupId, relationshipId)}/tolerance`;
    return result;
  }

  static relationshipResolution(roleName: string): string {
    const result = `https://studnicky.dev/iridis/role/${roleName}/relationship-resolution`;
    return result;
  }

  static resolutionDeviation(roleName: string): string {
    const result = `${Iri.relationshipResolution(roleName)}/deviation`;
    return result;
  }
}

class ReasonAnnotate implements TaskInterface {
  readonly 'name' = 'reason:annotate';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Annotate palette with RDF triples via n3 Store',
    'name':        'reason:annotate',
    'reads':       ['roles', 'colors', 'input.roles', "metadata['core:relationshipResolution']"],
    'writes':      ['rdf:reasoningGraph']
  });

  private static emitColor(store: Store, roleName: string, color: PaletteStateInterface['roles'][string]): void {
    const colorNode = ReasonAnnotate.emitColorValue(store, color);
    const roleNode = DataFactory.namedNode(Iri.role(roleName));
    store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.hasColor), colorNode));
  }

  private static emitColorValue(store: Store, color: PaletteStateInterface['roles'][string]) {
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
    return colorNode;
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

  private static emitRelationshipGraph(store: Store, state: PaletteStateInterface, paletteNode: ReturnType<typeof DataFactory.namedNode>): void {
    const schema = state.input.roles;
    const graphInput = schema?.relationshipGraph;
    if (schema === undefined || graphInput === undefined) {
      return;
    }
    const graph = RoleRelationshipGraphEntity.intake(graphInput);
    const graphNode = DataFactory.namedNode(Iri.relationshipGraph(schema.name));
    store.addQuad(DataFactory.quad(paletteNode, DataFactory.namedNode(iridisVocab.hasRelationshipGraph), graphNode));
    store.addQuad(DataFactory.quad(graphNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.RelationshipGraph)));
    for (let groupIndex = 0; groupIndex < graph.groups.length; groupIndex += 1) {
      const groupInput = graph.groups[groupIndex];
      if (groupInput !== undefined) {
        const group = RoleRelationshipGroupEntity.intake(groupInput);
        ReasonAnnotate.emitRelationshipGroup(store, schema.name, graphNode, group);
      }
    }
  }

  private static emitRelationshipGroup(
    store: Store,
    schemaName: string,
    graphNode: ReturnType<typeof DataFactory.namedNode>,
    group: RoleRelationshipGroupEntity.Type
  ): void {
    const groupNode = DataFactory.namedNode(Iri.relationshipGroup(schemaName, group.id));
    store.addQuad(DataFactory.quad(graphNode, DataFactory.namedNode(iridisVocab.hasRelationshipGroup), groupNode));
    store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.RelationshipGroup)));
    store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(iridisVocab.graphAnchor), DataFactory.namedNode(Iri.role(group.anchor))));
    store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(iridisVocab.relationshipGroupName), DataFactory.literal(group.name, DataFactory.namedNode(XSD_IRI.STRING))));
    const defaultModeNode = DataFactory.namedNode(Iri.harmonyMode(schemaName, group.id, group.defaultMode));
    store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(iridisVocab.defaultHarmonyMode), defaultModeNode));
    store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(iridisVocab.selectedHarmonyMode), defaultModeNode));
    for (const mode of group.modes) {
      const modeNode = DataFactory.namedNode(Iri.harmonyMode(schemaName, group.id, mode.id));
      store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(iridisVocab.hasHarmonyMode), modeNode));
      store.addQuad(DataFactory.quad(modeNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.HarmonyMode)));
      for (const variant of mode.hueOffsets) {
        const variantNode = DataFactory.namedNode(Iri.harmonyVariant(schemaName, group.id, mode.id, variant.variantId));
        store.addQuad(DataFactory.quad(modeNode, DataFactory.namedNode(iridisVocab.hasHarmonyVariant), variantNode));
        store.addQuad(DataFactory.quad(variantNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.HarmonyVariant)));
        store.addQuad(DataFactory.quad(variantNode, DataFactory.namedNode(iridisVocab.hueVariantId), DataFactory.literal(variant.variantId, DataFactory.namedNode(XSD_IRI.STRING))));
        store.addQuad(DataFactory.quad(variantNode, DataFactory.namedNode(iridisVocab.hueDegrees), DataFactory.literal(variant.degrees.toFixed(2), DataFactory.namedNode(XSD_IRI.DECIMAL))));
      }
    }
    for (let relationshipIndex = 0; relationshipIndex < group.relationships.length; relationshipIndex += 1) {
      const relationship = group.relationships[relationshipIndex];
      if (relationship !== undefined) {
        ReasonAnnotate.emitRelationship(
          store,
          schemaName,
          group,
          groupNode,
          RoleRelationshipEntity.intake(relationship)
        );
      }
    }
  }

  private static emitRelationship(
    store: Store,
    schemaName: string,
    group: RoleRelationshipGroupEntity.Type,
    groupNode: ReturnType<typeof DataFactory.namedNode>,
    relationship: RoleRelationshipEntity.Type
  ): void {
    const relationshipNode = DataFactory.namedNode(Iri.relationship(schemaName, group.id, relationship.id));
    store.addQuad(DataFactory.quad(groupNode, DataFactory.namedNode(iridisVocab.hasRelationship), relationshipNode));
    store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.RoleRelationship)));
    store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.relationshipTarget), DataFactory.namedNode(Iri.role(relationship.target))));
    store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.relationshipOperation), DataFactory.literal(relationship.operation, DataFactory.namedNode(XSD_IRI.STRING))));
    store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.relationshipPriority), DataFactory.literal(String(relationship.priority), DataFactory.namedNode(XSD_IRI.INTEGER))));
    store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.relationshipRelaxability), DataFactory.literal(relationship.relaxability, DataFactory.namedNode(XSD_IRI.STRING))));
    const sources = ReasonAnnotate.relationshipSources(relationship);
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      const source = sources[sourceIndex];
      if (source !== undefined) {
        store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.relationshipSource), DataFactory.namedNode(Iri.role(source))));
      }
    }
    ReasonAnnotate.emitRelationshipParameters(store, schemaName, group, relationshipNode, relationship);
    if (relationship.tolerance !== undefined) {
      const toleranceNode = DataFactory.namedNode(Iri.relationshipTolerance(schemaName, group.id, relationship.id));
      store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.relationshipTolerance), toleranceNode));
      ReasonAnnotate.emitTolerance(
        store,
        toleranceNode,
        RelationshipToleranceEntity.intake(relationship.tolerance)
      );
    }
  }

  private static emitRelationshipParameters(
    store: Store,
    schemaName: string,
    group: RoleRelationshipGroupEntity.Type,
    relationshipNode: ReturnType<typeof DataFactory.namedNode>,
    relationship: RoleRelationshipEntity.Type
  ): void {
    const decimalNode = DataFactory.namedNode(XSD_IRI.DECIMAL);
    if (relationship.operation === 'hue-offset') {
      if (relationship.degrees !== undefined) {
        store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.hueDegrees), DataFactory.literal(relationship.degrees.toFixed(2), decimalNode)));
      }
      if (relationship.variantId !== undefined) {
        const modeId = relationship.modeId ?? group.defaultMode;
        const variantNode = DataFactory.namedNode(Iri.harmonyVariant(schemaName, group.id, modeId, relationship.variantId));
        store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.harmonyVariant), variantNode));
      }
      return;
    }
    if (relationship.operation === 'oklch-delta') {
      if (relationship.lightnessOffset !== undefined) {
        store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.lightnessOffset), DataFactory.literal(relationship.lightnessOffset.toFixed(4), decimalNode)));
      }
      if (relationship.chromaScale !== undefined) {
        store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.chromaScale), DataFactory.literal(relationship.chromaScale.toFixed(4), decimalNode)));
      }
      if (relationship.hueOffset !== undefined) {
        store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.hueOffset), DataFactory.literal(relationship.hueOffset.toFixed(2), decimalNode)));
      }
      return;
    }
    if (relationship.operation === 'oklch-interpolate') {
      store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.interpolationWeight), DataFactory.literal(relationship.weight.toFixed(4), decimalNode)));
      return;
    }
    if (relationship.operation === 'alpha-overlay') {
      store.addQuad(DataFactory.quad(relationshipNode, DataFactory.namedNode(iridisVocab.overlayAlpha), DataFactory.literal(relationship.alpha.toFixed(4), decimalNode)));
    }
  }

  private static relationshipSources(relationship: RoleRelationshipEntity.Type): readonly string[] {
    if ('source' in relationship) {
      const result = relationship.operation === 'oklch-interpolate'
        ? [relationship.source, relationship.toward]
        : [relationship.source];
      return result;
    }
    const result = [relationship.base, relationship.overlay];
    return result;
  }

  private static emitTolerance(
    store: Store,
    toleranceNode: ReturnType<typeof DataFactory.namedNode>,
    tolerance: RelationshipToleranceEntity.Type
  ): void {
    const decimalNode = DataFactory.namedNode(XSD_IRI.DECIMAL);
    store.addQuad(DataFactory.quad(toleranceNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.RelationshipTolerance)));
    if (tolerance.alpha !== undefined) {store.addQuad(DataFactory.quad(toleranceNode, DataFactory.namedNode(iridisVocab.toleranceAlpha), DataFactory.literal(tolerance.alpha.toFixed(4), decimalNode)));}
    if (tolerance.chroma !== undefined) {store.addQuad(DataFactory.quad(toleranceNode, DataFactory.namedNode(iridisVocab.toleranceChroma), DataFactory.literal(tolerance.chroma.toFixed(4), decimalNode)));}
    if (tolerance.hue !== undefined) {store.addQuad(DataFactory.quad(toleranceNode, DataFactory.namedNode(iridisVocab.toleranceHue), DataFactory.literal(tolerance.hue.toFixed(2), decimalNode)));}
    if (tolerance.lightness !== undefined) {store.addQuad(DataFactory.quad(toleranceNode, DataFactory.namedNode(iridisVocab.toleranceLightness), DataFactory.literal(tolerance.lightness.toFixed(4), decimalNode)));}
  }

  private static emitRelationshipResolution(store: Store, state: PaletteStateInterface, roleName: string): void {
    const schema = state.input.roles;
    const resolution = Metadata.relationshipResolution(state.metadata).get(roleName);
    if (schema === undefined || resolution === undefined) {
      return;
    }
    const roleNode = DataFactory.namedNode(Iri.role(roleName));
    const resolutionNode = DataFactory.namedNode(Iri.relationshipResolution(roleName));
    store.addQuad(DataFactory.quad(roleNode, DataFactory.namedNode(iridisVocab.hasRelationshipResolution), resolutionNode));
    store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(XSD_IRI.RDF_TYPE), DataFactory.namedNode(iridisVocab.RelationshipResolution)));
    store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionRelationship), DataFactory.namedNode(Iri.relationship(schema.name, resolution.groupId, resolution.relationshipId))));
    store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionGroup), DataFactory.namedNode(Iri.relationshipGroup(schema.name, resolution.groupId))));
    store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionDisposition), DataFactory.literal(resolution.disposition, DataFactory.namedNode(XSD_IRI.STRING))));
    if (resolution.modeId !== undefined) {
      store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionMode), DataFactory.namedNode(Iri.harmonyMode(schema.name, resolution.groupId, resolution.modeId))));
    }
    if (resolution.blockedReason !== undefined) {
      store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionBlockedReason), DataFactory.literal(resolution.blockedReason, DataFactory.namedNode(XSD_IRI.STRING))));
    }
    for (let sourceIndex = 0; sourceIndex < resolution.sources.length; sourceIndex += 1) {
      const source = resolution.sources[sourceIndex];
      if (source !== undefined) {
        store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionSource), DataFactory.namedNode(Iri.role(source))));
      }
    }
    if (resolution.before !== undefined) {
      const before = ReasonAnnotate.emitColorValue(store, ColorRecordEntity.intake(resolution.before));
      store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionBefore), before));
    }
    if (resolution.after !== undefined) {
      const after = ReasonAnnotate.emitColorValue(store, ColorRecordEntity.intake(resolution.after));
      store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionAfter), after));
    }
    if (resolution.deviation !== undefined) {
      const deviationNode = DataFactory.namedNode(Iri.resolutionDeviation(roleName));
      store.addQuad(DataFactory.quad(resolutionNode, DataFactory.namedNode(iridisVocab.resolutionDeviation), deviationNode));
      ReasonAnnotate.emitTolerance(
        store,
        deviationNode,
        RelationshipToleranceEntity.intake(resolution.deviation)
      );
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
    ReasonAnnotate.emitRelationshipGraph(store, state, paletteNode);
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
      ReasonAnnotate.emitRelationshipResolution(store, state, roleName);
    }
    ReasonAnnotate.emitContrasts(store, state);
    state.outputs['rdf:reasoningGraph'] = NQuads.serialize(store);
    context.logger.info(LogBody.create({ 'component': 'ReasonAnnotate', 'context': { 'roleCount': roleCount }, 'message': 'RDF annotation complete', 'operation': 'run', 'status': LOG_STATUS.SUCCESS }));
  }
}
export const reasonAnnotate = new ReasonAnnotate();
