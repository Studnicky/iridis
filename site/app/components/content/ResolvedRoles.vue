<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';

/**
 * The resolved role palette (the engine's role output, not the semantic UI
 * colors). Every role the engine produced from the active seeds, with its WCAG
 * 2.1 contrast against the resolved background and an AA/AAA badge.
 */
const { roleViews, roles } = useIridis();

const bg = computed<string>(() => roles.value['background'] ?? '#000000');
const rows = computed(() => roleViews.value.map((r) => {
  const cr = contrastRatio(r.hex, bg.value);
  return { 'name': r.name, 'hex': r.hex, 'ratio': cr, 'aa': cr >= 4.5, 'aaa': cr >= 7 };
}));
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">Resolved roles</span>
        <UBadge
          color="neutral"
          variant="soft"
          class="justify-self-end"
        >
          {{ rows.length }} roles
        </UBadge>
      </div>
    </template>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="r in rows"
        :key="r.name"
        class="flex items-center gap-2 rounded-lg border border-default p-2"
      >
        <div
          class="h-9 w-9 shrink-0 rounded-md border border-default"
          :style="{ backgroundColor: r.hex }"
        />
        <div class="min-w-0">
          <div class="truncate text-xs font-medium text-highlighted">
            {{ r.name }}
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <span class="truncate font-mono text-[10px] text-muted">{{ r.hex }}</span>
            <UBadge
              :color="r.aaa ? 'success' : r.aa ? 'primary' : 'neutral'"
              variant="soft"
              size="xs"
            >
              {{ r.aaa ? 'AAA' : r.aa ? 'AA' : r.ratio.toFixed(1) }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
