<script setup lang="ts">
defineProps<{
  aliasKey: string;
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      :color="aliasKey === 'neutral' ? 'neutral' : (aliasKey as never)"
      size="xs"
    >
      Solid
    </UButton>
    <UButton
      :color="aliasKey === 'neutral' ? 'neutral' : (aliasKey as never)"
      variant="soft"
      size="xs"
    >
      Soft
    </UButton>
    <UButton
      :color="aliasKey === 'neutral' ? 'neutral' : (aliasKey as never)"
      variant="outline"
      size="xs"
    >
      Line
    </UButton>
    <UBadge
      :color="aliasKey === 'neutral' ? 'neutral' : (aliasKey as never)"
      variant="soft"
      size="sm"
    >
      500
    </UBadge>
  </div>
</template>
