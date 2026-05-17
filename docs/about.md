---
layout: doc
title: About iridis
description: iridis is a browser-side palette engine that assigns your seed colors to design-system roles while enforcing WCAG or APCA contrast in OKLCH space
---

<AuroraHero>
  <h1 style="font-size:2.8rem;font-weight:700;letter-spacing:-0.025em;margin:0 0 0.5rem;border:0;padding:0;color:var(--vp-c-text-1)">iridis</h1>
  <p style="font-size:1.18rem;color:var(--vp-c-text-2);max-width:680px;margin:0 0 1.5rem;line-height:1.55">
    You bring the colors you want to use and the role names your design system uses.
    iridis decides which color goes to which role so every accessibility constraint you declare is satisfied.
  </p>
  <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
    <PaletteCTA />
    <a href="/iridis/getting-started" style="text-decoration:none;padding:0.55rem 1.2rem;border-radius:6px;background:color-mix(in oklch, var(--vp-c-bg) 80%, transparent);color:var(--vp-c-text-1);border:1px solid var(--vp-c-divider);font-weight:500;font-size:0.95rem;backdrop-filter:blur(8px)">For developers</a>
    <a href="https://github.com/Studnicky/iridis" style="text-decoration:none;padding:0.55rem 1.2rem;border-radius:6px;background:color-mix(in oklch, var(--vp-c-bg) 80%, transparent);color:var(--vp-c-text-1);border:1px solid var(--vp-c-divider);font-weight:500;font-size:0.95rem;backdrop-filter:blur(8px)">GitHub</a>
  </div>
</AuroraHero>

<div style="height:1.5rem"></div>

::: tip For designers
The **[Build](./)** workspace (= the home page) is the whole product. Three pipelines, one engine: pick hex seeds, drop an image, or edit the role schema. Whichever tab you use, the palette themes every page of the docs and persists across reloads. Hit **Reset** to start over.
:::

## What you get

A palette that already satisfies your accessibility requirements. Every role you ask for (`background`, `foreground`, `accent`, `muted`, or whatever your schema declares) comes out inside its declared lightness, chroma, and contrast envelope. If your seeds don't fit, the engine **nudges them in OKLCH space** until they do. You receive the palette that works, not a report of what's broken.

- **Variable input.** 1 to 8 seed colors. Hex, RGB, HSL, OKLCH, Lab, named, or image pixels, all normalized to a canonical OKLCH-first record.
- **Role-resolved.** Pick `iridis-4`, `iridis-8`, `iridis-12`, or the full `iridis-16` schema. Or write your own role schema on the Build page. Each tier nests inside the next, so picking a smaller tier paints with fewer tokens.
- **Contrast-enforced.** WCAG 2.1 AA / AAA, or APCA Lc. Every role pair you declare meets the threshold or the engine moves the color until it does.
- **Framing-aware.** Dark mode and light mode are real switches in the iridis pipeline, not a CSS toggle. Swap framing in the navbar; every role recomputes against the new envelope.
- **Free, forever.** This whole page runs in your browser. No account, no API key, no telemetry. The palette is yours.

## When you actually need to install something

You only need the npm package if you want palettes generated **at runtime in your app**, like:

- Per-user theming (each user's seeds drive their session)
- Dynamic responses (palette shifts on time of day, scroll, audio, sensors)
- Build-step token generation in CI

If you just need *a* palette, pick once, ship the result, stay here. Export, paste, ship.

```bash
npm install @studnicky/iridis      # only if you want runtime generation
```

## Where to look next

For designers:
- **[Build](./)**: the home page — seed colors, image, role schema
- **[Accessibility calculations](./concepts/accessibility-calculations)**: what AA / AAA / APCA actually mean

For developers:
- **[Getting started](./getting-started)**: the one-liner, then the full Engine API
- **[Pipeline](./concepts/pipeline)**: how the engine runs (intake → resolve → enforce → emit)
- **[Role schemas](./concepts/role-schemas)**: declare what a palette must satisfy
- **[CLI](./recipes/cli)**: the same engine, no Node.js code
- **[Living color (v2 thesis)](./v2-living-color)**: animation engine and reactive bindings planned next
