/** Every role listing site-wide (Roles table, Resolved roles, Clamps) sorts
 * against this same shape/comparator so "sort by ratio" means the same thing
 * everywhere, not a per-card reimplementation that could quietly drift. */
export declare class RoleSortableRowType {
  'c': number;
  'compliance': string;
  'h': number;
  'l': number;
  'name': string;
  'ratio': number;
}
