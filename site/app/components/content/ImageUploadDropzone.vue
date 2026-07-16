<script setup lang="ts">
const model = defineModel<File[] | null>({ required: true });

defineEmits<{
  sample: [];
}>();
</script>

<template>
  <UFileUpload
    v-model="model"
    multiple
    accept="image/*"
    :preview="false"
    icon="i-material-symbols-upload-rounded"
    label="Drop image(s) or click to browse"
    description="PNG, JPG, WEBP — each image is extracted independently, then combined in the next stage"
    class="w-full"
  >
    <template #actions="{ open }">
      <UButton
        icon="i-material-symbols-upload-rounded"
        color="primary"
        variant="soft"
        size="sm"
        @click.stop="open()"
      >
        Browse
      </UButton>
      <UButton
        icon="i-material-symbols-auto-awesome-rounded"
        color="neutral"
        variant="soft"
        size="sm"
        @click.stop="$emit('sample')"
      >
        Try a sample
      </UButton>
    </template>
  </UFileUpload>
</template>
