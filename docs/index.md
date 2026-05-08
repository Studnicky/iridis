---
layout: home

hero:
  name:    iridis
  text:    Chromatic pipeline for dynamic palette derivation
  tagline: Pluggable, OKLCH-native, contrast-enforced. Seeds in, role-resolved palettes out.
  image:
    src: /logo.png
    alt: iridis
  actions:
    - theme:  brand
      text:   Get started
      link:   /getting-started
    - theme:  alt
      text:   Living color (v2 thesis)
      link:   /v2-living-color
    - theme:  alt
      text:   GitHub
      link:   https://github.com/Studnicky/iridis

features:
  - title:   Variable input
    details: 1 to N seed colors in any format (hex, rgb, hsl, oklch, lab, named, image pixels). Intake adapters normalize to a canonical OKLCH-first record.
  - title:   Role-resolved
    details: Roles are consumer-defined JSON Schema. The engine assigns colors to roles, expands missing roles parametrically, enforces contrast pairs, and emits role-shaped output.
  - title:   Pluggable everything
    details: Math primitives, intake formats, transforms, and emitters are all registered domain modules. Swap mixOklch for a perceptual mixer, register a custom emitter, compose your own pipeline.
  - title:   Contrast-enforced
    details: WCAG 2.1, APCA, and CVD simulation as registered tasks. Pairs that fail thresholds are nudged in OKLCH space until they pass — every frame, if you want.
  - title:   Browser- and Node-safe
    details: Core has zero runtime dependencies. Plugins own their deps (n3 lives in iridis-rdf only). Tree-shake or run as CLI; same engine either way.
  - title:   Living color (coming)
    details: Treat a palette as a vector and animate trajectories through OKLCH × N-roles space. Chameleons and chromatophores for your UI.
---
