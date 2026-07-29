<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string | null;
  meta?: string | null;
  code?: string | null;
  language?: string | null;
  tone?: 'default' | 'source' | 'error';
  collapsible?: boolean;
  open?: boolean;
}>(), {
  'title': null,
  'meta': null,
  'code': null,
  'language': null,
  'tone': 'default',
  'collapsible': false,
  'open': false,
});
</script>

<template>
  <details
    v-if="collapsible"
    class="ui-code-block ui-code-block--details"
    :class="[`ui-code-block--${tone}`]"
    :open="open"
  >
    <summary class="ui-code-block__summary">
      <div class="ui-code-block__header">
        <div class="ui-code-block__title-group">
          <span
            v-if="title"
            class="ui-code-block__title"
          >{{ title }}</span>
          <span
            v-if="meta ?? language"
            class="ui-code-block__meta"
          >{{ meta ?? language }}</span>
        </div>
      </div>
    </summary>
    <div class="ui-code-block__body">
      <slot>
        <pre v-if="code !== null"><code>{{ code }}</code></pre>
      </slot>
    </div>
  </details>

  <figure
    v-else
    class="ui-code-block"
    :class="[`ui-code-block--${tone}`]"
  >
    <header
      v-if="title || meta || language || $slots.actions"
      class="ui-code-block__header"
    >
      <div class="ui-code-block__title-group">
        <span
          v-if="title"
          class="ui-code-block__title"
        >{{ title }}</span>
        <span
          v-if="meta ?? language"
          class="ui-code-block__meta"
        >{{ meta ?? language }}</span>
      </div>
      <div
        v-if="$slots.actions"
        class="ui-code-block__actions"
      >
        <slot name="actions" />
      </div>
    </header>
    <div class="ui-code-block__body">
      <slot>
        <pre v-if="code !== null"><code>{{ code }}</code></pre>
      </slot>
    </div>
  </figure>
</template>

<style scoped>
.ui-code-block {
  margin: 0;
  min-width: 0;
  border: 1px var(--iridis-border-style) var(--ui-border);
  border-radius: var(--iridis-radius-md);
  background: var(--ui-bg-elevated);
  overflow: hidden;
}

.ui-code-block--source {
  background: var(--ui-bg-muted);
}

.ui-code-block--error {
  border-left: 3px var(--iridis-border-style) var(--ui-error);
}

/* The collapsible variant renders as <details> instead of <figure> — the
   base .ui-code-block rule already covers its border/radius/background, so
   this variant currently carries no styling of its own. Kept as an explicit,
   empty rule (rather than dropped from the template) so the class stays a
   documented extension point instead of a silent no-op. */
.ui-code-block--details {
}

.ui-code-block__header,
.ui-code-block__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px var(--iridis-border-style) var(--ui-border);
  background: var(--ui-bg-muted);
}

.ui-code-block__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ui-code-block__summary {
  cursor: pointer;
  list-style: none;
}

.ui-code-block__summary::-webkit-details-marker { display: none; }

.ui-code-block__title-group {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  min-width: 0;
}

.ui-code-block__title {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ui-text-highlighted);
}

.ui-code-block__meta {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--ui-text-dimmed);
}

.ui-code-block__body {
  min-width: 0;
}

.ui-code-block__body :deep(pre) {
  margin: 0;
  padding: 1rem;
  overflow: auto;
}

.ui-code-block__body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
</style>
