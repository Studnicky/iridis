<script setup lang="ts">
defineProps<{
  stageSummaries: readonly {
    key: string;
    label: string;
    text: string;
    color: 'success' | 'warning' | 'neutral';
  }[];
}>();
</script>

<template>
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mt-6 pt-4 border-t border-default/50">
    <ExternalResourceLink href="https://www.w3.org/WAI/WCAG21/quickref/">
      WCAG 2.1 quick reference ↗
    </ExternalResourceLink>

    <div
      v-if="stageSummaries.length"
      class="flex flex-wrap justify-end gap-1.5"
    >
      <UBadge
        v-for="summary in stageSummaries"
        :key="summary.key"
        :color="summary.color"
        variant="soft"
        size="sm"
      >
        {{ summary.label }}: {{ summary.text }}
      </UBadge>
    </div>
  </div>
</template>
