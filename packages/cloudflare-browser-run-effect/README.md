# @siebix/cloudflare-browser-run-effect

Effect service and schemas for Cloudflare Browser Run Quick Actions.

Created by [Siebix](https://siebix.com).

## Beta Status

This package targets Effect v4 beta and imports Effect unstable modules for AI
structured output and HTTP. Treat the public API as beta until Effect v4 and
Cloudflare Browser Run stabilize.

## Install

```sh
bun add @siebix/cloudflare-browser-run-effect effect
```

## Package

- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)

## Tests

The package uses Vitest. The live Browser Run test is skipped by default so
normal test runs do not call Cloudflare.

```sh
bun run test
```

To run the live test path when credentials are available:

```sh
CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_BROWSER_RUN_API_KEY=... \
bun run test:live
```

You can also put the credentials in
`packages/cloudflare-browser-run-effect/.env`:

```sh
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_BROWSER_RUN_API_KEY=...
```

Vitest loads that file through `vitest.config.ts`. Values already present in
the shell take precedence over `.env`.

## Configuration

The default layer reads these environment variables through Effect Config:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_BROWSER_RUN_API_KEY`

Use `BrowserRunHttpService.layer` for the default Fetch-backed implementation. Use
`BrowserRunHttpService.layerNoDeps` if you want to provide your own
`BrowserRunConfig` and `HttpClient.HttpClient`.

## Usage

Provide `BrowserRunHttpService.layer` at the edge of your program. Requests that
use `url` expect a `URL` object, so pass `new URL("https://example.com")`
instead of a raw string.

### Get Markdown From A URL

```ts
import { Effect } from "effect";
import { BrowserRunHttpService } from "@siebix/cloudflare-browser-run-effect";

const program = Effect.gen(function* () {
  const client = yield* BrowserRunHttpService;

  return yield* client.getMarkdown({
    url: new URL("https://developers.cloudflare.com/browser-run/"),
  });
});

const markdown = await Effect.runPromise(
  program.pipe(Effect.provide(BrowserRunHttpService.layer)),
);
```

### Get Content From HTML

```ts
import { Effect } from "effect";
import { BrowserRunHttpService } from "@siebix/cloudflare-browser-run-effect";

const html = await Effect.runPromise(
  Effect.gen(function* () {
    const client = yield* BrowserRunHttpService;

    return yield* client.getContent({
      html: "<main><h1>Hello Browser Run</h1></main>",
    });
  }).pipe(Effect.provide(BrowserRunHttpService.layer)),
);
```

## Methods

| Method | Endpoint | Result | Docs |
| --- | --- | --- | --- |
| `getContent(request, query?)` | `POST /content` | Rendered HTML string | [Content endpoint](https://developers.cloudflare.com/browser-run/quick-actions/content-endpoint/) |
| `getMarkdown(request, query?)` | `POST /markdown` | Markdown string | [Markdown endpoint](https://developers.cloudflare.com/browser-run/quick-actions/markdown-endpoint/) |
| `getJson(request, query?)` | `POST /json` | `Record<string, unknown>` | [JSON endpoint](https://developers.cloudflare.com/browser-run/quick-actions/json-endpoint/) |
| `getJsonWithSchema(schema, request, query?)` | `POST /json` | Decoded schema value | [JSON endpoint](https://developers.cloudflare.com/browser-run/quick-actions/json-endpoint/) |
| `getPdf(request, query?)` | `POST /pdf` | `ArrayBuffer` | [PDF endpoint](https://developers.cloudflare.com/browser-run/quick-actions/pdf-endpoint/) |
| `getScreenshot(request, query?)` | `POST /screenshot` | `ArrayBuffer` | [Screenshot endpoint](https://developers.cloudflare.com/browser-run/quick-actions/screenshot-endpoint/) |
| `getSnapshot(request, query?)` | `POST /snapshot` | `{ content, screenshot }` | [Snapshot endpoint](https://developers.cloudflare.com/browser-run/quick-actions/snapshot/) |
| `getLinks(request, query?)` | `POST /links` | `string[]` | [Links endpoint](https://developers.cloudflare.com/browser-run/quick-actions/links-endpoint/) |
| `getScrape(request, query?)` | `POST /scrape` | Selector-grouped element data | [Scrape endpoint](https://developers.cloudflare.com/browser-run/quick-actions/scrape-endpoint/) |
| `startCrawl(request, query?)` | `POST /crawl` | `BrowserRunCrawlJobId` | [Crawl endpoint](https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/) |
| `startCrawlWithSchema(schema, request, query?)` | `POST /crawl` | `BrowserRunCrawlJobId` | [Crawl endpoint](https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/) |
| `getCrawlResult(jobId, query?)` | `GET /crawl/{job_id}` | Crawl job result | [Crawl endpoint](https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/) |
| `decodeCrawlRecordsJson(schema, records)` | Local helper | Decoded crawl record JSON | [Crawl endpoint](https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/) |
| `cancelCrawl(jobId)` | `DELETE /crawl/{job_id}` | Cancellation result | [Crawl endpoint](https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/) |

All request and response shapes are exported as Effect Schema values and TypeScript
types, for example `BrowserRunPdfRequest`, `BrowserRunLinksResult`, and
`BrowserRunCrawlJobResult`. Crawl job ids use the non-empty branded string
schema `BrowserRunCrawlJobId`, so ids returned from `startCrawl` can be passed
directly to `getCrawlResult` and `cancelCrawl`.

If you load a job id from storage or another untyped boundary, decode it first:

```ts
import { Schema } from "effect";
import { BrowserRunCrawlJobId } from "@siebix/cloudflare-browser-run-effect";

const jobId = Schema.decodeUnknownSync(BrowserRunCrawlJobId)(storedJobId);
```

## Binary Endpoints

`getPdf` and `getScreenshot` return raw bytes as `ArrayBuffer`.

```ts
import { Effect } from "effect";
import { BrowserRunHttpService } from "@siebix/cloudflare-browser-run-effect";

const pdfBytes = await Effect.runPromise(
  Effect.gen(function* () {
    const client = yield* BrowserRunHttpService;

    return yield* client.getPdf({
      url: new URL("https://example.com"),
      pdfOptions: {
        format: "a4",
        printBackground: true,
      },
    });
  }).pipe(Effect.provide(BrowserRunHttpService.layer)),
);
```

## Structured JSON

Use `getJsonWithSchema` when you want the Browser Run response format and the
runtime decoder to come from the same Effect Schema.

```ts
import { Effect, Schema } from "effect";
import { BrowserRunHttpService } from "@siebix/cloudflare-browser-run-effect";

const PageSummary = Schema.Struct({
  title: Schema.String,
  summary: Schema.String,
});

const summary = await Effect.runPromise(
  Effect.gen(function* () {
    const client = yield* BrowserRunHttpService;

    return yield* client.getJsonWithSchema(PageSummary, {
      url: new URL("https://example.com"),
      prompt: "Extract the page title and a short summary.",
    });
  }).pipe(Effect.provide(BrowserRunHttpService.layer)),
);
```

## Crawl Jobs

`startCrawl` returns a branded `BrowserRunCrawlJobId`. Pass that id directly to
`getCrawlResult` or `cancelCrawl`.

```ts
import { Effect } from "effect";
import { BrowserRunHttpService } from "@siebix/cloudflare-browser-run-effect";

const crawlResult = await Effect.runPromise(
  Effect.gen(function* () {
    const client = yield* BrowserRunHttpService;

    const jobId = yield* client.startCrawl({
      url: new URL("https://example.com"),
      formats: ["markdown"],
    });

    return yield* client.getCrawlResult(jobId, {
      limit: 25,
      status: "completed",
    });
  }).pipe(Effect.provide(BrowserRunHttpService.layer)),
);
```

## Errors

The service uses typed errors:

- `BrowserRunHttpError` for transport, status, and body read failures.
- `BrowserRunApiError` when Cloudflare returns a JSON envelope with
  `success: false` or no required `result`.
- `BrowserRunSchemaError` for request encoding, response decoding, and
  structured-output schema failures.

For binary endpoints, successful responses are raw bytes. If Cloudflare returns
a non-2xx JSON error body, the service surfaces `BrowserRunApiError`; otherwise
it falls back to `BrowserRunHttpError`.
