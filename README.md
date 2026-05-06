# Effect Reusables

Reusable Effect packages from [Siebix](https://siebix.com).

This repository is a Bun/Turborepo workspace for small TypeScript packages built
around [Effect](https://effect.website/).

## Packages

| Package | Description |
| --- | --- |
| [`@siebix/cloudflare-browser-run-effect`](./packages/cloudflare-browser-run-effect) | Effect service and schemas for Cloudflare Browser Run Quick Actions. |

## Development

Install dependencies:

```sh
bun install
```

Run checks across the workspace:

```sh
bun run check-types
bun run lint
bun run test
bun run build
```

Run checks for a single package:

```sh
cd packages/cloudflare-browser-run-effect
bun run check-types
bun run lint
bun run test
bun run build
```

## Live Tests

Live Cloudflare Browser Run tests are opt-in and skipped by default.

```sh
cd packages/cloudflare-browser-run-effect
bun run test:live
```

Set credentials in the shell or in
`packages/cloudflare-browser-run-effect/.env`:

```sh
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_BROWSER_RUN_API_KEY=...
```

## Publishing

Packages are published from their package directory. See the package README for
usage details and exported APIs.
