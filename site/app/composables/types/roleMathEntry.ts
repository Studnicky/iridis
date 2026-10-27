import type { RoleDefinitionEntity, RoleRelationshipEntity } from '@studnicky/iridis';

import type { RoleMathCandidateType } from './roleMathCandidateType.ts';
import type { RoleMathClampType } from './roleMathClampType.ts';
import type { RoleMathOrigin } from './roleMathOrigin.ts';

export declare class RoleMathEntry {
  'relationship': RoleRelationshipEntity.Type | null;
  'c': number;
  'candidates': RoleMathCandidateType[];
  'clamp': RoleMathClampType | null;
  'compliance': string;
  'def': RoleDefinitionEntity.Type | undefined;
  'h': number;
  'hex': string;
  'origin': typeof RoleMathOrigin.Direct;
  'l': number;
  'name': string;
  'parentRole': string | undefined;
  'pinnedSeedHex': string | null;
  'ratio': number;

}
