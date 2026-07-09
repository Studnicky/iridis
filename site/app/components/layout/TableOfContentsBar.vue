<script setup lang="ts">
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
function select(i: number): void { send({ 'index': i, 'type': 'SELECT_CARD' }); }
</script>

<template>
  <nav
    class="toc-bar"
    aria-label="Jump to section"
  >
    <div class="toc-scroll">
      <button
        v-for="(item, i) in props.items"
        :key="item.key"
        type="button"
        class="toc-pill font-display"
        :class="{ on: i === active }"
        @click="select(i)"
      >
        {{ item.label }}
      </button>
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
/* Fully responsive by construction, not by breakpoint: the pill row scrolls
   horizontally whenever it doesn't fit, on any viewport, with no JS layout
   logic and no hamburger/collapse state to maintain. */
.toc-scroll {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 1rem;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 1.5rem, #000 calc(100% - 1.5rem), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 1.5rem, #000 calc(100% - 1.5rem), transparent 100%);
}
.toc-scroll::-webkit-scrollbar { display: none; }
.toc-pill {
  flex: none;
  padding: 0.4rem 0.9rem;
  font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase;
  border-radius: 9999px;
  border: 1px solid color-mix(in oklch, var(--ui-primary) 25%, transparent);
  color: var(--ui-text-muted);
  background: color-mix(in oklch, var(--ui-bg-elevated) 60%, transparent);
  transition: all .25s ease;
  white-space: nowrap;
  cursor: pointer;
}
.toc-pill:hover { color: var(--ui-text-highlighted); border-color: color-mix(in oklch, var(--ui-primary) 45%, transparent); }
.toc-pill.on {
  color: var(--ui-bg); background: var(--ui-primary); border-color: var(--ui-primary);
  box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 70%, transparent);
}
</style>
