<script setup lang="ts">
defineProps<{
  canRemove: boolean;
  hex: string;
  index: number;
}>();

const emit = defineEmits<{
  'commit-hex': [event: Event];
  'pick-color': [hex: string];
  'remove': [];
}>();
</script>

<template>
  <SeedCard
    :hex="hex"
    class="flex-1 max-w-52"
    :aria-label="`Seed ${index} color ${hex}`"
  >
    <template #overlay>
      <UButton
        icon="i-material-symbols-close-rounded"
        color="error"
        variant="ghost"
        size="xs"
        class="absolute top-1 right-1 p-0.5"
        :disabled="!canRemove"
        :aria-label="`Remove seed ${index}`"
        @click="emit('remove')"
      />
    </template>
    <template #summary>
      <input
        :value="hex"
        type="text"
        inputmode="text"
        spellcheck="false"
        maxlength="7"
        class="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent font-mono text-xs text-muted focus:border-default focus:text-highlighted focus:outline-none"
        :aria-label="`Seed ${index} hex value`"
        @change="emit('commit-hex', $event)"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      >
    </template>
    <input
      :value="hex"
      type="color"
      class="absolute left-2.5 top-2.5 h-10 w-10 cursor-pointer rounded-md border-0 bg-transparent opacity-0"
      :aria-label="`Seed ${index} color picker`"
      @change="emit('pick-color', ($event.target as HTMLInputElement).value)"
    >
  </SeedCard>
</template>
