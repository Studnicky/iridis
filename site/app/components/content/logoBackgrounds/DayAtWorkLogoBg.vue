<script setup lang="ts">
/**
 * Day-at-Work logo background — a single blinking text-cursor caret sitting
 * just beside the eye, as if the logo were a spreadsheet cell mid-edit. Hard
 * opacity cut on a slow, calm blink (no easing, no twinkling particles) —
 * this is the understated office-default theme, not a flashy effect.
 */
</script>

<template>
  <div
    class="logo-caret"
    aria-hidden="true"
  >
    <span class="logo-caret-cursor" />
  </div>
</template>

<style scoped>
.logo-caret {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-caret-cursor {
  position: relative;
  left: 1.7rem;
  width: 2px;
  height: 1.5rem;
  background: var(--ui-color-primary-500);
  animation: logo-caret-blink 2.2s steps(1, jump-none) infinite;
}
@keyframes logo-caret-blink {
  0%   { opacity: 1; }
  50%  { opacity: 1; }
  50.01% { opacity: 0; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-caret-cursor { animation: none; opacity: 1; }
}
</style>
