<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * The resolved role palette. Shows every role the engine produced from the seeds
 * plus its WCAG 2.1 contrast against the resolved background, with an AA/AAA
 * badge — demonstrating role resolution + contrast enforcement.
 */
const { roleList, resolvedRoles } = useIridis();

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg: string, bg: string): number {
  const a = luminance(fg); const b = luminance(bg);
  const hi = Math.max(a, b); const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

const bg = computed<string>(() => resolvedRoles.value['background']?.hex ?? '#000000');
const rows = computed(() => roleList.value.map((r) => {
  const cr = ratio(r.hex, bg.value);
  return { ...r, 'ratio': cr, 'aa': cr >= 4.5, 'aaa': cr >= 7 };
}));
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-highlighted">Resolved roles</span>
        <UBadge color="neutral" variant="soft">{{ rows.length }} roles</UBadge>
      </div>
    </template>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="r in rows" :key="r.name" class="flex items-center gap-2 rounded-lg border border-default p-2">
        <div class="h-9 w-9 shrink-0 rounded-md border border-default" :style="{ backgroundColor: r.hex }" />
        <div class="min-w-0">
          <div class="truncate text-xs font-medium text-highlighted">{{ r.name }}</div>
          <div class="flex items-center gap-1">
            <span class="font-mono text-[10px] text-muted">{{ r.hex }}</span>
            <UBadge :color="r.aaa ? 'success' : r.aa ? 'primary' : 'neutral'" variant="soft" size="xs">
              {{ r.aaa ? 'AAA' : r.aa ? 'AA' : r.ratio.toFixed(1) }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
