# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `FetchClient`, `InterceptorManager`, `UndiciDispatcher`, and `RequestBuilder` constructors are now non-public (`protected`). Use `FetchClient.create(config)`, `InterceptorManager.create()`, `UndiciDispatcher.create(config)`, and `RequestBuilder.create(client, path)` to construct instances.
- `FetchClient.builder()`, `InterceptorManager.builder()`, and `UndiciDispatcher.builder()` factory methods provide a fluent alternative to `create()` for each service class.

## [1.0.0] - 2026-06-22

### Added

- FetchClient class with static `create()` factory and fluent `request()` builder API
- Request and response interceptor pipeline — single function or ordered array, applied per-client and per-request
- Protected hook points `onRequestStart`, `onResponseSuccess`, `onRequestError` for subclass telemetry without modifying core behavior
- Undici connection pool dispatcher, query-string utilities, and typed error hierarchy (AbortError, TimeoutError, HTTPError, and more)
