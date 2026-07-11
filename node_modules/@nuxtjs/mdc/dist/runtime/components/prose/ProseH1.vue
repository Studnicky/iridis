<template>
  <h1 :id="props.id">
    <a
      v-if="generate"
      :href="`#${props.id}`"
    >
      <slot />
    </a>
    <slot v-else />
  </h1>
</template>

<script setup>
import { computed, useRuntimeConfig } from "#imports";
const props = defineProps({
  id: { type: String, required: false }
});
const { headings } = useRuntimeConfig().public.mdc;
const generate = computed(() => props.id && (typeof headings?.anchorLinks === "boolean" && headings?.anchorLinks === true || typeof headings?.anchorLinks === "object" && headings?.anchorLinks?.h1));
</script>
