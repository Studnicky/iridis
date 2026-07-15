import type { CarouselCardType } from './carouselCard.ts';

/** One top-level stage carousel's definition — see stageGroups.ts's `STAGE_GROUPS`. */
export type StageGroupType = {
  'items': CarouselCardType[];
  'label': string;
  'name': string;
};
