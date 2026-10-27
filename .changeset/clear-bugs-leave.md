---
"@studnicky/iridis": minor
"@studnicky/iridis-contrast": minor
---

A role schema can declare a `relationshipGraph` of groups, modes, and relationships (alias, hue-offset, hue-target, oklch-delta, oklch-interpolate, alpha-overlay), each fixed or tolerant. The `derive:roleRelations` task resolves the graph after `resolve:roles` and records full before/after color records in `core:relationshipResolution`. Admission rejects graphs with duplicate ids, missing references, or a role derived by more than one relationship. Contrast enforcement, CVD correction, `proveRun`, and `analyzeSchema` read the graph through one `RelationshipConstraint` port: fixed relations hold exactly, tolerant relations permit only their declared lightness, chroma, hue, and alpha deviation, and a pair blocked by a relation reports the `hue-relationship` constraint with the incident `relationIds`. `metadata['contrast:cvd']` carries a diagnostic `relationshipCandidateRejections` record. `alphaOverlay` is exported from `@studnicky/iridis/math` and composites straight-alpha source-over in gamma-encoded sRGB.

CVD correction retains valid peer corrections when another correction group is restored, so nudge and enforce preserve affected syntax, link, and brand roles that clear CVD stability failures rather than resetting the whole component.

Role schemas use `relationshipGraph` and `derive:roleRelations` instead of role fields `derivedFrom`, `hueOffset`, `hue`, `hueClamp`, `lightnessOffset`, and `chromaScale`, and instead of tasks `expand:family`, `derive:semanticHues`, and `pin:derivedRoles`. Consumers declare graph relationships and run `derive:roleRelations`.

This minor release removes the published `expandFamily` API and `expand:family` task. Consumers replace them with `relationshipGraph` and `derive:roleRelations`. It also removes `HueTargetOverrideEntity`, role-level derivation and hue fields, and the `core:hueOffsetOverrides` and `core:hueTargetOverrides` metadata slots and accessors; authored relationships carry those values directly.

`RoleSchemaEntity.intake` returns a deeply frozen admitted schema. Core exports `CompositeKey`, `RelationshipHueDegrees`, `RelationshipSources`, `hueResolutionChroma`, `ContrastPolicy.allowsRange`, `RelationshipConstraintDomain.coordinateRange`, `RelationshipConstraint.allowsCoordinates`, and `RelationshipConstraint.allowsDomain` for consumers that need the canonical relationship and coordinate rules.
