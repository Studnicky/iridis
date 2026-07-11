---
title: 2. The Four Stages
description: The four conceptual stages of iridis and how data flows through the pipeline.
---

Every iridis pipeline passes through four conceptual stages, even though the task names and execution order are fully controlled by you:

```
intake → resolve → enforce → emit
```

## The Data Flow

::mermaid-diagram
---
code: |
  flowchart TD
      A["input.colors\n(raw strings / objects)"]
      B["state.colors\n(ColorRecord[])"]
      C["state.roles\n(Record<string, ColorRecord>)"]
      D["state.roles\n(contrast-adjusted)"]
      E["state.variants\n(light / dark)"]
      F["state.outputs\n(cssVars, tailwind, shadcn ...)"]

      A -->|intake tasks| B
      B -->|resolve:roles| C
      C -->|enforce:contrast| D
      D -->|derive:variant| E
      D -->|emit tasks| F
      E -->|emit tasks| F
---
::
