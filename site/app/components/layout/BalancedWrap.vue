<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted } from 'vue';

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
let observer: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
    observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const width = entries[0].contentRect.width;
        if (resizeDebounceTimer) {
          clearTimeout(resizeDebounceTimer);
        }
        resizeDebounceTimer = setTimeout(() => {
          containerWidth.value = width;
        }, 100);
      }
    });
    observer.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
  }
});

const rows = computed(() => {
  if (props.items.length === 0) return [];
  if (!containerWidth.value) return [props.items];

  const w = containerWidth.value;
  let maxCols = Math.floor((w + props.gap) / (props.minWidth + props.gap));
  maxCols = Math.max(1, maxCols);

  const N = props.items.length;
  const R = Math.ceil(N / maxCols);

  const base = Math.floor(N / R);
  const remainder = N % R;

  let topGetsLarger = false;
  if (remainder > 0) {
    topGetsLarger = remainder < R - remainder;
  }

  const rowSizes: number[] = [];
  let r = remainder;
  let b = R - remainder;

  for (let i = 0; i < R; i++) {
    if (topGetsLarger) {
      if (r > 0) { rowSizes.push(base + 1); r--; }
      else { rowSizes.push(base); b--; }
    } else {
      if (b > 0) { rowSizes.push(base); b--; }
      else { rowSizes.push(base + 1); r--; }
    }
  }

  const result: T[][] = [];
  let idx = 0;
  for (const size of rowSizes) {
    result.push(props.items.slice(idx, idx + size));
    idx += size;
  }
  return result;
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
  <div ref="containerRef" class="flex flex-col w-full" :style="{ gap: `${gap}px` }">
    <div
      v-for="(row, rIdx) in rows"
      :key="rIdx"
      class="flex w-full"
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
