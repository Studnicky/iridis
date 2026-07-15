<script setup lang="ts">
/**
 * Restaurant logo background — a single small candle flame flickering beside
 * the eye, echoing restaurant.css's own irregular candlelight-flicker timing
 * (jittery, not a smooth sine pulse) but as its own tiny point-light near the
 * logo rather than the ambient backdrop's full vignette wash.
 */
</script>

<template>
  <div
    class="logo-candle"
    aria-hidden="true"
  >
    <span class="logo-candle-flame" />
  </div>
</template>

<style scoped>
.logo-candle {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.logo-candle-flame {
  position: relative;
  bottom: 0.4rem;
  width: 0.55rem;
  height: 0.85rem;
  border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
  background: radial-gradient(ellipse at 50% 30%,
    color-mix(in oklch, var(--ui-warning) 95%, white) 0%,
    var(--ui-color-warning-500) 55%,
    color-mix(in oklch, var(--ui-error) 70%, transparent) 100%);
  filter: blur(0.5px);
  animation: logo-candle-flicker 2.6s ease-in-out infinite;
}
@keyframes logo-candle-flicker {
  0%, 100% { opacity: 0.45; transform: scaleY(1) translateX(0); }
  20%      { opacity: 0.7;  transform: scaleY(1.08) translateX(0.5px); }
  35%      { opacity: 0.4;  transform: scaleY(0.94) translateX(-0.5px); }
  50%      { opacity: 0.8;  transform: scaleY(1.12) translateX(0); }
  70%      { opacity: 0.5;  transform: scaleY(0.98) translateX(0.5px); }
  85%      { opacity: 0.65; transform: scaleY(1.04) translateX(-0.5px); }
}
@media (prefers-reduced-motion: reduce) {
  .logo-candle-flame { animation: none; opacity: 0.55; }
}
</style>
