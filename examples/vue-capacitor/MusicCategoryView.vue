<template>
  <div data-category="music" class="music-category-view">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { categoryColorService } from './categoryColorService.ts';

onMounted(async () => {
  await categoryColorService.apply('music', '#8B5CF6');
});
</script>
