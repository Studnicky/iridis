<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { packBalancedRows } from '~/composables/packBalancedRows.ts';
import { useBalancedWidthLatch } from '~/composables/useBalancedWidthLatch.ts';
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
/**
 * Packing width, latched through `useBalancedWidthLatch` rather than set
 * directly from the raw `ResizeObserver` reading — see that module for why:
 * a raw width sitting near a row-count boundary can jitter by a few
 * sub-threshold pixels frame to frame and flip the packing forever. The
 * latch absorbs that jitter and only lets a genuine width change through.
 */
const containerWidth = ref(0);
const acceptContainerWidth = useBalancedWidthLatch();
const resizeObserver = useDebouncedResizeObserver((entries) => {
  if (entries[0]) containerWidth.value = acceptContainerWidth(entries[0].contentRect.width);
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
  const measured = children.map((el) => el.offsetWidth);

  /*
   * Only publish a genuinely new measurement. Assigning a fresh array to
   * `itemWidths` on every pass changes the ref's identity even when every
   * width is unchanged, which recomputes `rows` and re-renders. The parent
   * then hands down a rebuilt `items` array, the watcher below fires on that
   * new identity, and we measure again -- a render loop that never settles
   * and that shows up as the page oscillating by one packed row's height.
   */
  const current = itemWidths.value;
  const unchanged = measured.length === current.length
    && measured.every((width, index) => width === current[index]);
  if (unchanged) return;

  itemWidths.value = measured;
}

onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = acceptContainerWidth(containerRef.value.clientWidth);
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

  // Packing itself (greedy real-width wrap + trailing-row rebalance) lives
  // in packBalancedRows.ts, pure and DOM-free, so it has its own direct
  // test coverage independent of this component.
  const indexRows = packBalancedRows(widths, w, props.gap);

  return indexRows.map((row) => row.map((i) => props.items[i]!));
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
