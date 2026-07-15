import type { RoleDefinitionInterfaceType } from '@studnicky/iridis/model';

import type { RoleMathAlgorithmInfoType } from './roleMathAlgorithmInfo.ts';
import type { RoleMathCandidateType } from './roleMathCandidate.ts';
import type { RoleMathClampType } from './roleMathClamp.ts';

/**
 * A schema role definition plus the optional derivation-geometry fields the
 * role-math detail card surfaces when a schema supplies them (they are absent
 * from the canonical role type, so they read as `undefined` for stock schemas).
 */
type RoleMathDefType = RoleDefinitionInterfaceType & {
  'chromaClamp'?:     number;
  'chromaTarget'?:    number;
  'lightnessClamp'?:  number;
  'lightnessTarget'?: number;
};

export type RoleMathEntryType = {
  'algorithmInfo': RoleMathAlgorithmInfoType | null;
  'c': number;
  'candidates': RoleMathCandidateType[];
  'clamp': RoleMathClampType | null;
  'compliance': string;
  'def': RoleMathDefType | undefined;
  'h': number;
  'hex': string;
  'isDerived': boolean;
  'isPinned': boolean;
  'l': number;
  'name': string;
  'parentRole': string | undefined;
  'pinnedSeedHex': string | null;
  'ratio': number;
  'synthesized': boolean;
};
