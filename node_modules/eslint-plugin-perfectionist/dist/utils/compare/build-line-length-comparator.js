import { computeOrderedValue } from './compute-ordered-value.js'
/**
 * Creates a comparator function that sorts nodes by their line length.
 *
 * @param options - Options containing the sort order.
 * @param options.order - The order direction ('asc' or 'desc').
 * @returns A comparator function that compares two sorting nodes by their size.
 */
function buildLineLengthComparator({ order }) {
  return (a, b) => {
    return computeOrderedValue(a.size - b.size, order)
  }
}
export { buildLineLengthComparator }
