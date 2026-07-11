
import type { ModuleOptions } from './module'


declare module '@nuxt/schema' {
  interface NuxtConfig { ['googleFonts']?: Partial<ModuleOptions> }
  interface NuxtOptions { ['googleFonts']?: ModuleOptions }
}

declare module 'nuxt/schema' {
  interface NuxtConfig { ['googleFonts']?: Partial<ModuleOptions> }
  interface NuxtOptions { ['googleFonts']?: ModuleOptions }
}


export type { ModuleOptions, default } from './module'
