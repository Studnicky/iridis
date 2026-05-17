<script setup lang="ts">
/**
 * ResolvedRoleCard.vue
 *
 * Reusable read-only tile that surfaces a single resolved role: name,
 * contrast badge, hex string, and OKLCH coordinates. Painted with the
 * role's own color as the background; foreground text is auto-tuned to
 * whichever of white or black yields the better WCAG 2.1 contrast.
 *
 * The badge string is supplied by the parent — this component is dumb
 * about which standard cleared. Downstream consumers receive a pre-
 * computed badge ('AAA' | 'AA' | 'APCA' | 'APCA·Bronze' | 'fail' | '')
 * so the same tile renders identically whether the engine enforced AA,
 * AAA, or APCA pairs.
 *
 * Every visible field carries a native `title` tooltip explaining what
 * it represents and how a downstream consumer should interpret it.
 */

import { colorRecordFactory, contrastWcag21 } from '@studnicky/iridis';
import { ref } from 'vue';

import type { ColorRecordInterface } from '@studnicky/iridis/model';

const props = defineProps<{
  'name':            string;
  'record':          ColorRecordInterface;
  'badge':           string;
  'badgeTitle'?:     string;
  /** When set, the user has pinned this role to a specific hex. The
   *  card paints with the locked value (passed in via `record`) and
   *  shows a lock indicator. */
  'locked'?:         boolean;
  /** Hex the user supplied as the seed for this role (best-effort
   *  upstream match). Drives the seed → resolved diff disclosure. */
  'seedHex'?:        string;
  /** Set when the role's seed sat outside the schema-declared
   *  lightness or chroma envelope and `looseEnvelope` is on. */
  'envelopeWarning'?: string;
}>();

const emit = defineEmits<{
  'toggle-lock': [];
}>();

const showDetails = ref<boolean>(false);
function onToggleDetails(): void { showDetails.value = !showDetails.value; }

function fmtOklch(c: ColorRecordInterface): string {
  return `L ${c.oklch.l.toFixed(2)} · C ${c.oklch.c.toFixed(2)} · H ${Math.round(c.oklch.h)}`;
}

function safeOnRoleColor(role: ColorRecordInterface): string {
  const white   = colorRecordFactory.fromHex('#ffffff');
  const black   = colorRecordFactory.fromHex('#000000');
  const onWhite = contrastWcag21.apply(white, role) as number;
  const onBlack = contrastWcag21.apply(black, role) as number;
  return onWhite >= onBlack ? '#ffffff' : '#0a0a0a';
}

function fg(): string {
  return safeOnRoleColor(props.record);
}

function fgMuted(): string {
  return safeOnRoleColor(props.record) + 'b0';
}

function badgeBorder(): string {
  return safeOnRoleColor(props.record) + '55';
}
</script>

<template>
  <div
    class="resolved-role-card"
    :class="{
      'resolved-role-card--locked':  locked === true,
      'resolved-role-card--warning': envelopeWarning !== undefined,
    }"
    :style="{ background: record.hex }"
  >
    <div class="resolved-role-card__head">
      <span
        class="resolved-role-card__name"
        :style="{ color: fg() }"
        :title="`Role name. The engine emits this as CSS custom property --c-${name}; contrast pairs reference it by this exact string. Downstream consumers read it from state.roles to bind themed surfaces.`"
      >{{ name }}</span>
      <span class="resolved-role-card__actions">
        <span
          v-if="badge !== ''"
          class="resolved-role-card__badge"
          :style="{ color: fg(), borderColor: badgeBorder() }"
          :title="badgeTitle ?? `Contrast badge surfaces what the engine enforced for this role as a foreground in declared contrast pairs. AAA beats AA beats APCA·Bronze beats APCA; 'fail' means at least one declared pair did not meet its minimum ratio.`"
        >{{ badge }}</span>
        <button
          type="button"
          class="resolved-role-card__lock"
          :style="{ color: fg(), borderColor: badgeBorder() }"
          :aria-pressed="locked === true"
          :title="locked ? `Locked: this role always paints ${record.hex}. Click to unlock and let the engine reassign.` : `Lock this role to ${record.hex}. The engine will keep nudging other roles but leave this one alone.`"
          @click.stop="emit('toggle-lock')"
        >{{ locked ? '🔒' : '🔓' }}</button>
      </span>
    </div>
    <span
      class="resolved-role-card__hex"
      :style="{ color: fg() }"
      :title="`Resolved hex string. This is the sRGB output color the engine produced for this role; copy-paste it into design tooling or read it from state.roles[name].hex.`"
    >{{ record.hex }}</span>
    <span
      class="resolved-role-card__coords"
      :style="{ color: fgMuted() }"
      :title="`OKLCH coordinates — L lightness (0 black to 1 white), C chroma (0 grey to ~0.4 saturated), H hue in degrees (0 red, 120 green, 240 blue). Read state.roles[name].oklch for the raw numbers.`"
    >{{ fmtOklch(record) }}</span>
    <span
      v-if="envelopeWarning !== undefined"
      class="resolved-role-card__warning"
      :style="{ color: fg(), borderColor: badgeBorder() }"
      :title="envelopeWarning"
    >envelope ⚠</span>
    <button
      v-if="seedHex !== undefined && seedHex.toLowerCase() !== record.hex.toLowerCase()"
      type="button"
      class="resolved-role-card__diff-toggle"
      :style="{ color: fgMuted() }"
      :aria-expanded="showDetails"
      :title="`Show the seed → resolved diff. You picked ${seedHex}, the engine produced ${record.hex} after envelope clamp + contrast enforcement.`"
      @click.stop="onToggleDetails"
    >{{ showDetails ? '▾ hide diff' : '▸ seed diff' }}</button>
    <div
      v-if="showDetails && seedHex !== undefined && seedHex.toLowerCase() !== record.hex.toLowerCase()"
      class="resolved-role-card__diff"
      :style="{ color: fgMuted(), borderColor: badgeBorder() }"
    >
      <div class="resolved-role-card__diff-row">
        <span class="resolved-role-card__diff-leg">seed</span>
        <span class="resolved-role-card__diff-swatch" :style="{ background: seedHex }" />
        <span class="resolved-role-card__diff-hex" :style="{ color: fg() }">{{ seedHex }}</span>
      </div>
      <div class="resolved-role-card__diff-row">
        <span class="resolved-role-card__diff-leg">resolved</span>
        <span class="resolved-role-card__diff-swatch" :style="{ background: record.hex }" />
        <span class="resolved-role-card__diff-hex" :style="{ color: fg() }">{{ record.hex }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resolved-role-card {
  padding: 0.7rem 0.85rem;
  border-radius: var(--iridis-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.10);
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-height: 82px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -10px 14px rgba(0, 0, 0, 0.22),
    0 1px 2px rgba(0, 0, 0, 0.18),
    0 4px 12px -4px rgba(0, 0, 0, 0.25);
}
.resolved-role-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.4rem;
}
.resolved-role-card__name {
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  padding: 0.05rem 0.35rem;
  border-radius: 2px;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__hex,
.resolved-role-card__coords {
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__coords { font-size: 0.6rem; }

/* Actions stack vertically on the top-right of the card: badge on
   top, lock toggle directly beneath it. Keeps both glyphs in a
   single column so the card's left side stays the name+hex region. */
.resolved-role-card__actions {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}
.resolved-role-card__lock {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  padding: 0;
  font-size: 0.65rem;
  line-height: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid;
  border-radius: 2px;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__lock:hover { background: rgba(0, 0, 0, 0.40); }
.resolved-role-card--locked {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.resolved-role-card--warning::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  border-top:   8px solid var(--iridis-warning, #ffcc00);
  border-left:  8px solid transparent;
  pointer-events: none;
}
.resolved-role-card { position: relative; }
.resolved-role-card__warning {
  font-family: var(--vp-font-family-mono);
  font-size: 0.58rem;
  padding: 0.05rem 0.32rem;
  border-radius: 2px;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  align-self: flex-start;
  margin-top: 0.2rem;
}
.resolved-role-card__diff-toggle {
  background: none;
  border: 0;
  padding: 0;
  margin-top: 0.2rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-align: left;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__diff-toggle:hover { text-decoration: underline; }
.resolved-role-card__diff {
  margin-top: 0.3rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.20);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
}
.resolved-role-card__diff-row {
  display: grid;
  grid-template-columns: 4rem 0.8rem 1fr;
  align-items: center;
  gap: 0.35rem;
}
.resolved-role-card__diff-leg {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}
.resolved-role-card__diff-swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: block;
}
.resolved-role-card__diff-hex {
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
</style>
