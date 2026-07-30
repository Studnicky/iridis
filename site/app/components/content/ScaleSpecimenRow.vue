<script setup lang="ts">
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

defineProps<{
  aliasKey: AliasColorType.Type;
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      :color="aliasKey"
      size="xs"
    >
      Solid
    </UButton>
    <UButton
      :color="aliasKey"
      variant="soft"
      size="xs"
    >
      Soft
    </UButton>
    <UButton
      :color="aliasKey"
      variant="outline"
      size="xs"
    >
      Line
    </UButton>
    <UBadge
      :color="aliasKey"
      variant="soft"
      size="sm"
    >
      500
    </UBadge>
  </div>
</template>
