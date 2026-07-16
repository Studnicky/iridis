<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildInteractablesPaginationModel } from './interactables/buildInteractablesPaginationModel.ts';

type RoleRowType = {
  name: string;
  hex: string;
  ratio: number;
  compliance: string;
  l: number;
  c: number;
  h: number;
};

const props = defineProps<{
  roles: readonly RoleRowType[];
}>();

const page = ref(1);
const pageSize = 8;
const paginationModel = computed(() => buildInteractablesPaginationModel(props.roles, page.value, pageSize));
</script>

<template>
  <InfoPanel
    variant="default"
    label="UPagination — same sorted role list Components' table uses"
  >
    <RoleSwatchStrip
      :roles="paginationModel.pageRoles"
      class="mb-2"
    />
    <UPagination
      v-model:page="page"
      :total="roles.length"
      :items-per-page="pageSize"
      size="xs"
    />
  </InfoPanel>
</template>
