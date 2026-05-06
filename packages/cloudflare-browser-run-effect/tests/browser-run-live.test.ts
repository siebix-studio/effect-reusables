import { Effect, Exit, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { describe, expect, it } from "vitest";
import { BrowserRunHttpService } from "../src/index.ts";

const hasCloudflareCredentials =
  process.env.CLOUDFLARE_ACCOUNT_ID !== undefined &&
  process.env.CLOUDFLARE_BROWSER_RUN_API_KEY !== undefined;
const forceLive = process.env.BROWSER_RUN_LIVE === "1";

const liveIt = forceLive ? it : it.skip;

const targetUrl = new URL("https://www.siebix.com/");
const inlineHtml = `
  <main>
    <h1>Siebix Browser Run live test</h1>
    <a href="https://www.siebix.com/">Siebix</a>
  </main>
`;

const PageSummary = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
});

describe("BrowserRunHttpService live quick actions", () => {
  liveIt(
    "runs every exposed Browser Run helper against siebix.com",
    async () => {
      if (!hasCloudflareCredentials) {
        throw new Error(
          "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_BROWSER_RUN_API_KEY to run the live Browser Run test.",
        );
      }

      const LiveLayer = BrowserRunHttpService.layerConfig().pipe(
        Layer.provide(FetchHttpClient.layer),
      );

      await Effect.runPromise(
        Effect.gen(function* () {
          const client = yield* BrowserRunHttpService;

          const content = yield* client.getContent(
            { url: targetUrl },
            { cacheTTL: 0 },
          );
          expect(content).toContain("<html");
          expect(content.length).toBeGreaterThan(1_000);

          const markdown = yield* client.getMarkdown(
            { url: targetUrl },
            { cacheTTL: 0 },
          );
          expect(markdown).toContain("Siebix");

          const json = yield* client.getJson(
            {
              url: targetUrl,
              prompt: "Extract the page title and a short description.",
            },
            { cacheTTL: 0 },
          );
          expect(Object.keys(json).length).toBeGreaterThan(0);

          const summary = yield* client.getJsonWithSchema(
            PageSummary,
            {
              url: targetUrl,
              prompt:
                "Return the page title and a short one-sentence description of the website.",
            },
            { cacheTTL: 0 },
          );
          expect(summary.title).toContain("Siebix");
          expect(summary.description.length).toBeGreaterThan(10);

          const pdf = yield* client.getPdf(
            {
              url: targetUrl,
              pdfOptions: {
                format: "a4",
                printBackground: true,
              },
            },
            { cacheTTL: 0 },
          );
          expect(pdf.byteLength).toBeGreaterThan(1_000);

          const screenshot = yield* client.getScreenshot(
            {
              url: targetUrl,
              screenshotOptions: { type: "png" },
            },
            { cacheTTL: 0 },
          );
          expect(screenshot.byteLength).toBeGreaterThan(1_000);

          const snapshot = yield* client.getSnapshot(
            { url: targetUrl },
            { cacheTTL: 0 },
          );
          expect(snapshot.content).toContain("<html");
          expect(snapshot.screenshot.length).toBeGreaterThan(1_000);

          const links = yield* client.getLinks(
            {
              url: targetUrl,
              visibleLinksOnly: true,
            },
            { cacheTTL: 0 },
          );
          expect(links).toContain("mailto:contact@siebix.com");

          const scrape = yield* client.getScrape(
            {
              url: targetUrl,
              elements: [{ selector: "a" }, { selector: "h1" }],
            },
            { cacheTTL: 0 },
          );
          expect(
            scrape.find((group) => group.selector === "a")?.results.length,
          ).toBeGreaterThan(0);
          expect(
            scrape.find((group) => group.selector === "h1")?.results.length,
          ).toBeGreaterThan(0);

          const inlineContent = yield* client.getContent(
            { html: inlineHtml },
            { cacheTTL: 0 },
          );
          expect(inlineContent).toContain("Siebix Browser Run live test");

          const crawlJobId = yield* client.startCrawl(
            {
              url: targetUrl,
              formats: ["markdown"],
              limit: 1,
              depth: 1,
            },
            { cacheTTL: 0 },
          );

          const crawlResult = yield* client.getCrawlResult(crawlJobId, {
            limit: 10,
          });
          expect(crawlResult.id).toBe(crawlJobId);
          expect(crawlResult.records.length).toBeGreaterThanOrEqual(0);

          const decoded = yield* client.decodeCrawlRecordsJson(
            PageSummary,
            crawlResult.records,
          );
          expect(decoded.length).toBeGreaterThanOrEqual(0);

          const cancelResult = yield* client.cancelCrawl(crawlJobId);
          expect(cancelResult.job_id).toBe(crawlJobId);

          const structuredCrawlJobId = yield* client.startCrawlWithSchema(
            PageSummary,
            {
              url: targetUrl,
              formats: ["json"],
              jsonOptions: {
                prompt:
                  "Return the page title and a short one-sentence description of the website.",
              },
              limit: 1,
              depth: 1,
            },
            { cacheTTL: 0 },
          );

          const structuredCancelExit = yield* Effect.exit(
            client.cancelCrawl(structuredCrawlJobId),
          );
          expect(Exit.isSuccess(structuredCancelExit)).toBe(true);
        }).pipe(Effect.provide(LiveLayer)),
      );
    },
    180_000,
  );
});
