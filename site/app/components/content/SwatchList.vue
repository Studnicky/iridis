<script setup lang="ts">
import { computed } from 'vue';
import { buildSwatchListModel } from './buildSwatchListModel.ts';

const props = defineProps<{
  swatches: readonly string[];
  title?: string;
  emptyLabel?: string;
  ariaLabelPrefix?: string;
  chipClass?: string;
}>();

const swatchListModel = computed(() => buildSwatchListModel(
  props.swatches,
  props.ariaLabelPrefix,
  props.emptyLabel
));
</script>

<template>
  <div class="space-y-1">
    <SectionIntro
      v-if="title"
      :title="title"
    />
    <div
      v-if="swatchListModel.items.length === 0"
      class="text-sm text-muted italic min-h-[30px]"
    >
      {{ swatchListModel.emptyLabel }}
    </div>
    <BalancedWrap
      v-else
      :items="[...swatchListModel.items]"
      :min-width="28"
      :gap="4"
    >
      <template #default="{ item }">
        <SwatchChip
          :hex="item.hex"
          :class="chipClass ?? 'h-7 w-7 rounded-md border border-default'"
          :aria-label="item.ariaLabel"
        />
      </template>
    </BalancedWrap>
    <slot />
  </div>
</template>
