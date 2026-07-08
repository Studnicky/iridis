<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Additive palette playground. Demonstrates iridis's variable-input-count intake:
 * add, remove, or edit any number of seed colors (1–8) and the whole page
 * re-resolves and re-themes live. This is the core "additive palette" feature.
 */
const { seeds, framing, schemaName, contrastLevel, running, addSeed, removeSeed, setSeed } = useIridis();

const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-highlighted">Additive palette</span>
        <UBadge :color="running ? 'warning' : 'success'" variant="soft">
          {{ running ? 'resolving…' : `${seeds.length} seed${seeds.length === 1 ? '' : 's'}` }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-5">
      <p class="text-sm text-muted">
        Feed the engine any number of seeds. It expands and resolves them into the role schema below,
        enforces contrast, and re-themes every component on this page.
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <div v-for="(hex, i) in seeds" :key="i" class="flex items-center gap-1.5 rounded-lg border border-default p-1.5">
          <input
            :value="hex"
            type="color"
            class="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
            @input="setSeed(i, ($event.target as HTMLInputElement).value)"
          >
          <span class="font-mono text-xs text-muted">{{ hex }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="seeds.length <= 1"
            @click="removeSeed(i)"
          />
        </div>
        <UButton icon="i-lucide-plus" color="primary" variant="soft" size="sm" :disabled="seeds.length >= 8" @click="addSeed()">
          Add seed
        </UButton>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="Role schema" help="How many roles to resolve">
          <USelect v-model="schemaName" :items="schemaItems" class="w-full" />
        </UFormField>
        <UFormField label="Contrast target">
          <USelect v-model="contrastLevel" :items="['AA', 'AAA']" class="w-full" />
        </UFormField>
        <UFormField label="Framing">
          <USwitch
            :model-value="framing === 'dark'"
            :label="framing === 'dark' ? 'Dark' : 'Light'"
            @update:model-value="framing = $event ? 'dark' : 'light'"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
