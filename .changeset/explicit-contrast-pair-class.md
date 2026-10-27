---
"@studnicky/iridis": minor
"@studnicky/iridis-anima": minor
"@studnicky/iridis-cli": minor
"@studnicky/iridis-contrast": minor
"@studnicky/iridis-image": minor
"@studnicky/iridis-vscode": minor
---

Every contrast pair declares a required `contrastClass`: `text`, `non-text`, or `ui`. A `text` pair is held to the selected text level (AA 4.5:1 or AAA 7:1) or its declared minimum when that is higher. A `non-text` or `ui` pair is held to its declared minimum (3:1 when none is declared) and to 4.5:1 under non-mandatory AAA. The APCA target follows the same class. Core exports `ContrastPairClassEntity`, and each normalized contrast requirement carries its `contrastClass`. Role schemas and `contrast.extra` entries without a `contrastClass` are rejected at admission.
