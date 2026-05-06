import {
  Config,
  ConfigProvider,
  Effect,
  Layer,
  Redacted,
  Result,
  Schema,
} from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { describe, expect, it } from "vitest";
import {
  BrowserRunApiError,
  BrowserRunCrawlJobId,
  BrowserRunCrawlJobResult,
  BrowserRunCrawlRequest,
  BrowserRunHttpService,
  BrowserRunSchemaError,
} from "../src/index.ts";

describe("Browser Run schemas", () => {
  it("brands non-empty crawl job ids", () => {
    const result =
      Schema.decodeUnknownResult(BrowserRunCrawlJobId)("crawl-job-1");

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("rejects empty crawl job ids", () => {
    const result = Schema.decodeUnknownResult(BrowserRunCrawlJobId)("");

    expect(Result.isFailure(result)).toBe(true);
  });

  it("rejects invalid crawl depth before sending a request", () => {
    const result = Schema.decodeUnknownResult(BrowserRunCrawlRequest)({
      url: new URL("https://www.siebix.com/"),
      depth: 0,
      limit: 1,
    });

    expect(Result.isFailure(result)).toBe(true);
  });

  it("accepts crawl records before metadata is populated", () => {
    const result = Schema.decodeUnknownResult(BrowserRunCrawlJobResult)({
      id: "crawl-job-1",
      browserSecondsUsed: 0,
      finished: 0,
      records: [
        {
          status: "queued",
          url: "https://www.siebix.com/",
        },
      ],
      skipped: 0,
      status: "running",
      total: 1,
    });

    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("Browser Run errors", () => {
  it("formats Cloudflare API errors", () => {
    const error = BrowserRunApiError.make({
      endpoint: "crawl",
      errors: [
        {
          code: "too_small",
          message: "Number must be greater than or equal to 1",
        },
      ],
    });

    expect(error.message).toBe(
      "crawl: [too_small] Number must be greater than or equal to 1",
    );
  });

  it("formats non-primitive schema error causes defensively", () => {
    const cause = Object.create(null);
    const error = BrowserRunSchemaError.make({ cause });

    expect(error.message).toBe("{}");
  });
});

describe("BrowserRunHttpService layers", () => {
  it("creates the service from direct layer options", async () => {
    const client = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* BrowserRunHttpService;
      }).pipe(
        Effect.provide(
          BrowserRunHttpService.layer({
            accountId: "account-1",
            apiKey: Redacted.make("api-key-1"),
          }).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      ),
    );

    expect(typeof client.getMarkdown).toBe("function");
  });

  it("creates the service from custom Effect Config values", async () => {
    const testLayer = BrowserRunHttpService.layerConfig({
      accountId: Config.string("MY_CF_ACCOUNT_ID"),
      apiKey: Config.redacted("MY_BROWSER_RUN_TOKEN"),
      baseUrl: Config.string("MY_BROWSER_RUN_BASE_URL"),
    }).pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            MY_CF_ACCOUNT_ID: "account-2",
            MY_BROWSER_RUN_TOKEN: "api-key-2",
            MY_BROWSER_RUN_BASE_URL: "https://example.com/browser-rendering",
          }),
        ),
      ),
    );

    const client = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* BrowserRunHttpService;
      }).pipe(Effect.provide(testLayer)),
    );

    expect(typeof client.getMarkdown).toBe("function");
  });
});
