import { GalleryAlgorithmTypeEntity } from './entities/GalleryAlgorithmTypeEntity.ts';
import { GalleryCandidateOutputEntity } from './entities/GalleryCandidateOutputEntity.ts';
import { ImagePlugin } from './ImagePlugin.ts';

export { galleryRoleSchema5 }        from './data/galleryRoleSchema5.ts';
export { ImagePlugin };
export const imagePlugin = new ImagePlugin();
export { ClusterDispatcher }            from './tasks/ClusterDispatcher.ts';
export type { ClusterStrategyInterface } from './tasks/ClusterStrategyInterface.ts';
export { galleryAssignRoles }         from './tasks/GalleryAssignRoles.ts';
export { galleryExtract }             from './tasks/GalleryExtract.ts';
export { galleryExtractCandidates }   from './tasks/GalleryExtractCandidates.ts';
export { galleryHarmonize }           from './tasks/GalleryHarmonize.ts';
export { galleryHistogram }           from './tasks/GalleryHistogram.ts';
export { GalleryAlgorithmTypeEntity };
export { GalleryCandidateOutputEntity };
export type { GalleryCandidatesSlotType }     from './types/GalleryCandidatesSlotType.ts';
