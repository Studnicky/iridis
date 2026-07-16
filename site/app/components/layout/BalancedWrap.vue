<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useDebouncedResizeObserver } from '~/composables/useDebouncedResizeObserver.ts';

const props = withDefaults(defineProps<{
  items: T[];
  minWidth?: number;
  gap?: number;
}>(), {
  minWidth: 200,
  gap: 8
});

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const resizeObserver = useDebouncedResizeObserver((entries) => {
  if (entries[0]) containerWidth.value = entries[0].contentRect.width;
}, 100);

/**
 * Each item's TRUE rendered width, measured off a hidden, unconstrained
 * clone of the same slot content (see `.balanced-measure` below) — the row
 * packing below sizes rows against these real pixel widths instead of a
 * uniform `minWidth` guess, so a pill never gets squeezed by `flex-1` below
 * its own label's natural width and clipped. Keyed by array index (not item
 * identity) since `items` can reorder/resize between measurements; a stale
 * length mismatch just falls back to the pre-measurement single-row render
 * below until the next measurement pass lands.
 */
const itemWidths = ref<number[]>([]);
const measureRef = ref<HTMLElement | null>(null);

/**
 * Deliberately NOT observed by a ResizeObserver — item widths only change
 * when the item set itself changes (see the `props.items` watcher below).
 * Re-measuring on every reflow (theme swaps, unrelated re-renders) was the
 * layout-thrash source: this forced `offsetWidth` read only runs on mount
 * and when the items change, never on the container resize/`containerWidth`
 * path (that one stays pure JS packing over the cached widths).
 */
function measureItems(): void {
  if (!measureRef.value) return;
  const children = Array.from(measureRef.value.children)
    .filter((el): el is HTMLElement => el instanceof HTMLElement);
  itemWidths.value = children.map((el) => el.offsetWidth);
}

onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
    resizeObserver.observe(containerRef.value);
  }
  nextTick(() => { measureItems(); });
});

onUnmounted(() => {
  resizeObserver.disconnect();
});

watch(() => props.items, () => { nextTick(() => measureItems()); });

const rows = computed(() => {
  if (props.items.length === 0) return [];

  const widths = itemWidths.value;
  const w = containerWidth.value;
  // Measurement not ready yet (first paint, or items just changed and the
  // debounced re-measure hasn't landed) — render everything as one
  // (temporary) row rather than guessing at a minWidth-based split that the
  // real widths would immediately invalidate.
  if (!w || widths.length !== props.items.length) return [props.items];

  const gap = props.gap;

  // Greedy left-to-right wrap using REAL widths: a row only ever holds items
  // whose measured widths actually fit, so no item is ever forced narrower
  // than its own label (the old flex-1-across-a-fixed-column-count approach
  // could squeeze a wide label below its natural width and clip it). A
  // single item wider than the container still gets its own row rather than
  // being dropped — it overflows that row instead of ever being shrunk.
  const greedyRows: number[][] = [];
  let current: number[] = [];
  let currentWidth = 0;
  widths.forEach((width, i) => {
    const addGap = current.length > 0 ? gap : 0;
    if (current.length > 0 && currentWidth + addGap + width > w) {
      greedyRows.push(current);
      current = [i];
      currentWidth = width;
    } else {
      current.push(i);
      currentWidth += addGap + width;
    }
  });
  if (current.length > 0) greedyRows.push(current);

  // Rebalance: pull items from a fuller row into a disproportionately short
  // trailing row (e.g. the old "one lonely item on its own last row"
  // complaint), but only while the receiving row still fits within the
  // container at the donor item's real width — a rebalance can never
  // reintroduce the clipping the real-width pass just eliminated.
  for (let r = greedyRows.length - 1; r > 0; r--) {
    const prev = greedyRows[r - 1]!;
    const curr = greedyRows[r]!;
    while (curr.length < prev.length - 1 && prev.length > 1) {
      const movedIndex = prev[prev.length - 1]!;
      const movedWidth = widths[movedIndex]!;
      const currWidthNow = curr.reduce((sum, idx) => sum + widths[idx]! + gap, -gap);
      const nextWidth = curr.length > 0 ? currWidthNow + gap + movedWidth : movedWidth;
      if (nextWidth > w) break;
      prev.pop();
      curr.unshift(movedIndex);
    }
  }

  return greedyRows.map((row) => row.map((i) => props.items[i]!));
});

function getAbsoluteIndex(rIdx: number, iIdx: number) {
  let count = 0;
  for (let i = 0; i < rIdx; i++) {
    count += rows.value[i]!.length;
  }
  return count + iIdx;
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative flex flex-col w-full"
    :style="{ gap: `${gap}px` }"
  >
    <!-- Hidden measurement pass: same slot content, unconstrained (no
         flex-1, no wrap) so each item's offsetWidth reflects its true
         natural label width. Not display:flex — the slotted pills' own
         `flex-1` utility only takes effect inside an actual flex/grid
         context, so leaving this a plain block keeps every child at its
         natural inline-block size instead of being stretched to fill it. -->
    <div
      ref="measureRef"
      class="balanced-measure"
      aria-hidden="true"
    >
      <slot
        v-for="(item, i) in items"
        :key="`measure-${i}`"
        :item="item"
        :index="i"
      />
    </div>

    <div
      v-for="(row, rIdx) in rows"
      :key="rIdx"
      class="flex w-full justify-center"
      :style="{ gap: `${gap}px` }"
    >
      <slot
        v-for="(item, iIdx) in row"
        :key="iIdx"
        :item="item"
        :index="getAbsoluteIndex(rIdx, iIdx)"
      />
    </div>
  </div>
</template>

<style scoped>
.balanced-measure {
  position: absolute;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
}
</style>
