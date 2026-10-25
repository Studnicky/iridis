import type { RelationshipGraphShape } from './RelationshipGraphShape.ts';

/** Lists the authored source roles required by a relationship operation. */
export class RelationshipSources {
  static names(
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number]
  ): readonly string[] {
    if (relationship.operation === 'alpha-overlay') {
      return [relationship.base, relationship.overlay];
    }
    if (relationship.operation === 'oklch-interpolate') {
      return [relationship.source, relationship.toward];
    }
    if (relationship.operation === 'hue-target') {
      const result = relationship.source === undefined ? [] : [relationship.source];
      return result;
    }
    return [relationship.source];
  }
}
