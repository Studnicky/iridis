<script setup lang="ts">
/**
 * Role-schema picker: a pill row + mirrored slider, both selecting from the
 * same fixed tier list. Used by both the Combine stage (image extraction's
 * color count) and Schema & Compliance (the role-count schema) — they read
 * and write the SAME `schemaName` ref, this is genuinely one control shown
 * in two places, not two independent choices. The parent owns the FSM
 * dispatch (`send({type: SET_SCHEMA, ...})`); this component only knows the
 * pill/slider interaction.
 */
const SCHEMA_ITEMS = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];

defineProps<{ 'modelValue': string }>();
const emit = defineEmits<{ 'update:modelValue': [schemaName: string] }>();
</script>

<template>
  <div class="w-full space-y-2">
    <BalancedWrap
      :items="SCHEMA_ITEMS"
      :min-width="48"
      :gap="8"
    >
      <template #default="{ item: s }">
        <button
          type="button"
          class="schema-pill flex-1 justify-center text-[11px] font-medium"
          :class="modelValue === s ? 'text-primary font-bold' : 'text-dimmed cursor-pointer hover:text-muted'"
          :aria-pressed="modelValue === s"
          @click="emit('update:modelValue', s)"
        >
          {{ s.replace('iridis-', '') }}
        </button>
      </template>
    </BalancedWrap>
    <USlider
      :model-value="Math.max(0, SCHEMA_ITEMS.indexOf(modelValue))"
      :min="0"
      :max="SCHEMA_ITEMS.length - 1"
      :step="1"
      @update:model-value="emit('update:modelValue', SCHEMA_ITEMS[Number($event)] || 'iridis-32')"
    />
  </div>
</template>

<style scoped>
.schema-pill {
  display: flex;
  align-items: center;
  padding: 0.15rem 0;
  background: transparent;
  border: none;
}
</style>
