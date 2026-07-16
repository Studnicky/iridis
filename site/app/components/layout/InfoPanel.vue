<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string;
  help?: string;
  role?: 'group' | 'region';
  variant?: 'default' | 'control' | 'showcase';
}>(), {
  role: 'region',
  variant: 'default'
});

const panelClassByVariant = {
  'control': 'rounded-lg border border-primary/20 bg-primary/[0.03] p-4',
  'default': 'rounded-lg border border-default p-4',
  'showcase': 'rounded-lg bg-elevated/30 p-4'
} as const;
</script>

<template>
  <div
    :role="props.role"
    :aria-label="props.label"
    :class="panelClassByVariant[props.variant]"
  >
    <PanelHeading :title="props.label" />
    <p
      v-if="props.help"
      class="mt-1 text-sm text-muted"
    >
      {{ props.help }}
    </p>
    <div class="mt-3">
      <slot />
    </div>
  </div>
</template>
