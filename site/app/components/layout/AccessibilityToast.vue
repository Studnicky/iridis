<script setup lang="ts">
import { watch } from 'vue';

import { useToast } from '#imports';

import { AccessibilityBlockers } from '~/composables/accessibilityBlockers.ts';
import { useIridis } from '~/composables/useIridis.ts';

const toast = useToast();
const { accessibilityBlockers } = useIridis();

watch(() => accessibilityBlockers.value.key, (key) => {
  if (key.length > 0) {
    const message = AccessibilityBlockers.toastMessage(accessibilityBlockers.value);
    toast.add({
      'color': 'warning',
      'description': message.description,
      'icon': 'i-material-symbols-warning-rounded',
      'id': key,
      'title': message.title
    });
  }
}, { 'immediate': true });
</script>

<template>
  <span hidden />
</template>
