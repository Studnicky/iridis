<script setup lang="ts">
import { ref } from 'vue';

const toast = useToast();
const formName = ref('');
const formSubmitted = ref(false);

function submitForm(): void {
  formSubmitted.value = formName.value.trim().length > 0;
  if (formSubmitted.value) {
    toast.add({
      'color': 'primary',
      'description': `Hello, ${formName.value.trim()} — a real form submission.`,
      'title': 'Form submitted'
    });
  }
}
</script>

<template>
  <InfoPanel
    variant="default"
    label="Live form"
  >
    <form
      class="flex items-end gap-2"
      @submit.prevent="submitForm"
    >
      <UFormField
        label="Name"
        class="flex-1"
        :error="formSubmitted && !formName.trim() ? 'Required' : undefined"
      >
        <UInput
          v-model="formName"
          placeholder="Your name"
          size="sm"
        />
      </UFormField>
      <UButton
        type="submit"
        size="sm"
      >
        Submit
      </UButton>
    </form>
  </InfoPanel>
</template>
