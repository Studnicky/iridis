<script setup lang="ts">
import type { CvdMatrixInterfaceTypeEntity } from '@studnicky/iridis-contrast';

defineProps<{
  type: {
    value: CvdMatrixInterfaceTypeEntity.Type['name'];
    label: string;
    prevalence: string;
    description: string;
  };
  previewing: boolean;
}>();

const emit = defineEmits<{
  toggle: [cvdType: CvdMatrixInterfaceTypeEntity.Type['name']];
}>();
</script>

<template>
  <SpecimenCard
    :label="type.label"
    class="transition-colors"
    :class="previewing ? 'border-primary bg-primary/10' : 'border-default'"
  >
    <template #header>
      <SplitHeader class="gap-2">
        <span class="text-sm font-medium text-highlighted">{{ type.label }}</span>
        <template #meta>
          <UButton
            :label="previewing ? 'Previewing' : 'Preview'"
            size="xs"
            :color="previewing ? 'primary' : 'neutral'"
            :variant="previewing ? 'solid' : 'soft'"
            class="min-w-[80px]"
            :aria-pressed="previewing"
            @click="emit('toggle', type.value)"
          />
        </template>
      </SplitHeader>
    </template>
    <p class="text-xs text-muted">
      {{ type.description }}
    </p>
    <MicroNote>
      {{ type.prevalence }}
    </MicroNote>
  </SpecimenCard>
</template>
