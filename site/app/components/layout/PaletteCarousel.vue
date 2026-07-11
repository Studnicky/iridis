<script setup lang="ts">
const aliases = [
  { 'key': 'primary', 'label': 'Primary' },
  { 'key': 'secondary', 'label': 'Secondary' },
  { 'key': 'success', 'label': 'Success' },
  { 'key': 'warning', 'label': 'Warning' },
  { 'key': 'error', 'label': 'Error' },
  { 'key': 'info', 'label': 'Info' },
  { 'key': 'neutral', 'label': 'Neutral' },
];
</script>

<template>
  <div class="palette-grid">
    <div
      v-for="a in aliases"
      :key="a.key"
      class="grid-item"
    >
      <ScaleCard :alias="a" />
    </div>
  </div>
</template>

<style scoped>
.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  padding-bottom: 2rem;
  width: 100%;
}
.grid-item {
  height: 260px;
  width: 100%;
}
</style>
