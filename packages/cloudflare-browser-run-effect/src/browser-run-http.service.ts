import {
  Config,
  Context,
  Effect,
  flow,
  Layer,
  type Redacted,
  Schema,
} from "effect";
import { OpenAiStructuredOutput } from "effect/unstable/ai";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "effect/unstable/http";

const TimeoutMs = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 120_000 }),
);
const CacheTtlSeconds = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 86_400 }),
);
const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const BrowserResourceType = Schema.Literals([
  "document",
  "stylesheet",
  "image",
  "media",
  "font",
  "script",
  "texttrack",
  "xhr",
  "fetch",
  "prefetch",
  "eventsource",
  "websocket",
  "manifest",
  "signedexchange",
  "ping",
  "cspviolationreport",
  "preflight",
  "other",
]);

const WaitUntil = Schema.Literals([
  "load",
  "domcontentloaded",
  "networkidle0",
  "networkidle2",
]);

const ScriptTag = Schema.Struct({
  id: Schema.optional(Schema.String),
  content: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});

const StyleTag = Schema.Struct({
  content: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});

const Authenticate = Schema.Struct({
  password: Schema.String,
  username: Schema.String,
});

const Cookie = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
  domain: Schema.optional(Schema.String),
  expires: Schema.optional(Schema.Number),
  httpOnly: Schema.optional(Schema.Boolean),
  partitionKey: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Literals(["Low", "Medium", "High"])),
  sameParty: Schema.optional(Schema.Boolean),
  sameSite: Schema.optional(Schema.Literals(["Strict", "Lax", "None"])),
  secure: Schema.optional(Schema.Boolean),
  sourcePort: Schema.optional(Schema.Number),
  sourceScheme: Schema.optional(
    Schema.Literals(["Unset", "NonSecure", "Secure"]),
  ),
  url: Schema.optional(Schema.String),
});

const GotoOptions = Schema.Struct({
  referer: Schema.optional(Schema.String),
  referrerPolicy: Schema.optional(Schema.String),
  timeout: Schema.optional(TimeoutMs),
  waitUntil: Schema.optional(
    Schema.Union([WaitUntil, Schema.Array(WaitUntil)]),
  ),
});

const Viewport = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  deviceScaleFactor: Schema.optional(Schema.Number),
  hasTouch: Schema.optional(Schema.Boolean),
  isLandscape: Schema.optional(Schema.Boolean),
  isMobile: Schema.optional(Schema.Boolean),
});

const WaitForSelector = Schema.Struct({
  selector: Schema.String,
  hidden: Schema.optional(Schema.Literal(true)),
  timeout: Schema.optional(TimeoutMs),
  visible: Schema.optional(Schema.Literal(true)),
});

const ContentRequestOptions = {
  actionTimeout: Schema.optional(TimeoutMs),
  addScriptTag: Schema.optional(Schema.Array(ScriptTag)),
  addStyleTag: Schema.optional(Schema.Array(StyleTag)),
  allowRequestPattern: Schema.optional(Schema.Array(Schema.String)),
  allowResourceTypes: Schema.optional(Schema.Array(BrowserResourceType)),
  authenticate: Schema.optional(Authenticate),
  bestAttempt: Schema.optional(Schema.Boolean),
  cookies: Schema.optional(Schema.Array(Cookie)),
  emulateMediaType: Schema.optional(Schema.String),
  gotoOptions: Schema.optional(GotoOptions),
  rejectRequestPattern: Schema.optional(Schema.Array(Schema.String)),
  rejectResourceTypes: Schema.optional(Schema.Array(BrowserResourceType)),
  setExtraHTTPHeaders: Schema.optional(
    Schema.Record(Schema.String, Schema.String),
  ),
  setJavaScriptEnabled: Schema.optional(Schema.Boolean),
  userAgent: Schema.optional(Schema.String),
  viewport: Schema.optional(Viewport),
  waitForSelector: Schema.optional(WaitForSelector),
  waitForTimeout: Schema.optional(TimeoutMs),
};

const CustomAiModel = Schema.Struct({
  model: Schema.String,
  authorization: Schema.optional(Schema.String),
});

export const BrowserRunJsonSchema = Schema.Record(
  Schema.String,
  Schema.Unknown,
);
export type BrowserRunJsonSchema = typeof BrowserRunJsonSchema.Type;

export const BrowserRunJsonResponseFormat = Schema.Struct({
  type: Schema.Literals(["json_object", "json_schema"]),
  json_schema: Schema.optional(BrowserRunJsonSchema),
});
export type BrowserRunJsonResponseFormat =
  typeof BrowserRunJsonResponseFormat.Type;

const JsonRequestOptions = {
  ...ContentRequestOptions,
  custom_ai: Schema.optional(Schema.Array(CustomAiModel)),
  prompt: Schema.optional(Schema.String),
  response_format: Schema.optional(BrowserRunJsonResponseFormat),
};

const BrowserRunRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      ...ContentRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      ...ContentRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);

/** Request body for `/content`, which renders HTML from either a URL or raw HTML. */
export const BrowserRunContentRequest = BrowserRunRequest;
export type BrowserRunContentRequest = typeof BrowserRunContentRequest.Type;

/** Request body for `/markdown`, which renders Markdown from either a URL or raw HTML. */
export const BrowserRunMarkdownRequest = BrowserRunRequest;
export type BrowserRunMarkdownRequest = typeof BrowserRunMarkdownRequest.Type;

const PdfLength = Schema.Union([Schema.String, Schema.Number]);

export const BrowserRunPdfMargin = Schema.Struct({
  bottom: Schema.optional(PdfLength),
  left: Schema.optional(PdfLength),
  right: Schema.optional(PdfLength),
  top: Schema.optional(PdfLength),
});
export type BrowserRunPdfMargin = typeof BrowserRunPdfMargin.Type;

export const BrowserRunPdfOptions = Schema.Struct({
  displayHeaderFooter: Schema.optional(Schema.Boolean),
  footerTemplate: Schema.optional(Schema.String),
  format: Schema.optional(Schema.String),
  headerTemplate: Schema.optional(Schema.String),
  height: Schema.optional(PdfLength),
  landscape: Schema.optional(Schema.Boolean),
  margin: Schema.optional(BrowserRunPdfMargin),
  omitBackground: Schema.optional(Schema.Boolean),
  outline: Schema.optional(Schema.Boolean),
  pageRanges: Schema.optional(Schema.String),
  preferCSSPageSize: Schema.optional(Schema.Boolean),
  printBackground: Schema.optional(Schema.Boolean),
  scale: Schema.optional(Schema.Number),
  tagged: Schema.optional(Schema.Boolean),
  timeout: Schema.optional(TimeoutMs),
  width: Schema.optional(PdfLength),
});
export type BrowserRunPdfOptions = typeof BrowserRunPdfOptions.Type;

/** Request body for `/pdf`, which returns the generated PDF bytes. */
export const BrowserRunPdfRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      pdfOptions: Schema.optional(BrowserRunPdfOptions),
      ...ContentRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      pdfOptions: Schema.optional(BrowserRunPdfOptions),
      ...ContentRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);
export type BrowserRunPdfRequest = typeof BrowserRunPdfRequest.Type;

const ScreenshotClip = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
  scale: Schema.optional(Schema.Number),
});

export const BrowserRunScreenshotOptions = Schema.Struct({
  captureBeyondViewport: Schema.optional(Schema.Boolean),
  clip: Schema.optional(ScreenshotClip),
  encoding: Schema.optional(Schema.Literals(["base64", "binary"])),
  fromSurface: Schema.optional(Schema.Boolean),
  fullPage: Schema.optional(Schema.Boolean),
  omitBackground: Schema.optional(Schema.Boolean),
  optimizeForSpeed: Schema.optional(Schema.Boolean),
  quality: Schema.optional(
    Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 100 })),
  ),
  type: Schema.optional(Schema.Literals(["jpeg", "png", "webp"])),
});
export type BrowserRunScreenshotOptions =
  typeof BrowserRunScreenshotOptions.Type;

/** Request body for `/snapshot`, which returns rendered HTML and a base64 screenshot. */
export const BrowserRunSnapshotRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      screenshotOptions: Schema.optional(BrowserRunScreenshotOptions),
      ...ContentRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      screenshotOptions: Schema.optional(BrowserRunScreenshotOptions),
      ...ContentRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);
export type BrowserRunSnapshotRequest = typeof BrowserRunSnapshotRequest.Type;

const ScreenshotRequestOptions = {
  ...ContentRequestOptions,
  screenshotOptions: Schema.optional(BrowserRunScreenshotOptions),
  scrollPage: Schema.optional(Schema.Boolean),
  selector: Schema.optional(Schema.String),
};

/** Request body for `/screenshot`, which returns image bytes. */
export const BrowserRunScreenshotRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      ...ScreenshotRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      ...ScreenshotRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);
export type BrowserRunScreenshotRequest =
  typeof BrowserRunScreenshotRequest.Type;

const LinksRequestOptions = {
  ...ContentRequestOptions,
  excludeExternalLinks: Schema.optional(Schema.Boolean),
  visibleLinksOnly: Schema.optional(Schema.Boolean),
};

/** Request body for `/links`, including visibility and external-link filters. */
export const BrowserRunLinksRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      ...LinksRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      ...LinksRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);
export type BrowserRunLinksRequest = typeof BrowserRunLinksRequest.Type;

const ScrapeElement = Schema.Struct({
  selector: Schema.String,
});

/** Request body for `/scrape`, which extracts selected DOM elements. */
export const BrowserRunScrapeRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      elements: Schema.Array(ScrapeElement),
      ...ContentRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      elements: Schema.Array(ScrapeElement),
      ...ContentRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);
export type BrowserRunScrapeRequest = typeof BrowserRunScrapeRequest.Type;

/** Request body for `/json`, including optional prompt and structured response options. */
export const BrowserRunJsonRequest = Schema.Union(
  [
    Schema.Struct({
      url: Schema.URL,
      ...JsonRequestOptions,
    }),
    Schema.Struct({
      html: Schema.String,
      ...JsonRequestOptions,
    }),
  ],
  { mode: "oneOf" },
);
export type BrowserRunJsonRequest = typeof BrowserRunJsonRequest.Type;

const BrowserRunQuery = Schema.Struct({
  cacheTTL: Schema.optional(CacheTtlSeconds),
});
export const BrowserRunContentQuery = BrowserRunQuery;
export type BrowserRunContentQuery = typeof BrowserRunContentQuery.Type;
export const BrowserRunMarkdownQuery = BrowserRunQuery;
export type BrowserRunMarkdownQuery = typeof BrowserRunMarkdownQuery.Type;
export const BrowserRunPdfQuery = BrowserRunQuery;
export type BrowserRunPdfQuery = typeof BrowserRunPdfQuery.Type;
export const BrowserRunSnapshotQuery = BrowserRunQuery;
export type BrowserRunSnapshotQuery = typeof BrowserRunSnapshotQuery.Type;
export const BrowserRunScreenshotQuery = BrowserRunQuery;
export type BrowserRunScreenshotQuery = typeof BrowserRunScreenshotQuery.Type;
export const BrowserRunLinksQuery = BrowserRunQuery;
export type BrowserRunLinksQuery = typeof BrowserRunLinksQuery.Type;
export const BrowserRunScrapeQuery = BrowserRunQuery;
export type BrowserRunScrapeQuery = typeof BrowserRunScrapeQuery.Type;
export const BrowserRunJsonQuery = BrowserRunQuery;
export type BrowserRunJsonQuery = typeof BrowserRunJsonQuery.Type;

const CrawlPurpose = Schema.Literals(["search", "ai-input", "ai-train"]);
const CrawlFormat = Schema.Literals(["html", "markdown", "json"]);
const CrawlSource = Schema.Literals(["sitemaps", "links", "all"]);
const CrawlUrlStatus = Schema.Literals([
  "queued",
  "errored",
  "completed",
  "disallowed",
  "skipped",
  "cancelled",
]);

/** Cloudflare Browser Run crawl job id returned by `startCrawl`. */
export const BrowserRunCrawlJobId = Schema.String.check(
  Schema.isMinLength(1),
).pipe(Schema.brand("BrowserRunCrawlJobId"));
export type BrowserRunCrawlJobId = typeof BrowserRunCrawlJobId.Type;

const CrawlLinkOptions = Schema.Struct({
  excludePatterns: Schema.optional(Schema.Array(Schema.String)),
  includeExternalLinks: Schema.optional(Schema.Boolean),
  includePatterns: Schema.optional(Schema.Array(Schema.String)),
  includeSubdomains: Schema.optional(Schema.Boolean),
});

const CrawlJsonOptions = Schema.Struct({
  custom_ai: Schema.optional(Schema.Array(CustomAiModel)),
  prompt: Schema.optional(Schema.String),
  response_format: Schema.optional(BrowserRunJsonResponseFormat),
});

const CrawlJobOptions = {
  crawlPurposes: Schema.optional(Schema.Array(CrawlPurpose)),
  depth: Schema.optional(PositiveInt),
  formats: Schema.optional(Schema.Array(CrawlFormat)),
  jsonOptions: Schema.optional(CrawlJsonOptions),
  limit: Schema.optional(PositiveInt),
  maxAge: Schema.optional(Schema.Number),
  modifiedSince: Schema.optional(Schema.Number),
  options: Schema.optional(CrawlLinkOptions),
  source: Schema.optional(CrawlSource),
};

const BrowserRunCrawlRenderedRequest = Schema.Struct({
  url: Schema.URL,
  render: Schema.optional(Schema.Literal(true)),
  ...ContentRequestOptions,
  ...CrawlJobOptions,
});

const BrowserRunCrawlStaticRequest = Schema.Struct({
  url: Schema.URL,
  render: Schema.Literal(false),
  ...CrawlJobOptions,
});

export const BrowserRunCrawlRequest = Schema.Union(
  [BrowserRunCrawlRenderedRequest, BrowserRunCrawlStaticRequest],
  { mode: "oneOf" },
);
export type BrowserRunCrawlRequest = typeof BrowserRunCrawlRequest.Type;

export const BrowserRunCrawlQuery = BrowserRunQuery;
export type BrowserRunCrawlQuery = typeof BrowserRunCrawlQuery.Type;

export const BrowserRunCrawlResultQuery = Schema.Struct({
  cacheTTL: Schema.optional(CacheTtlSeconds),
  cursor: Schema.optional(Schema.Number),
  limit: Schema.optional(PositiveInt),
  status: Schema.optional(CrawlUrlStatus),
});
export type BrowserRunCrawlResultQuery = typeof BrowserRunCrawlResultQuery.Type;

const CrawlRecordMetadata = Schema.Struct({
  status: Schema.Number,
  url: Schema.String,
  title: Schema.optional(Schema.String),
});

const CrawlRecord = Schema.Struct({
  metadata: Schema.optional(CrawlRecordMetadata),
  status: CrawlUrlStatus,
  url: Schema.String,
  html: Schema.optional(Schema.String),
  json: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  markdown: Schema.optional(Schema.String),
});

export const BrowserRunCrawlJobResult = Schema.Struct({
  id: BrowserRunCrawlJobId,
  browserSecondsUsed: Schema.Number,
  finished: Schema.Number,
  records: Schema.Array(CrawlRecord),
  skipped: Schema.Number,
  status: Schema.String,
  total: Schema.Number,
  cursor: Schema.optional(Schema.String),
});
export type BrowserRunCrawlJobResult = typeof BrowserRunCrawlJobResult.Type;

const BrowserRunResponseMeta = Schema.Struct({
  status: Schema.optional(Schema.Number),
  title: Schema.optional(Schema.String),
});

const BrowserRunResponseError = Schema.Struct({
  code: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  message: Schema.String,
});

const BrowserRunStartCrawlResponse = Schema.Struct({
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
  result: Schema.optional(Schema.Unknown),
});

const BrowserRunGetCrawlResponse = Schema.Struct({
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
  result: Schema.optional(BrowserRunCrawlJobResult),
});

export const BrowserRunCancelCrawlResult = Schema.Struct({
  job_id: BrowserRunCrawlJobId,
  message: Schema.String,
});
export type BrowserRunCancelCrawlResult =
  typeof BrowserRunCancelCrawlResult.Type;

const BrowserRunCancelCrawlResponse = Schema.Struct({
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
  result: Schema.optional(BrowserRunCancelCrawlResult),
});

const BrowserRunContentResponse = Schema.Struct({
  meta: BrowserRunResponseMeta,
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
  result: Schema.optional(Schema.String),
});

const BrowserRunMarkdownResponse = Schema.Struct({
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
  result: Schema.optional(Schema.String),
});

export const BrowserRunJsonResult = Schema.Record(
  Schema.String,
  Schema.Unknown,
);
export type BrowserRunJsonResult = typeof BrowserRunJsonResult.Type;

const BrowserRunJsonResponse = Schema.Struct({
  result: Schema.optional(BrowserRunJsonResult),
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
});

export type BrowserRunPdfResult = ArrayBuffer;
export type BrowserRunScreenshotResult = ArrayBuffer;

/** Result returned by `/snapshot`. `screenshot` is a base64-encoded image. */
export const BrowserRunSnapshotResult = Schema.Struct({
  content: Schema.String,
  screenshot: Schema.String,
});
export type BrowserRunSnapshotResult = typeof BrowserRunSnapshotResult.Type;

const BrowserRunSnapshotResponse = Schema.Struct({
  meta: BrowserRunResponseMeta,
  result: Schema.optional(BrowserRunSnapshotResult),
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
});

export const BrowserRunLinksResult = Schema.Array(Schema.String);
export type BrowserRunLinksResult = typeof BrowserRunLinksResult.Type;

const BrowserRunLinksResponse = Schema.Struct({
  result: Schema.optional(BrowserRunLinksResult),
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
});

export const BrowserRunScrapeAttribute = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
});
export type BrowserRunScrapeAttribute = typeof BrowserRunScrapeAttribute.Type;

export const BrowserRunScrapeElementResult = Schema.Struct({
  attributes: Schema.Array(BrowserRunScrapeAttribute),
  height: Schema.Number,
  html: Schema.String,
  left: Schema.Number,
  text: Schema.String,
  top: Schema.Number,
  width: Schema.Number,
});
export type BrowserRunScrapeElementResult =
  typeof BrowserRunScrapeElementResult.Type;

export const BrowserRunScrapeSelectorResult = Schema.Struct({
  results: Schema.Array(BrowserRunScrapeElementResult),
  selector: Schema.String,
});
export type BrowserRunScrapeSelectorResult =
  typeof BrowserRunScrapeSelectorResult.Type;

export const BrowserRunScrapeResult = Schema.Array(
  BrowserRunScrapeSelectorResult,
);
export type BrowserRunScrapeResult = typeof BrowserRunScrapeResult.Type;

const BrowserRunScrapeResponse = Schema.Struct({
  result: Schema.optional(BrowserRunScrapeResult),
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
});

const BrowserRunBinaryErrorResponse = Schema.Struct({
  success: Schema.optional(Schema.Boolean),
  errors: Schema.optional(Schema.Array(BrowserRunResponseError)),
});

const formatCause = (cause: unknown) => {
  if (cause instanceof Error) {
    return cause.message;
  }

  try {
    return String(cause);
  } catch {
    try {
      return JSON.stringify(cause);
    } catch {
      return Object.prototype.toString.call(cause);
    }
  }
};

export class BrowserRunHttpError extends Schema.TaggedErrorClass<BrowserRunHttpError>()(
  "BrowserRunHttpError",
  {
    cause: Schema.Defect,
  },
) {
  override get message() {
    return formatCause(this.cause);
  }
}

export class BrowserRunApiError extends Schema.TaggedErrorClass<BrowserRunApiError>()(
  "BrowserRunApiError",
  {
    endpoint: Schema.Literals([
      "content",
      "markdown",
      "pdf",
      "snapshot",
      "screenshot",
      "links",
      "scrape",
      "json",
      "crawl",
      "crawlResult",
      "cancelCrawl",
    ]),
    errors: Schema.Array(BrowserRunResponseError),
    meta: Schema.optional(BrowserRunResponseMeta),
  },
) {
  override get message() {
    const detail =
      this.errors.length > 0
        ? this.errors
            .map((e) =>
              e.code !== undefined ? `[${e.code}] ${e.message}` : e.message,
            )
            .join(", ")
        : "no error detail returned";
    return `${this.endpoint}: ${detail}`;
  }
}

export class BrowserRunSchemaError extends Schema.TaggedErrorClass<BrowserRunSchemaError>()(
  "BrowserRunSchemaError",
  {
    cause: Schema.Defect,
  },
) {
  override get message() {
    return formatCause(this.cause);
  }
}

export type BrowserRunContentError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunMarkdownError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunPdfError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunScreenshotError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunSnapshotError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunLinksError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunScrapeError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunJsonError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;
export type BrowserRunCrawlError =
  | BrowserRunHttpError
  | BrowserRunApiError
  | BrowserRunSchemaError;

/** Public method surface for `BrowserRunHttpService`. */
export interface BrowserRunHttpServiceApi {
  /**
   * Render a page and return its HTML content.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/content-endpoint/
   */
  readonly getContent: (
    request: BrowserRunContentRequest,
    query?: BrowserRunContentQuery,
  ) => Effect.Effect<string, BrowserRunContentError>;

  /**
   * Render a page and return Markdown.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/markdown-endpoint/
   */
  readonly getMarkdown: (
    request: BrowserRunMarkdownRequest,
    query?: BrowserRunMarkdownQuery,
  ) => Effect.Effect<string, BrowserRunMarkdownError>;

  /**
   * Render a page and return PDF bytes as an `ArrayBuffer`.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/pdf-endpoint/
   */
  readonly getPdf: (
    request: BrowserRunPdfRequest,
    query?: BrowserRunPdfQuery,
  ) => Effect.Effect<BrowserRunPdfResult, BrowserRunPdfError>;

  /**
   * Render a page and return screenshot bytes as an `ArrayBuffer`.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/screenshot-endpoint/
   */
  readonly getScreenshot: (
    request: BrowserRunScreenshotRequest,
    query?: BrowserRunScreenshotQuery,
  ) => Effect.Effect<BrowserRunScreenshotResult, BrowserRunScreenshotError>;

  /**
   * Render a page and return both HTML content and a base64 screenshot.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/snapshot/
   */
  readonly getSnapshot: (
    request: BrowserRunSnapshotRequest,
    query?: BrowserRunSnapshotQuery,
  ) => Effect.Effect<BrowserRunSnapshotResult, BrowserRunSnapshotError>;

  /**
   * Extract links from a rendered page.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/links-endpoint/
   */
  readonly getLinks: (
    request: BrowserRunLinksRequest,
    query?: BrowserRunLinksQuery,
  ) => Effect.Effect<BrowserRunLinksResult, BrowserRunLinksError>;

  /**
   * Scrape selected DOM elements and return text, HTML, attributes, and geometry.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/scrape-endpoint/
   */
  readonly getScrape: (
    request: BrowserRunScrapeRequest,
    query?: BrowserRunScrapeQuery,
  ) => Effect.Effect<BrowserRunScrapeResult, BrowserRunScrapeError>;

  /**
   * Extract structured JSON using Browser Run's AI-backed `/json` endpoint.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/json-endpoint/
   */
  readonly getJson: (
    request: BrowserRunJsonRequest,
    query?: BrowserRunJsonQuery,
  ) => Effect.Effect<BrowserRunJsonResult, BrowserRunJsonError>;

  /**
   * Extract structured JSON and decode it with the provided Effect Schema codec.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/json-endpoint/
   */
  readonly getJsonWithSchema: <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    request: BrowserRunJsonRequest,
    query?: BrowserRunJsonQuery,
  ) => Effect.Effect<T, BrowserRunJsonError, RD>;

  /**
   * Start an asynchronous crawl job and return the branded job id.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  readonly startCrawl: (
    request: BrowserRunCrawlRequest,
    query?: BrowserRunCrawlQuery,
  ) => Effect.Effect<BrowserRunCrawlJobId, BrowserRunCrawlError>;

  /**
   * Start a crawl job with JSON format enabled and a schema-backed response format.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  readonly startCrawlWithSchema: <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    request: BrowserRunCrawlRequest,
    query?: BrowserRunCrawlQuery,
  ) => Effect.Effect<BrowserRunCrawlJobId, BrowserRunCrawlError>;

  /**
   * Decode JSON payloads from crawl records with the provided Effect Schema codec.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  readonly decodeCrawlRecordsJson: <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    records: ReadonlyArray<BrowserRunCrawlJobResult["records"][number]>,
  ) => Effect.Effect<
    Array<{
      readonly record: BrowserRunCrawlJobResult["records"][number];
      readonly value: T;
    }>,
    BrowserRunSchemaError,
    RD
  >;

  /**
   * Fetch crawl job status and paginated records.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  readonly getCrawlResult: (
    jobId: BrowserRunCrawlJobId,
    query?: BrowserRunCrawlResultQuery,
  ) => Effect.Effect<BrowserRunCrawlJobResult, BrowserRunCrawlError>;

  /**
   * Cancel a running crawl job.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  readonly cancelCrawl: (
    jobId: BrowserRunCrawlJobId,
  ) => Effect.Effect<BrowserRunCancelCrawlResult, BrowserRunCrawlError>;
}

export class BrowserRunConfig extends Context.Service<
  BrowserRunConfig,
  {
    readonly accountId: string;
    readonly apiKey: Redacted.Redacted;
    readonly baseUrl: string;
  }
>()("@siebix/cloudflare-browser-run-effect/BrowserRunConfig") {
  /** Reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_BROWSER_RUN_API_KEY` from Effect Config. */
  static readonly layer = Layer.effect(
    BrowserRunConfig,
    Effect.gen(function* () {
      const accountId = yield* Config.string("CLOUDFLARE_ACCOUNT_ID");
      const apiKey = yield* Config.redacted("CLOUDFLARE_BROWSER_RUN_API_KEY");
      const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering`;

      return BrowserRunConfig.of({ accountId, apiKey, baseUrl });
    }),
  );
}

const make = Effect.gen(function* () {
  const { apiKey, baseUrl } = yield* BrowserRunConfig;
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(
      flow(
        HttpClientRequest.prependUrl(baseUrl),
        HttpClientRequest.bearerToken(apiKey),
      ),
    ),
  );

  const encodeJsonBody =
    <S extends Schema.Top>(schema: S, body: S["Type"]) =>
    (request: HttpClientRequest.HttpClientRequest) =>
      request.pipe(
        HttpClientRequest.schemaBodyJson(schema)(body),
        Effect.mapError((cause) => BrowserRunSchemaError.make({ cause })),
      );

  const execute = (request: HttpClientRequest.HttpClientRequest) =>
    client
      .execute(request)
      .pipe(Effect.mapError((cause) => BrowserRunHttpError.make({ cause })));

  const executeOk = (
    endpoint: BrowserRunApiError["endpoint"],
    request: HttpClientRequest.HttpClientRequest,
  ) =>
    Effect.gen(function* () {
      const response = yield* execute(request);
      if (response.status >= 200 && response.status < 300) {
        return response;
      }

      const fallback = {
        success: false,
        errors: [
          {
            code: response.status,
            message: `HTTP ${response.status}`,
          },
        ],
      };
      const body = yield* decodeJsonBody(
        BrowserRunBinaryErrorResponse,
        response,
      ).pipe(Effect.catchCause(() => Effect.succeed(fallback)));

      return yield* BrowserRunApiError.make({
        endpoint,
        errors:
          body.errors !== undefined && body.errors.length > 0
            ? body.errors
            : fallback.errors,
      });
    });

  const decodeJsonBody = <S extends Schema.Top>(
    schema: S,
    response: HttpClientResponse.HttpClientResponse,
  ) =>
    response.json.pipe(
      Effect.mapError((cause) => BrowserRunHttpError.make({ cause })),
      Effect.flatMap((body) =>
        Schema.decodeUnknownEffect(schema)(body).pipe(
          Effect.mapError((cause) => BrowserRunSchemaError.make({ cause })),
        ),
      ),
    );

  const decodeCrawlJobId = (result: unknown) =>
    Effect.gen(function* () {
      const raw =
        typeof result === "string"
          ? result
          : typeof result === "object" && result !== null && "id" in result
            ? result.id
            : typeof result === "object" &&
                result !== null &&
                "job_id" in result
              ? result.job_id
              : typeof result === "object" &&
                  result !== null &&
                  "jobId" in result
                ? result.jobId
                : undefined;

      if (raw === undefined) {
        return yield* BrowserRunApiError.make({
          endpoint: "crawl",
          errors: [
            {
              message:
                "Cloudflare did not return a crawl job id in result, result.id, result.job_id, or result.jobId.",
            },
          ],
        });
      }

      return yield* Schema.decodeUnknownEffect(BrowserRunCrawlJobId)(raw).pipe(
        Effect.mapError((cause) => BrowserRunSchemaError.make({ cause })),
      );
    });

  /**
   * Render a page and return its HTML content.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/content-endpoint/
   */
  const getContent = Effect.fn("BrowserRunHttpService.getContent")(function* (
    request: BrowserRunContentRequest,
    query: BrowserRunContentQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/content", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunContentRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunContentResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "content",
        errors: response.errors ?? [],
        meta: response.meta,
      });
    }

    return response.result;
  });

  /**
   * Render a page and return Markdown.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/markdown-endpoint/
   */
  const getMarkdown = Effect.fn("BrowserRunHttpService.getMarkdown")(function* (
    request: BrowserRunMarkdownRequest,
    query: BrowserRunMarkdownQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/markdown", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunMarkdownRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunMarkdownResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "markdown",
        errors: response.errors ?? [],
      });
    }

    return response.result;
  });

  /**
   * Render a page and return PDF bytes as an `ArrayBuffer`.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/pdf-endpoint/
   */
  const getPdf = Effect.fn("BrowserRunHttpService.getPdf")(function* (
    request: BrowserRunPdfRequest,
    query: BrowserRunPdfQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/pdf", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunPdfRequest, request),
      Effect.flatMap((request) => executeOk("pdf", request)),
    );

    return yield* response.arrayBuffer.pipe(
      Effect.mapError((cause) => BrowserRunHttpError.make({ cause })),
    );
  });

  /**
   * Render a page and return both HTML content and a base64 screenshot.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/snapshot/
   */
  const getSnapshot = Effect.fn("BrowserRunHttpService.getSnapshot")(function* (
    request: BrowserRunSnapshotRequest,
    query: BrowserRunSnapshotQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/snapshot", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunSnapshotRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunSnapshotResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "snapshot",
        errors: response.errors ?? [],
        meta: response.meta,
      });
    }

    return response.result;
  });

  /**
   * Render a page and return screenshot bytes as an `ArrayBuffer`.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/screenshot-endpoint/
   */
  const getScreenshot = Effect.fn("BrowserRunHttpService.getScreenshot")(
    function* (
      request: BrowserRunScreenshotRequest,
      query: BrowserRunScreenshotQuery = {},
    ) {
      const response = yield* HttpClientRequest.post("/screenshot", {
        urlParams: query,
      }).pipe(
        encodeJsonBody(BrowserRunScreenshotRequest, request),
        Effect.flatMap((request) => executeOk("screenshot", request)),
      );

      return yield* response.arrayBuffer.pipe(
        Effect.mapError((cause) => BrowserRunHttpError.make({ cause })),
      );
    },
  );

  /**
   * Extract links from a rendered page.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/links-endpoint/
   */
  const getLinks = Effect.fn("BrowserRunHttpService.getLinks")(function* (
    request: BrowserRunLinksRequest,
    query: BrowserRunLinksQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/links", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunLinksRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunLinksResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "links",
        errors: response.errors ?? [],
      });
    }

    return response.result;
  });

  /**
   * Scrape selected DOM elements and return text, HTML, attributes, and geometry.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/scrape-endpoint/
   */
  const getScrape = Effect.fn("BrowserRunHttpService.getScrape")(function* (
    request: BrowserRunScrapeRequest,
    query: BrowserRunScrapeQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/scrape", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunScrapeRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunScrapeResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "scrape",
        errors: response.errors ?? [],
      });
    }

    return response.result;
  });

  /**
   * Extract structured JSON using Browser Run's AI-backed `/json` endpoint.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/json-endpoint/
   */
  const getJson = Effect.fn("BrowserRunHttpService.getJson")(function* (
    request: BrowserRunJsonRequest,
    query: BrowserRunJsonQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/json", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunJsonRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunJsonResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "json",
        errors: response.errors ?? [],
      });
    }

    return response.result;
  });

  /**
   * Extract structured JSON and decode it with the provided Effect Schema codec.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/json-endpoint/
   */
  const getJsonWithSchema = Effect.fn(
    "BrowserRunHttpService.getJsonWithSchema",
  )(function* <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    request: BrowserRunJsonRequest,
    query: BrowserRunJsonQuery = {},
  ) {
    const structuredOutput = yield* Effect.try({
      try: () => OpenAiStructuredOutput.toCodecOpenAI(schema),
      catch: (cause) => BrowserRunSchemaError.make({ cause }),
    });

    const result = yield* getJson(
      {
        ...request,
        response_format: {
          type: "json_schema",
          json_schema: structuredOutput.jsonSchema,
        },
      },
      query,
    );

    return yield* Schema.decodeUnknownEffect(structuredOutput.codec)(
      result,
    ).pipe(Effect.mapError((cause) => BrowserRunSchemaError.make({ cause })));
  });

  /**
   * Start an asynchronous crawl job and return the job id.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  const startCrawl = Effect.fn("BrowserRunHttpService.startCrawl")(function* (
    request: BrowserRunCrawlRequest,
    query: BrowserRunCrawlQuery = {},
  ) {
    const response = yield* HttpClientRequest.post("/crawl", {
      urlParams: query,
    }).pipe(
      encodeJsonBody(BrowserRunCrawlRequest, request),
      Effect.flatMap(execute),
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunStartCrawlResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "crawl",
        errors: response.errors ?? [],
      });
    }

    return yield* decodeCrawlJobId(response.result);
  });

  const withCrawlJsonResponseFormat = <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    request: BrowserRunCrawlRequest,
  ) =>
    Effect.gen(function* () {
      const structuredOutput = yield* Effect.try({
        try: () => OpenAiStructuredOutput.toCodecOpenAI(schema),
        catch: (cause) => BrowserRunSchemaError.make({ cause }),
      });

      const formats: NonNullable<BrowserRunCrawlRequest["formats"]> =
        request.formats !== undefined
          ? request.formats.includes("json")
            ? request.formats
            : [...request.formats, "json" as const]
          : ["json" as const];

      const merged: BrowserRunCrawlRequest = {
        ...request,
        formats,
        jsonOptions: {
          ...request.jsonOptions,
          response_format: {
            type: "json_schema",
            json_schema: structuredOutput.jsonSchema,
          },
        },
      };

      return merged;
    });

  /**
   * Start a crawl job with JSON format enabled and a schema-backed response format.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  const startCrawlWithSchema = Effect.fn(
    "BrowserRunHttpService.startCrawlWithSchema",
  )(function* <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    request: BrowserRunCrawlRequest,
    query: BrowserRunCrawlQuery = {},
  ) {
    const merged = yield* withCrawlJsonResponseFormat(schema, request);
    return yield* startCrawl(merged, query);
  });

  /**
   * Decode JSON payloads from crawl records with the provided Effect Schema codec.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  const decodeCrawlRecordsJson = Effect.fn(
    "BrowserRunHttpService.decodeCrawlRecordsJson",
  )(function* <T, E, RD, RE>(
    schema: Schema.Codec<T, E, RD, RE>,
    records: ReadonlyArray<BrowserRunCrawlJobResult["records"][number]>,
  ) {
    const structuredOutput = yield* Effect.try({
      try: () => OpenAiStructuredOutput.toCodecOpenAI(schema),
      catch: (cause) => BrowserRunSchemaError.make({ cause }),
    });

    const decoded = [] as Array<{
      record: BrowserRunCrawlJobResult["records"][number];
      value: T;
    }>;

    for (const record of records) {
      if (record.json === undefined) {
        continue;
      }
      const value = yield* Schema.decodeUnknownEffect(structuredOutput.codec)(
        record.json,
      ).pipe(Effect.mapError((cause) => BrowserRunSchemaError.make({ cause })));
      decoded.push({ record, value });
    }

    return decoded;
  });

  /**
   * Fetch crawl job status and paginated records.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  const getCrawlResult = Effect.fn("BrowserRunHttpService.getCrawlResult")(
    function* (
      jobId: BrowserRunCrawlJobId,
      query: BrowserRunCrawlResultQuery = {},
    ) {
      const response = yield* HttpClientRequest.get(
        `/crawl/${encodeURIComponent(jobId)}`,
        { urlParams: query },
      ).pipe(
        execute,
        Effect.flatMap((response) =>
          decodeJsonBody(BrowserRunGetCrawlResponse, response),
        ),
      );

      if (!response.success || response.result === undefined) {
        return yield* BrowserRunApiError.make({
          endpoint: "crawlResult",
          errors: response.errors ?? [],
        });
      }

      return response.result;
    },
  );

  /**
   * Cancel a running crawl job.
   *
   * @see https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
   */
  const cancelCrawl = Effect.fn("BrowserRunHttpService.cancelCrawl")(function* (
    jobId: BrowserRunCrawlJobId,
  ) {
    const response = yield* HttpClientRequest.delete(
      `/crawl/${encodeURIComponent(jobId)}`,
    ).pipe(
      execute,
      Effect.flatMap((response) =>
        decodeJsonBody(BrowserRunCancelCrawlResponse, response),
      ),
    );

    if (!response.success || response.result === undefined) {
      return yield* BrowserRunApiError.make({
        endpoint: "cancelCrawl",
        errors: response.errors ?? [],
      });
    }

    return response.result;
  });

  return {
    getContent,
    getMarkdown,
    getPdf,
    getSnapshot,
    getScreenshot,
    getLinks,
    getScrape,
    getJson,
    getJsonWithSchema,
    startCrawl,
    startCrawlWithSchema,
    decodeCrawlRecordsJson,
    getCrawlResult,
    cancelCrawl,
  };
});

export class BrowserRunHttpService extends Context.Service<
  BrowserRunHttpService,
  BrowserRunHttpServiceApi
>()("@siebix/cloudflare-browser-run-effect/BrowserRunHttpService") {
  /** Service layer that expects `BrowserRunConfig` and `HttpClient.HttpClient` to be provided. */
  static readonly layerNoDeps = Layer.effect(BrowserRunHttpService, make);
  /** Default service layer backed by the Fetch HTTP client and environment config. */
  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(BrowserRunConfig.layer),
  );
}
