import type { Component } from 'vue';

/**
 * Composition root for per-theme logo-background effects — a lookup map, not
 * a branch, mirroring site/app/theme/particles/index.ts's PARTICLE_RENDERERS
 * convention. A theme key absent from this map (formal, gallery) renders no
 * background at all — that silence IS those themes' "none" treatment, not a
 * missing case. LogoBackground.vue looks up the active theme key here and
 * renders whatever component (if any) it finds.
 */
import ArcadeLogoBg from './ArcadeLogoBg.vue';
import BackroadsLogoBg from './BackroadsLogoBg.vue';
import DayAtWorkLogoBg from './DayAtWorkLogoBg.vue';
import FuturisticLogoBg from './FuturisticLogoBg.vue';
import GirlypopLogoBg from './GirlypopLogoBg.vue';
import HackermanLogoBg from './HackermanLogoBg.vue';
import RestaurantLogoBg from './RestaurantLogoBg.vue';
import RomanceLogoBg from './RomanceLogoBg.vue';
import StartupLogoBg from './StartupLogoBg.vue';
import StreamerLogoBg from './StreamerLogoBg.vue';

export const LOGO_BACKGROUNDS: Record<string, Component> = {
  'arcade':      ArcadeLogoBg,
  'backroads':   BackroadsLogoBg,
  'day-at-work': DayAtWorkLogoBg,
  'futuristic':  FuturisticLogoBg,
  'girlypop':    GirlypopLogoBg,
  'hackerman':   HackermanLogoBg,
  'restaurant':  RestaurantLogoBg,
  'romance':     RomanceLogoBg,
  'startup':     StartupLogoBg,
  'streamer':    StreamerLogoBg
};
