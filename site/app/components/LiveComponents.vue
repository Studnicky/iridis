<script setup lang="ts">
/**
 * Live Nuxt UI component surface — every control themed by the engine's --ui-*
 * tokens. One face of the cylinder.
 */
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap gap-2">
      <UButton color="primary">
        Primary
      </UButton>
      <UButton
        color="primary"
        variant="soft"
      >
        Soft
      </UButton>
      <UButton color="secondary">
        Secondary
      </UButton>
      <UButton color="success">
        Success
      </UButton>
      <UButton color="warning">
        Warning
      </UButton>
      <UButton color="error">
        Error
      </UButton>
      <UButton color="info">
        Info
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
      >
        Neutral
      </UButton>
    </div>

    <UInput
      placeholder="Search…"
      icon="i-material-symbols-search-rounded"
    />
    <USlider :default-value="60" />
    <UProgress :model-value="72" />

    <div class="flex flex-wrap gap-2">
      <UBadge color="primary">
        primary
      </UBadge>
      <UBadge
        color="success"
        variant="soft"
      >
        success
      </UBadge>
      <UBadge
        color="warning"
        variant="soft"
      >
        warning
      </UBadge>
      <UBadge
        color="error"
        variant="outline"
      >
        error
      </UBadge>
      <UBadge
        color="info"
        variant="soft"
      >
        info
      </UBadge>
    </div>

    <UAlert
      color="primary"
      variant="soft"
      title="Themed by the engine"
      description="Icon, border and text all read from engine-written --ui-* variables."
      icon="i-material-symbols-auto-awesome-rounded"
    />

    <div class="space-y-1">
      <div class="text-xs font-medium text-muted">
        Primary scale
      </div>
      <div class="flex gap-0.5">
        <div
          v-for="s in shades"
          :key="s"
          class="h-8 flex-1 rounded"
          :style="{ backgroundColor: `var(--ui-color-primary-${s})` }"
          :title="`primary-${s}`"
        />
      </div>
    </div>
  </div>
</template>
