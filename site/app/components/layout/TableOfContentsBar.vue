<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { STAGE_GROUPS } from '~/composables/CarouselSections.ts';

/**
 * Sticky table-of-contents bar. Every card across all visible stage
 * carousels, flattened, each one a NAVIGATE_TO_TARGET dispatch (the same FSM
 * event a "Learn more" prose cross-reference or a stage's Next/Previous
 * button sends) — clicking an entry brings that card to the front of its OWN
 * stage carousel and scrolls that stage into view. There is no single shared
 * "active card" to highlight: each stage carousel tracks its own independent
 * local index. Mirrors index.vue's `visibleStageGroups` filter — Combine
 * isn't rendered until an image is uploaded, so its pill must not appear
 * here either (a click would silently no-op against a section not in the DOM).
 */
const { send } = useIridisUiMachine();
const { 'uploadedImages': uploadedImages } = useIridis();

const items = computed(() => STAGE_GROUPS
  .filter((group) => group.name !== 'combine' || uploadedImages.value.length > 0)
  .flatMap((group) => group.items));

function select(key: string): void { send({ 'targetId': key, 'type': IridisUiActionType.NAVIGATE_TO_TARGET }); }
</script>

<template>
  <nav
    class="toc-bar"
    aria-label="Jump to section"
  >
    <div class="toc-scroll w-full max-w-6xl mx-auto">
      <BalancedWrap
        :items="items"
        :min-width="100"
        :gap="8"
      >
        <template #default="{ item }">
          <UButton
            :label="item.label"
            color="neutral"
            variant="soft"
            size="xs"
            class="toc-pill font-display flex-1 justify-center rounded-full"
            @click="select(item.key)"
          />
        </template>
      </BalancedWrap>
    </div>
  </nav>
</template>

<style scoped>
.toc-bar {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 0.6rem 0;
  background: color-mix(in oklch, var(--ui-bg) 78%, transparent);
  backdrop-filter: blur(10px) saturate(1.15);
  border-bottom: 1px solid color-mix(in oklch, var(--ui-primary) 18%, transparent);
}
.toc-scroll {
  display: flex;
  justify-content: center;
  padding: 0 1rem;
}
.toc-pill {
  font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase;
  white-space: nowrap;
}
.toc-pill-active {
  box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 70%, transparent);
}
</style>
