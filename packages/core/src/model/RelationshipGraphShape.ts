import type { HarmonyModeEntity } from '../entities/HarmonyModeEntity.ts';
import type { RoleRelationshipGraphEntity } from '../entities/RoleRelationshipGraphEntity.ts';
import type { RoleRelationshipGroupEntity } from '../entities/RoleRelationshipGroupEntity.ts';

/** Structural graph interfaces shared by relationship resolution and validation. */
export namespace RelationshipGraphShape {
  export interface GraphInterface {
    readonly 'groups': RoleRelationshipGraphEntity.Type['groups'];
  }

  export interface GroupInterface {
    readonly 'anchor': RoleRelationshipGroupEntity.Type['anchor'];
    readonly 'defaultMode': RoleRelationshipGroupEntity.Type['defaultMode'];
    readonly 'id': RoleRelationshipGroupEntity.Type['id'];
    readonly 'modes': RoleRelationshipGroupEntity.Type['modes'];
    readonly 'name': RoleRelationshipGroupEntity.Type['name'];
    readonly 'relationships': RoleRelationshipGroupEntity.Type['relationships'];
  }

  export interface ModeInterface {
    readonly 'hueOffsets': HarmonyModeEntity.Type['hueOffsets'];
    readonly 'id': HarmonyModeEntity.Type['id'];
  }

}
