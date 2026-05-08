import { Context, Effect, Layer, Schema } from "effect";
import type {
  CreateEmailOptions,
  CreateEmailRequestOptions,
  ListEmailsOptions,
} from "resend";
import { ResendClient, type ResendEmailsClient } from "./resend-client.service";
import {
  decodeResendResponse,
  type ResendError,
  ResendSdkError,
} from "./resend-errors";

export type {
  CancelEmailResponse as ResendCancelEmailResponse,
  CreateEmailOptions as ResendCreateEmailOptions,
  CreateEmailRequestOptions as ResendCreateEmailRequestOptions,
  CreateEmailResponse as ResendCreateEmailResponse,
  GetEmailResponse as ResendGetEmailResponse,
  ListEmailsOptions as ResendListEmailsOptions,
  ListEmailsResponse as ResendListEmailsResponse,
  UpdateEmailOptions as ResendUpdateEmailSdkOptions,
  UpdateEmailResponse as ResendUpdateEmailResponse,
} from "resend";

export const ResendEmailId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("ResendEmailId"),
);
export type ResendEmailId = typeof ResendEmailId.Type;

export const ResendSendEmailResult = Schema.Struct({
  id: ResendEmailId,
});
export type ResendSendEmailResult = typeof ResendSendEmailResult.Type;

export const ResendEmailEvent = Schema.Literals([
  "bounced",
  "canceled",
  "clicked",
  "complained",
  "delivered",
  "delivery_delayed",
  "failed",
  "opened",
  "queued",
  "scheduled",
  "sent",
  "suppressed",
]);
export type ResendEmailEvent = typeof ResendEmailEvent.Type;

export const ResendEmailTag = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
});
export type ResendEmailTag = typeof ResendEmailTag.Type;

const ResendEmailBase = {
  bcc: Schema.NullOr(Schema.Array(Schema.String)),
  cc: Schema.NullOr(Schema.Array(Schema.String)),
  created_at: Schema.String,
  from: Schema.String,
  id: ResendEmailId,
  last_event: ResendEmailEvent,
  reply_to: Schema.NullOr(Schema.Array(Schema.String)),
  scheduled_at: Schema.NullOr(Schema.String),
  subject: Schema.String,
  to: Schema.Array(Schema.String),
  topic_id: Schema.optional(Schema.NullOr(Schema.String)),
};

export const ResendEmail = Schema.Struct({
  ...ResendEmailBase,
  html: Schema.NullOr(Schema.String),
  object: Schema.Literal("email"),
  tags: Schema.optional(Schema.Array(ResendEmailTag)),
  text: Schema.NullOr(Schema.String),
});
export type ResendEmail = typeof ResendEmail.Type;

export const ResendListEmail = Schema.Struct(ResendEmailBase);
export type ResendListEmail = typeof ResendListEmail.Type;

export const ResendListEmailsResult = Schema.Struct({
  object: Schema.Literal("list"),
  has_more: Schema.Boolean,
  data: Schema.Array(ResendListEmail),
});
export type ResendListEmailsResult = typeof ResendListEmailsResult.Type;

export const ResendUpdateEmailOptions = Schema.Struct({
  id: ResendEmailId,
  scheduledAt: Schema.String,
});
export type ResendUpdateEmailOptions = typeof ResendUpdateEmailOptions.Type;

export const ResendUpdateEmailResult = Schema.Struct({
  id: ResendEmailId,
  object: Schema.Literal("email"),
});
export type ResendUpdateEmailResult = typeof ResendUpdateEmailResult.Type;

export const ResendCancelEmailResult = ResendUpdateEmailResult;
export type ResendCancelEmailResult = typeof ResendCancelEmailResult.Type;

export type ResendEmailError = ResendError;
export type ResendSendEmailError = ResendEmailError;
export type ResendGetEmailError = ResendEmailError;
export type ResendListEmailsError = ResendEmailError;
export type ResendUpdateEmailError = ResendEmailError;
export type ResendCancelEmailError = ResendEmailError;

export interface ResendEmailsApi {
  /** Cancel a scheduled email. */
  readonly cancel: (
    id: ResendEmailId,
  ) => Effect.Effect<ResendCancelEmailResult, ResendCancelEmailError>;

  /** Retrieve an email by id. */
  readonly get: (
    id: ResendEmailId,
  ) => Effect.Effect<ResendEmail, ResendGetEmailError>;

  /** List sent emails. */
  readonly list: (
    options?: ListEmailsOptions,
  ) => Effect.Effect<ResendListEmailsResult, ResendListEmailsError>;

  /** Send an email through `resend.emails.send`. */
  readonly send: (
    payload: CreateEmailOptions,
    options?: CreateEmailRequestOptions,
  ) => Effect.Effect<ResendSendEmailResult, ResendSendEmailError>;

  /** Update a scheduled email. */
  readonly update: (
    payload: ResendUpdateEmailOptions,
  ) => Effect.Effect<ResendUpdateEmailResult, ResendUpdateEmailError>;
}

const makeFromClient = (client: ResendEmailsClient): ResendEmailsApi => {
  const cancel = Effect.fn("ResendEmails.cancel")(function* (
    id: ResendEmailId,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.cancel(id),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendCancelEmailResult, response);
  });

  const get = Effect.fn("ResendEmails.get")(function* (id: ResendEmailId) {
    const response = yield* Effect.tryPromise({
      try: () => client.get(id),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendEmail, response);
  });

  const list = Effect.fn("ResendEmails.list")(function* (
    options?: ListEmailsOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.list(options),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendListEmailsResult, response);
  });

  const send = Effect.fn("ResendEmails.send")(function* (
    payload: CreateEmailOptions,
    options?: CreateEmailRequestOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.send({ ...payload }, options),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendSendEmailResult, response);
  });

  const update = Effect.fn("ResendEmails.update")(function* (
    payload: ResendUpdateEmailOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.update(payload),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendUpdateEmailResult, response);
  });

  return { cancel, get, list, send, update };
};

const make = Effect.gen(function* () {
  const { client } = yield* ResendClient;
  return makeFromClient(client.emails);
});

export class ResendEmails extends Context.Service<
  ResendEmails,
  ResendEmailsApi
>()("@siebix/resend-effect/ResendEmails") {
  /** Email service layer backed by the shared `ResendClient`. */
  static readonly layer = Layer.effect(ResendEmails, make);
}
