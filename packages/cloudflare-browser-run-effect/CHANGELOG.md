# Changelog

All notable changes to this package will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## 0.2.0 - 2026-05-06

Breaking beta release for Browser Run layer configuration.

- Replaced the default `BrowserRunHttpService.layer` value with
  `BrowserRunHttpService.layer(options)` for direct credentials.
- Added `BrowserRunHttpService.layerConfig(options?)` for Effect Config-backed
  credentials, including the default Cloudflare environment variables.
- Aligned HTTP client composition with Effect AI client packages: Browser Run
  layers now require callers to provide `HttpClient.HttpClient`, such as
  `FetchHttpClient.layer`.
- Removed the public `BrowserRunConfig` and `layerNoDeps` surface so consumers
  configure the package through `BrowserRunHttpService`.
- Documented direct-value, custom config, default env, and HTTP transport layer
  usage.

## 0.1.1 - 2026-05-06

Patch release for package metadata and documentation.

- Documented the beta status of the package, Effect v4 dependency, and unstable
  Effect module usage.
- Removed `src` from the published npm files so consumers receive the built
  package surface only.

## 0.1.0 - 2026-05-06

Initial public beta release.

- Added an Effect service for Cloudflare Browser Run Quick Actions.
- Added Effect Schema request and response models for content, markdown, JSON,
  PDF, screenshot, snapshot, links, scrape, and crawl endpoints.
- Added typed errors for transport, Cloudflare API, and schema failures.
- Added schema-backed helpers for structured JSON extraction and crawl record
  decoding.
- Added skipped-by-default live coverage for the Browser Run API.
