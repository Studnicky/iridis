import type { CarouselCardType } from './carouselCard.ts';

/** One top-level stage carousel's definition — see stageGroups.ts's `STAGE_GROUPS`. */
export declare class StageGroupType {
  'items': CarouselCardType[];
  'label': string;
  'name': string;
}
