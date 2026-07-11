<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';

/**
 * Sticky table-of-contents bar — replaces the old "Jump to" carousel card.
 * A ToC belongs at the top of the page you're navigating, always visible,
 * not buried as one more face you have to rotate the carousel around to
 * reach. Routes through the same SELECT_CARD event the carousel's dots and
 * arrow keys use, so picking an item here is provably the same action as
 * clicking a dot.
 */
const props = defineProps<{ items: ReadonlyArray<{ key: string; label: string }> }>();
const { send, state } = useIridisUiMachine();

const active = computed(() => state.value.activeIndex);
function select(i: number): void { send({ 'index': i, 'type': IridisUiActionType.SELECT_CARD }); }
</script>

<template>
  <nav
    class="toc-bar"
    aria-label="Jump to section"
  >
    <div class="toc-scroll w-full max-w-6xl mx-auto">
      <BalancedWrap :items="[...props.items]" :min-width="100" :gap="8">
        <template #default="{ item, index: i }">
          <UButton
            :label="item.label"
            :color="i === active ? 'primary' : 'neutral'"
            :variant="i === active ? 'solid' : 'soft'"
            size="xs"
            class="toc-pill font-display flex-1 justify-center rounded-full"
            :class="{ 'toc-pill-active': i === active }"
            @click="select(i)"
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
