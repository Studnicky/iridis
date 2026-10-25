---
"@studnicky/iridis": patch
---

The shared core validator registry skips duplicate-shape scans, so repeated engine runs in one process hold a steady per-run cost instead of one that grows with the number of runs.
