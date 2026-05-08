import { Context, Effect, Layer, Schema } from "effect";
import type {
  CreateContactOptions,
  CreateContactRequestOptions,
  GetContactOptions,
  RemoveContactOptions,
  UpdateContactOptions,
} from "resend";
import {
  ResendClient,
  type ResendContactsClient,
} from "./resend-client.service";
import {
  decodeResendResponse,
  type ResendError,
  ResendSdkError,
} from "./resend-errors";

export type {
  CreateContactOptions as ResendCreateContactOptions,
  CreateContactRequestOptions as ResendCreateContactRequestOptions,
  CreateContactResponse as ResendCreateContactResponse,
  GetContactOptions as ResendGetContactSdkOptions,
  GetContactResponse as ResendGetContactResponse,
  ListContactsOptions as ResendListContactsSdkOptions,
  ListContactsResponse as ResendListContactsResponse,
  RemoveContactOptions as ResendRemoveContactSdkOptions,
  RemoveContactsResponse as ResendRemoveContactResponse,
  UpdateContactOptions as ResendUpdateContactSdkOptions,
  UpdateContactResponse as ResendUpdateContactResponse,
} from "resend";

export const ResendContactId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("ResendContactId"),
);
export type ResendContactId = typeof ResendContactId.Type;

export const ResendContact = Schema.Struct({
  created_at: Schema.String,
  email: Schema.String,
  first_name: Schema.NullOr(Schema.String),
  id: ResendContactId,
  last_name: Schema.NullOr(Schema.String),
  unsubscribed: Schema.Boolean,
});
export type ResendContact = typeof ResendContact.Type;

export const ResendContactPropertyValue = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("string"),
    value: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("number"),
    value: Schema.Number,
  }),
  Schema.String,
  Schema.Number,
  Schema.Null,
]);
export type ResendContactPropertyValue = typeof ResendContactPropertyValue.Type;

export const ResendContactProperties = Schema.Record(
  Schema.String,
  ResendContactPropertyValue,
);
export type ResendContactProperties = typeof ResendContactProperties.Type;

export const ResendGetContactResult = Schema.Struct({
  created_at: Schema.String,
  email: Schema.String,
  first_name: Schema.NullOr(Schema.String),
  id: ResendContactId,
  last_name: Schema.NullOr(Schema.String),
  object: Schema.Literal("contact"),
  properties: ResendContactProperties,
  unsubscribed: Schema.Boolean,
});
export type ResendGetContactResult = typeof ResendGetContactResult.Type;

export const ResendListContactsResult = Schema.Struct({
  object: Schema.Literal("list"),
  data: Schema.Array(ResendContact),
  has_more: Schema.Boolean,
});
export type ResendListContactsResult = typeof ResendListContactsResult.Type;

export const ResendCreateContactResult = Schema.Struct({
  id: ResendContactId,
  object: Schema.Literal("contact"),
});
export type ResendCreateContactResult = typeof ResendCreateContactResult.Type;

export const ResendUpdateContactResult = ResendCreateContactResult;
export type ResendUpdateContactResult = typeof ResendUpdateContactResult.Type;

export const ResendRemoveContactResult = Schema.Struct({
  object: Schema.Literal("contact"),
  deleted: Schema.Boolean,
  contact: Schema.String.check(Schema.isMinLength(1)),
});
export type ResendRemoveContactResult = typeof ResendRemoveContactResult.Type;

export type ResendContactSelector =
  | {
      readonly id: ResendContactId;
      readonly email?: undefined | null;
    }
  | {
      readonly id?: undefined | null;
      readonly email: string;
    };

export type ResendGetContactOptions = ResendContactId | ResendContactSelector;
type ResendPaginationOptions = {
  limit?: number;
} & (
  | {
      after?: string;
      before?: never;
    }
  | {
      before?: string;
      after?: never;
    }
);
export type ResendListContactsOptions = ResendPaginationOptions & {
  segmentId?: string;
};
export type ResendRemoveContactOptions =
  | ResendContactId
  | ResendContactSelector;
export type ResendUpdateContactOptions = ResendContactSelector & {
  readonly unsubscribed?: boolean;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly properties?: Record<string, string | number | null>;
};

export type ResendContactError = ResendError;
export type ResendCreateContactError = ResendContactError;
export type ResendGetContactError = ResendContactError;
export type ResendListContactsError = ResendContactError;
export type ResendUpdateContactError = ResendContactError;
export type ResendRemoveContactError = ResendContactError;

export interface ResendContactsApi {
  readonly create: (
    payload: CreateContactOptions,
    options?: CreateContactRequestOptions,
  ) => Effect.Effect<ResendCreateContactResult, ResendCreateContactError>;

  readonly get: (
    options: ResendGetContactOptions,
  ) => Effect.Effect<ResendGetContactResult, ResendGetContactError>;

  readonly list: (
    options?: ResendListContactsOptions,
  ) => Effect.Effect<ResendListContactsResult, ResendListContactsError>;

  readonly remove: (
    options: ResendRemoveContactOptions,
  ) => Effect.Effect<ResendRemoveContactResult, ResendRemoveContactError>;

  readonly update: (
    options: ResendUpdateContactOptions,
  ) => Effect.Effect<ResendUpdateContactResult, ResendUpdateContactError>;
}

const makeFromClient = (client: ResendContactsClient): ResendContactsApi => {
  const create = Effect.fn("ResendContacts.create")(function* (
    payload: CreateContactOptions,
    options?: CreateContactRequestOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.create(payload, options),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendCreateContactResult, response);
  });

  const get = Effect.fn("ResendContacts.get")(function* (
    options: ResendGetContactOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.get(options as GetContactOptions),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendGetContactResult, response);
  });

  const list = Effect.fn("ResendContacts.list")(function* (
    options?: ResendListContactsOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.list(options),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendListContactsResult, response);
  });

  const remove = Effect.fn("ResendContacts.remove")(function* (
    options: ResendRemoveContactOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.remove(options as RemoveContactOptions),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendRemoveContactResult, response);
  });

  const update = Effect.fn("ResendContacts.update")(function* (
    options: ResendUpdateContactOptions,
  ) {
    const response = yield* Effect.tryPromise({
      try: () => client.update(options as UpdateContactOptions),
      catch: (cause) => ResendSdkError.make({ cause }),
    });

    return yield* decodeResendResponse(ResendUpdateContactResult, response);
  });

  return { create, get, list, remove, update };
};

const make = Effect.gen(function* () {
  const { client } = yield* ResendClient;
  return makeFromClient(client.contacts);
});

export class ResendContacts extends Context.Service<
  ResendContacts,
  ResendContactsApi
>()("@siebix/resend-effect/ResendContacts") {
  /** Contacts service layer backed by the shared `ResendClient`. */
  static readonly layer = Layer.effect(ResendContacts, make);
}
