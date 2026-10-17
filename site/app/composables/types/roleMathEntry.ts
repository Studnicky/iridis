import type { RoleDefinitionInterfaceTypeEntity } from '@studnicky/iridis';

import type { RoleMathAlgorithmInfoType } from './roleMathAlgorithmInfo.ts';
import type { RoleMathCandidateType } from './roleMathCandidate.ts';
import type { RoleMathClampType } from './roleMathClamp.ts';
import type { RoleMathOrigin } from './roleMathOrigin.ts';

export declare class RoleMathEntry {
  'algorithmInfo': RoleMathAlgorithmInfoType | null;
  'c': number;
  'candidates': RoleMathCandidateType[];
  'clamp': RoleMathClampType | null;
  'compliance': string;
  'def': RoleDefinitionInterfaceTypeEntity.Type | undefined;
  'h': number;
  'hex': string;
  'origin': typeof RoleMathOrigin.Direct;
  'l': number;
  'name': string;
  'parentRole': string | undefined;
  'pinnedSeedHex': string | null;
  'ratio': number;

}
