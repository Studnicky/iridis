/**
 * An addressable location on the page: a card inside one of the 5 stage
 * carousels, a stage carousel itself, or a docs card. All three share this
 * shape so anything that wants to navigate the page — a "Learn more"
 * cross-reference, the ToC bar, or the stage Next/Previous buttons — can look
 * targets up by id without caring which kind of section it resolves to.
 *
 * A `card` target lives inside a specific stage's own local carousel state
 * (`stage` names it); resolving one both scrolls to that stage and selects
 * the card within its local index. A `stage` target only scrolls to the
 * stage's anchor — it is what the Next/Previous step buttons dispatch. A
 * `doc` target scrolls a docs card into view.
 */
export type NavigationTargetKindType = 'card' | 'doc' | 'stage';

export type NavigationTargetInterfaceType = {
  'id': string;
  'kind': NavigationTargetKindType;
  'label': string;
  /** AccordionPanel's own `panel-id` (distinct from `id`, the sanitized scroll anchor) — set for `doc` targets only, so activateTarget() can open/close the matching accordion panel. */
  'panelId'?: string;
  /** Owning stage name — set for `card` targets only (see STAGE_GROUPS in CarouselSections.ts). */
  'stage'?: string;
};
