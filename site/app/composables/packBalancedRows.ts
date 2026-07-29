/**
 * Greedy left-to-right row packing over real item widths, with a trailing
 * rebalance pass. Pure and DOM-free — indices in, indices out — so
 * `BalancedWrap.vue`'s `rows` computed and this module's own tests exercise
 * the identical algorithm.
 *
 * Pass 1 (greedy): a row only ever holds items whose measured widths
 * actually fit, so no item is ever forced narrower than its own label (a
 * flex-1-across-a-fixed-column-count approach could squeeze a wide label
 * below its natural width and clip it). A single item wider than
 * `containerWidth` still gets its own row rather than being dropped — it
 * overflows that row instead of ever being shrunk.
 *
 * Pass 2 (rebalance): pulls items from a fuller row into a
 * disproportionately short trailing row (e.g. one lonely item on its own
 * last row), but only while the receiving row still fits within
 * `containerWidth` at the donor item's real width — a rebalance can never
 * reintroduce the clipping pass 1 eliminated.
 */
class BalancedRowPackingOperation {
  static pack(widths: number[], containerWidth: number, gap: number): number[][] {
    const rows = BalancedRowPackingOperation.packGreedy(widths, containerWidth, gap);
    BalancedRowPackingOperation.rebalanceTrailingRows(rows, widths, containerWidth, gap);
    return rows;
  }

  static packGreedy(widths: number[], containerWidth: number, gap: number): number[][] {
    const rows: number[][] = [];
    let currentRow: number[] = [];
    let currentRowWidth = 0;
    widths.forEach((width, itemIndex) => {
      const addGap = currentRow.length > 0 ? gap : 0;
      if (currentRow.length > 0 && currentRowWidth + addGap + width > containerWidth) {
        rows.push(currentRow);
        currentRow = [itemIndex];
        currentRowWidth = width;
      } else {
        currentRow.push(itemIndex);
        currentRowWidth += addGap + width;
      }
    });
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    return rows;
  }

  static rebalanceTrailingRows(rows: number[][], widths: number[], containerWidth: number, gap: number): void {
    for (let rowIndex = rows.length - 1; rowIndex > 0; rowIndex -= 1) {
      const donorRow = rows[rowIndex - 1]!;
      const receivingRow = rows[rowIndex]!;
      while (receivingRow.length < donorRow.length - 1 && donorRow.length > 1) {
        const movedItemIndex = donorRow[donorRow.length - 1]!;
        const movedItemWidth = widths[movedItemIndex]!;
        const receivingRowWidth = receivingRow.reduce((sum, itemIndex) => {
          return sum + widths[itemIndex]! + gap;
        }, -gap);
        const nextReceivingRowWidth = receivingRow.length > 0 ? receivingRowWidth + gap + movedItemWidth : movedItemWidth;
        if (nextReceivingRowWidth > containerWidth) {
          break;
        }
        donorRow.pop();
        receivingRow.unshift(movedItemIndex);
      }
    }
  }
}

export const packBalancedRows = BalancedRowPackingOperation.pack;
