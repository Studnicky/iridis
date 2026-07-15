<script setup lang="ts">
import { usePanelAccordion } from '~/composables/usePanelAccordion.ts';

const props = withDefaults(defineProps<{
  panelId: string;
  title: string;
  icon: string;
  defaultOpen?: boolean;
}>(), {
  defaultOpen: false
});

const accordion = usePanelAccordion(props.panelId, { defaultOpen: props.defaultOpen });
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div
        class="relative flex w-full items-center gap-3 cursor-pointer"
        role="button"
        tabindex="0"
        :aria-expanded="accordion.isOpen.value"
        :aria-controls="`${panelId}-content`"
        :aria-label="`Toggle ${title} panel`"
        @click="accordion.toggle()"
        @keydown.enter="accordion.toggle()"
        @keydown.space.prevent="accordion.toggle()"
      >
        <UIcon
          :name="icon"
          class="absolute left-0 size-4 text-primary"
        />
        <span class="mx-auto text-center font-semibold text-highlighted">
          {{ title }}
        </span>
        <div class="absolute right-0 flex items-center gap-2">
          <slot name="header-extra" />
          <UIcon
            name="i-material-symbols-keyboard-arrow-down-rounded"
            class="size-5 text-muted transition-transform duration-200"
            :class="{ 'rotate-180': accordion.isOpen.value }"
          />
        </div>
      </div>
    </template>

    <UCollapsible
      :open="accordion.isOpen.value"
      :unmount-on-hide="true"
      @update:open="accordion.toggle()"
    >
      <template #content>
        <div
          :id="`${panelId}-content`"
          class="mx-auto w-full max-w-4xl p-4 sm:p-6"
        >
          <slot />
        </div>
      </template>
    </UCollapsible>
  </UCard>
</template>
