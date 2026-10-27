import type { RoleRelationshipEntity } from '@studnicky/iridis';

import { RelationshipSources } from '@studnicky/iridis';

export class RelationshipSource {
  public static label(relationship: RoleRelationshipEntity.Type | undefined): string | undefined {
    if (relationship === undefined) {
      return undefined;
    }
    const names = RelationshipSources.names(relationship);
    const result = names.length === 0 ? undefined : names.join(' + ');
    return result;
  }

  public static primary(relationship: RoleRelationshipEntity.Type | undefined): string | undefined {
    if (relationship === undefined) {
      return undefined;
    }
    const result = RelationshipSources.names(relationship)[0];
    return result;
  }
}
