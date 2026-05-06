# Changelog

All notable changes to this package will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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
