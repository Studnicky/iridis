<script setup lang="ts">
import { ref } from 'vue';

const BUTTON_VARIANTS = ['solid', 'soft', 'outline', 'ghost'] as const;
const variantClicks = ref<Record<string, number>>({});

function fireVariant(variant: string, color: string): void {
  const key = `${variant}-${color}`;
  variantClicks.value = { ...variantClicks.value, [key]: (variantClicks.value[key] ?? 0) + 1 };
}
</script>

<template>
  <InfoPanel
    variant="default"
    label="Button variants"
  >
    <div class="space-y-1.5">
      <ButtonVariantRow
        v-for="variant in BUTTON_VARIANTS"
        :key="variant"
        :variant="variant"
        :counts="variantClicks"
        @fire="fireVariant(variant, $event)"
      />
    </div>
  </InfoPanel>
</template>
