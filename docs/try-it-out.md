---
title: Try it out
---

# Try it out

The example panel on the right is the engine, end to end, against your config. Pick seeds, swap framing in the navbar (light/dark), pick a contrast level and role schema in the sidebar, every chrome and syntax token in the docs recomputes, and your settings persist across pages via `localStorage`.

This page intentionally has no body content beyond this paragraph. The right panel is the page.

::: tip How it cascades
The engine emits eight chrome tokens and 14 syntax tokens as `--iridis-*` CSS custom properties. Every vitepress chrome token (`--vp-c-bg`, `--vp-c-text-1`, etc.) and every Shiki token color cascades from those iridis tokens via `var()` references. Change one seed → engine recomputes → every cascade follower updates in one paint.
:::
