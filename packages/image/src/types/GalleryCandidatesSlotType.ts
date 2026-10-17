import type { GalleryCandidateOutputEntity } from '../entities/GalleryCandidateOutputEntity.ts';

/** Serialized candidate palettes written by gallery:extractCandidates. */
export abstract class GalleryCandidatesSlotType extends Array<GalleryCandidateOutputEntity.Type> {}
