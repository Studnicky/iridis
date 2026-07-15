import { STAGE_GROUPS } from './stageGroups.ts';

/** Every stage name in forward order, for the site-wide Next/Previous step navigation. */
export const SEQUENTIAL_STAGE_NAMES: readonly string[] = STAGE_GROUPS.map((group) => { const result = group.name; return result; });
