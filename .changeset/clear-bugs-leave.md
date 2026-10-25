---
"@studnicky/iridis": minor
"@studnicky/iridis-contrast": minor
---

A role schema can declare a `relationshipGraph` of groups, modes, and relationships (alias, hue-offset, oklch-delta, oklch-interpolate, alpha-overlay), each fixed or tolerant. The `derive:roleRelations` task resolves the graph between `resolve:roles` and `expand:family` and records full before/after color records in `core:relationshipResolution`. Admission rejects graphs with duplicate ids, missing references, or a role derived by more than one relationship. Contrast enforcement, CVD correction, `proveRun`, and `analyzeSchema` read the graph through one `RelationshipConstraint` port: fixed relations hold exactly, tolerant relations permit only their declared lightness, chroma, hue, and alpha deviation, and a pair blocked by a relation reports the `hue-relationship` constraint with the incident `relationIds`. `metadata['contrast:cvd']` carries a diagnostic `relationshipCandidateRejections` record. `alphaOverlay` is exported from `@studnicky/iridis/math` and composites straight-alpha source-over in gamma-encoded sRGB.
