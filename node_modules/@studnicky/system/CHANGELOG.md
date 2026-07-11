# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `System` pure-static utility exposing `cpu()`, `memory()`, `platform()`, `gpu()`, and `snapshot()` for runtime decisions about worker pool sizes and hardware-accelerated code paths.
- `GpuDetector` with synchronous `detect()` returning a `GpuInfoType` (name, compute API — `cuda` / `metal` / `opencl` / `software`, optional VRAM) or `null` when no hardware GPU is present.
- Structural types `CpuInfoType`, `MemoryInfoType`, `PlatformInfoType`, `GpuInfoType`, and the aggregate `SystemInfoType`.
