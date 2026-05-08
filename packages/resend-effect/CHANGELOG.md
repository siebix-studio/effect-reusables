# Changelog

All notable changes to this package will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## 0.1.0 - 2026-05-08

Initial public beta release.

### Added

- `contacts.get` now accepts raw contact property values in API responses, in
  addition to `{ type, value }` objects, to match Resend's documented get-contact
  response shape (for example `{ "company_name": "Acme Corp" }`).

### Changed

- Relaxed `ResendContactPropertyValue` validation for `contacts.get` to accept
  `string`, `number`, and `null` values directly.

### Fixed

- Prevented `ResendSchemaError` for valid `contacts.get` responses that include
  custom properties in raw-map form.

### Tests

- Added a regression test for raw custom properties in `contacts.get` responses.
