<script setup lang="ts">
const breadcrumbItems = [
  { 'label': 'iridis', 'icon': 'i-material-symbols-home-rounded' },
  { 'label': 'Components' },
  { 'label': 'Live demo' }
];
</script>

<template>
  <InfoPanel
    variant="default"
    label="Dropdown, tooltip & popover"
    class="space-y-2 lg:col-span-2"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UDropdownMenu :items="[[{ 'label': 'Duplicate' }, { 'label': 'Rename' }], [{ 'label': 'Delete', 'color': 'error' }]]">
        <UButton
          variant="soft"
          size="xs"
          trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
        >
          Actions
        </UButton>
      </UDropdownMenu>
      <UTooltip text="Real tooltip, engine-themed border/background">
        <UButton
          variant="outline"
          size="xs"
        >
          Hover me
        </UButton>
      </UTooltip>
      <UPopover>
        <UButton
          variant="ghost"
          size="xs"
        >
          Popover
        </UButton>
        <template #content>
          <p class="p-2 text-xs text-muted">
            Live popover content.
          </p>
        </template>
      </UPopover>
      <UKbd>⌘</UKbd>
      <UKbd>K</UKbd>
    </div>
    <UBreadcrumb :items="breadcrumbItems" />
  </InfoPanel>
</template>
