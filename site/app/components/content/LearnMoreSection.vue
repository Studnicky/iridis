<script setup lang="ts">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui';

const { title, value = 'learn-more' } = defineProps<{ title: string; value?: string }>();
</script>

<template>
  <AccordionRoot type="multiple" class="mt-4 w-full border-t border-default pt-1">
    <AccordionItem :value="value" class="border-b border-default">
      <AccordionHeader>
        <AccordionTrigger class="flex w-full items-center gap-2 py-3 text-left hover:text-highlighted">
          <span class="font-medium text-sm">{{ title }}</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
          />
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="space-y-4 pb-4 text-sm text-muted">
        <slot />
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
