<script setup lang="ts">
import { computed } from 'vue';
import { usePairingPreview } from '~/composables/usePairingPreview.ts';
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { buildPairingPreviewModel } from './buildPairingPreviewModel.ts';

/**
 * Sample text-on-background blocks for the currently resolved palette — a
 * high-contrast light-on-dark pair, its dark-on-light inverse, and a
 * deliberately lower-contrast pair — so a non-technical viewer sees how the
 * colors read as real UI rather than a list of hex codes. Pass/fail is
 * always labelled as text alongside the swatch, never conveyed by color alone.
 */
const { pairings } = usePairingPreview();
const { dataLayout } = useDataLayout();

const previewModel = computed(() => buildPairingPreviewModel(dataLayout.value, pairings.value.length));
</script>

<template>
  <UCard>
    <LeadSummary>
      <p class="text-sm text-muted">
        Sample text/background pairings drawn from the resolved roles above, so you can see how the palette actually reads as UI.
      </p>
      <template #meta>
        <UBadge
          color="neutral"
          variant="soft"
        >
          {{ previewModel.countLabel }}
        </UBadge>
      </template>
    </LeadSummary>

    <div
      v-if="previewModel.activeCardLayout"
      :class="previewModel.activeCardLayout.class"
    >
      <PairingCard
        v-for="p in pairings"
        :key="p.key"
        :background-hex="p.background.hex"
        :background-name="p.background.name"
        :compliance-label="p.complianceLabel"
        :compact="previewModel.activeCardLayout.compact"
        :foreground-hex="p.foreground.hex"
        :foreground-name="p.foreground.name"
        :label="p.label"
      />
    </div>

    <PairingPreviewTable
      v-show="dataLayout === 'table'"
      :pairings="pairings"
    />
  </UCard>
</template>
