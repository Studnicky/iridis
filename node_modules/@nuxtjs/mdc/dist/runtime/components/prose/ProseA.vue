<template>
  <NuxtLink
    :href="props.href"
    :target="props.target"
  >
    <slot />
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  href: {
    type: String,
    default: ""
  },
  target: {
    type: String,
    default: void 0,
    required: false
  }
});
</script>
