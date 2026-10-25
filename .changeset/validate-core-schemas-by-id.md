---
"@studnicky/iridis": patch
---

The engine validates its immutable core schemas through their registered identifiers, so each run reuses the compiled validators instead of re-registering and re-lowering the schema objects.
