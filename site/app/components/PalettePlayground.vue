<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Color-picker mode. Additive palette: add, remove, or edit any number of seeds
 * (1–8); the engine expands and resolves them into the selected role schema and
 * re-themes the page. Only active when mode === 'picker'.
 */
const { pickerSeeds, framing, schemaName, contrastLevel, addSeed, removeSeed, setSeed } = useIridis();
const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <span class="font-semibold text-highlighted">Additive palette</span>
        <USwitch
          :model-value="framing === 'dark'"
          size="lg"
          unchecked-icon="material-symbols:light-mode-rounded"
          checked-icon="material-symbols:dark-mode-rounded"
          :aria-label="framing === 'dark' ? 'Dark framing' : 'Light framing'"
          @update:model-value="framing = $event ? 'dark' : 'light'"
        />
      </div>
    </template>

    <div class="space-y-5">
      <p class="text-sm text-muted">
        Feed the engine any number of seeds. It expands and resolves them into the role schema,
        enforces contrast, and re-themes every component on this page.
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <div v-for="(hex, i) in pickerSeeds" :key="i" class="flex items-center gap-1.5 rounded-lg border border-default p-1.5">
          <input
            :value="hex"
            type="color"
            class="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
            @input="setSeed(i, ($event.target as HTMLInputElement).value)"
          >
          <span class="font-mono text-xs text-muted">{{ hex }}</span>
          <UButton icon="i-material-symbols-close-rounded" color="neutral" variant="ghost" size="xs" :disabled="pickerSeeds.length <= 1" @click="removeSeed(i)" />
        </div>
        <UButton icon="i-material-symbols-add-rounded" color="primary" variant="soft" size="sm" :disabled="pickerSeeds.length >= 8" @click="addSeed()">
          Add seed
        </UButton>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Role schema" help="How many roles to resolve">
          <USelect v-model="schemaName" :items="schemaItems" class="w-full" />
        </UFormField>
        <UFormField label="Contrast target">
          <USelect v-model="contrastLevel" :items="['AA', 'AAA']" class="w-full" />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
