# @siebix/resend-effect

Effect services and schemas for Resend.

Created by [Siebix](https://siebix.com).

## Beta Status

This package targets Effect v4 beta. Treat the public API as beta until Effect
v4 stabilizes.

## Install

```sh
bun add @siebix/resend-effect effect
```

## Configuration

The shared client layer reads `RESEND_API_KEY` through Effect Config by default.

```ts
import { Effect } from "effect";
import { ResendEmails, ResendLayerConfig } from "@siebix/resend-effect";

const program = Effect.gen(function* () {
  const emails = yield* ResendEmails;

  return yield* emails.send({
    from: "Siebix <hello@siebix.com>",
    to: "user@example.com",
    subject: "Hello",
    text: "It works.",
  });
});

const result = await Effect.runPromise(
  program.pipe(Effect.provide(ResendLayerConfig())),
);
```

For direct values:

```ts
import { Redacted } from "effect";
import { ResendLayer } from "@siebix/resend-effect";

export const ResendLive = ResendLayer({
  apiKey: Redacted.make("re_..."),
});
```

For custom config names:

```ts
import { Config } from "effect";
import { ResendLayerConfig } from "@siebix/resend-effect";

export const ResendLive = ResendLayerConfig({
  apiKey: Config.redacted("MY_RESEND_API_KEY"),
});
```

`ResendLayer(...)` and `ResendLayerConfig(...)` provide both `ResendEmails` and
`ResendContacts`.

## Emails

```ts
import { Effect } from "effect";
import { ResendEmails } from "@siebix/resend-effect";

const program = Effect.gen(function* () {
  const emails = yield* ResendEmails;

  const sent = yield* emails.send(
    {
      from: "Siebix <hello@siebix.com>",
      to: "user@example.com",
      subject: "Hello",
      text: "It works.",
    },
    { idempotencyKey: "welcome-user-1" },
  );

  return yield* emails.get(sent.id);
});
```

`emails.send` decodes the Resend response before returning, so `sent.id` is
already a `ResendEmailId`. Decode ids only at untyped boundaries, such as route
params, form data, or persisted strings.

Methods:

| Method | SDK call | Result |
| --- | --- | --- |
| `send(payload, options?)` | `emails.send` | `{ id: ResendEmailId }` |
| `get(id)` | `emails.get` | full email record |
| `list(options?)` | `emails.list` | paginated email list |
| `update(payload)` | `emails.update` | `{ id, object: "email" }` |
| `cancel(id)` | `emails.cancel` | `{ id, object: "email" }` |

The send payload type is re-exported from the Resend SDK as
`ResendCreateEmailOptions`, so HTML, text, template, attachments, and React
email payloads follow the upstream SDK shape.

## Contacts

```ts
import { Effect } from "effect";
import { ResendContacts } from "@siebix/resend-effect";

const program = Effect.gen(function* () {
  const contacts = yield* ResendContacts;

  const created = yield* contacts.create({
    email: "user@example.com",
    firstName: "Siebe",
    properties: {
      plan: "pro",
    },
    segments: [{ id: "segment-1" }],
  });

  return yield* contacts.get(created.id);
});
```

Methods:

| Method | SDK call | Result |
| --- | --- | --- |
| `create(payload, options?)` | `contacts.create` | `{ id, object: "contact" }` |
| `get(idOrSelector)` | `contacts.get` | full contact record |
| `list(options?)` | `contacts.list` | paginated contact list |
| `update(payload)` | `contacts.update` | `{ id, object: "contact" }` |
| `remove(idOrSelector)` | `contacts.remove` | deletion result |

This package intentionally exposes segment-aware contact creation and listing,
but not Resend's deprecated `audiences` alias. Contact segment membership and
topics can be added as a later resource slice.

### Current limitations

- `contacts.create` and `contacts.update` still follow the official SDK payload
  shape for `properties` (`Record<string, string | number | null>`).
- `contacts.get` accepts both documented response formats for `properties`, including
  raw values like `{ "company_name": "Acme Corp" }`, and the `{ type, value }`
  object form used by the SDK type aliases.
- The upstream `resend` package types for `GetContactResponse` still model
  `properties` as structured values, so typed consumers may still need casting at
  integration boundaries if they pass raw fixture/object data through those
  types.

## Errors

Email and contact methods return typed failures:

- `ResendValidationError`
- `ResendAuthError`
- `ResendRateLimitError`
- `ResendNotFoundError`
- `ResendIdempotencyError`
- `ResendApplicationError`
- `ResendUnexpectedApiError`
- `ResendSdkError`
- `ResendSchemaError`

Use `Effect.catchTag` or `Effect.catchTags` to recover by error category.

## Package

- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)
