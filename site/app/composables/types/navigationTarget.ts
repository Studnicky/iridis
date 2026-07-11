/**
 * An addressable location on the page: a carousel card or a docs card.
 * Card-list and doc-list entries share this shape so anything that wants to
 * navigate the page — a "Learn more" cross-reference, the ToC bar, or a
 * future capability-dispatch helper — can look targets up by id without
 * caring which kind of section it resolves to.
 */
export type NavigationTargetKindType = 'card' | 'doc';

export interface NavigationTargetInterfaceType {
  readonly id: string;
  readonly kind: NavigationTargetKindType;
  readonly label: string;
}
