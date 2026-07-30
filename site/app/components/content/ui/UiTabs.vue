<script setup lang="ts">
import { ref, watch } from 'vue';

export interface UiTabDef {
  readonly key: string;
  readonly label: string;
  readonly badge?: string;
  readonly tone?: 'default' | 'live' | 'warn' | 'accent';
}

const props = defineProps<{
  tabs: readonly UiTabDef[];
  defaultKey?: string;
  ariaLabel?: string;
}>();

const activeKey = ref<string>(props.defaultKey ?? props.tabs[0]?.key ?? '');

watch(() => props.defaultKey, (key) => {
  if (key !== undefined && key.length > 0) activeKey.value = key;
});

function activate(key: string): void {
  activeKey.value = key;
}

function onKey(event: KeyboardEvent, idx: number): void {
  const keys = props.tabs.map((t) => t.key);
  const max = keys.length - 1;
  let next = idx;
  if (event.key === 'ArrowRight') next = idx === max ? 0 : idx + 1;
  else if (event.key === 'ArrowLeft') next = idx === 0 ? max : idx - 1;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = max;
  else return;
  event.preventDefault();
  const target = keys[next];
  if (target !== undefined) activeKey.value = target;
}
</script>

<template>
  <section class="ui-tabs">
    <div
      role="tablist"
      :aria-label="ariaLabel ?? 'Tabs'"
      class="ui-tabs__row"
    >
      <button
        v-for="(tab, i) in tabs"
        :id="`tab-${tab.key}`"
        :key="tab.key"
        :class="['ui-tabs__button', { 'ui-tabs__button--active': activeKey === tab.key }]"
        role="tab"
        :aria-selected="activeKey === tab.key"
        :aria-controls="`pane-${tab.key}`"
        :tabindex="activeKey === tab.key ? 0 : -1"
        @click="activate(tab.key)"
        @keydown="onKey($event, i)"
      >
        <span class="ui-tabs__label">{{ tab.label }}</span>
        <span
          v-if="tab.badge !== undefined && tab.badge.length > 0"
          :class="['ui-tabs__badge', `ui-tabs__badge--${tab.tone ?? 'default'}`]"
        >{{ tab.badge }}</span>
      </button>
      <div
        v-if="$slots['tab-suffix']"
        class="ui-tabs__suffix"
      >
        <slot name="tab-suffix" />
      </div>
    </div>

    <div
      v-for="tab in tabs"
      :id="`pane-${tab.key}`"
      :key="`pane-${tab.key}`"
      role="tabpanel"
      :aria-labelledby="`tab-${tab.key}`"
      :hidden="activeKey !== tab.key"
      class="ui-tabs__pane"
    >
      <slot :name="tab.key" />
    </div>
  </section>
</template>

<style scoped>
.ui-tabs {
  background: var(--ui-bg-elevated);
  border: 1px var(--iridis-border-style) var(--ui-border);
  border-radius: var(--iridis-radius-md);
  overflow: hidden;
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.ui-tabs__row {
  display: flex;
  align-items: stretch;
  background: var(--ui-bg-muted);
  border-bottom: 1px var(--iridis-border-style) var(--ui-border);
  padding: 0.25rem 0.25rem 0;
  gap: 0.15rem;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}

.ui-tabs__row::-webkit-scrollbar { display: none; }

.ui-tabs__suffix {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 0.35rem 0 0.25rem;
}

.ui-tabs__button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.9rem;
  background: transparent;
  border: 1px var(--iridis-border-style) transparent;
  border-bottom: 0;
  border-radius: var(--iridis-radius-sm) var(--iridis-radius-sm) 0 0;
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.ui-tabs__button:hover {
  background: var(--ui-bg);
  color: var(--ui-text);
}

.ui-tabs__button--active {
  background: var(--ui-bg-elevated);
  color: var(--ui-primary);
  border-color: var(--ui-border);
  position: relative;
}

.ui-tabs__button--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: var(--ui-bg-elevated);
}

.ui-tabs__button:focus-visible {
  outline: 2px var(--iridis-border-style) var(--ui-primary);
  outline-offset: 1px;
}

.ui-tabs__label { text-transform: uppercase; }

.ui-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 0 0.4rem;
  height: 16px;
  border-radius: var(--iridis-radius-lg);
  background: var(--ui-bg-muted);
  color: var(--ui-text-dimmed);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
}

.ui-tabs__badge--accent { background: color-mix(in oklch, var(--ui-primary) 14%, transparent); color: var(--ui-primary); }
.ui-tabs__badge--warn { background: color-mix(in oklch, var(--ui-warning) 18%, transparent); color: var(--ui-warning); }
.ui-tabs__badge--live {
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  animation: ui-tabs-badge-pulse 1.4s ease-in-out infinite;
}

.ui-tabs__pane {
  flex: 1 1 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.ui-tabs__pane[hidden] { display: none; }

.ui-tabs__pane > :deep(*) {
  border: 0;
  border-radius: 0;
  background: transparent;
  height: 100%;
  min-height: 0;
  width: 100%;
  flex: 1 1 auto;
}

@keyframes ui-tabs-badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--ui-primary) 55%, transparent); }
  50% { box-shadow: 0 0 0 4px transparent; }
}
</style>
