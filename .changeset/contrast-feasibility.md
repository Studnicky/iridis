---
"@studnicky/iridis": minor
"@studnicky/iridis-contrast": minor
---

Failing pairs in the contrast:complianceReport carry an optional `proof` that states whether the pair is reachable at the run's resolved hues, and `analyzeSchema` reports the same reachability for a schema before any run. A pair whose hue is not fixed is reported as indeterminate with its sampled evidence kept separate from the proof.
