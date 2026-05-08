import { Config, Context, Effect, Layer, Redacted } from "effect";
import {
  type CancelEmailResponse,
  type CreateContactOptions,
  type CreateContactRequestOptions,
  type CreateContactResponse,
  type CreateEmailOptions,
  type CreateEmailRequestOptions,
  type CreateEmailResponse,
  type GetContactOptions,
  type GetContactResponse,
  type GetEmailResponse,
  type ListContactsOptions,
  type ListContactsResponse,
  type ListEmailsOptions,
  type ListEmailsResponse,
  type RemoveContactOptions,
  type RemoveContactsResponse,
  Resend,
  type UpdateContactOptions,
  type UpdateContactResponse,
  type UpdateEmailOptions,
  type UpdateEmailResponse,
} from "resend";
import { ResendSdkError } from "./resend-errors";

export interface ResendEmailsClient {
  readonly cancel: (id: string) => Promise<CancelEmailResponse>;
  readonly get: (id: string) => Promise<GetEmailResponse>;
  readonly list: (options?: ListEmailsOptions) => Promise<ListEmailsResponse>;
  readonly send: (
    payload: CreateEmailOptions,
    options?: CreateEmailRequestOptions,
  ) => Promise<CreateEmailResponse>;
  readonly update: (
    payload: UpdateEmailOptions,
  ) => Promise<UpdateEmailResponse>;
}

export interface ResendContactsClient {
  readonly create: (
    payload: CreateContactOptions,
    options?: CreateContactRequestOptions,
  ) => Promise<CreateContactResponse>;
  readonly get: (options: GetContactOptions) => Promise<GetContactResponse>;
  readonly list: (
    options?: ListContactsOptions,
  ) => Promise<ListContactsResponse>;
  readonly remove: (
    payload: RemoveContactOptions,
  ) => Promise<RemoveContactsResponse>;
  readonly update: (
    payload: UpdateContactOptions,
  ) => Promise<UpdateContactResponse>;
}

export interface ResendSdkClient {
  readonly contacts: ResendContactsClient;
  readonly emails: ResendEmailsClient;
}

export interface ResendClientOptions {
  readonly apiKey: Redacted.Redacted;
}

export interface ResendClientLayerConfigOptions {
  readonly apiKey?: Config.Config<Redacted.Redacted>;
}

class ResendClientConfig extends Context.Service<
  ResendClientConfig,
  {
    readonly apiKey: Redacted.Redacted;
  }
>()("@siebix/resend-effect/ResendClientConfig") {
  /** Reads `RESEND_API_KEY` from Effect Config by default. */
  static readonly layerConfig = (options?: ResendClientLayerConfigOptions) =>
    Layer.effect(
      ResendClientConfig,
      Effect.gen(function* () {
        const apiKey = yield* options?.apiKey ??
          Config.redacted("RESEND_API_KEY");

        return ResendClientConfig.of({ apiKey });
      }),
    );

  /** Creates a config layer from direct values. */
  static readonly layer = (options: ResendClientOptions) =>
    Layer.succeed(ResendClientConfig, ResendClientConfig.of(options));
}

const make = Effect.gen(function* () {
  const { apiKey } = yield* ResendClientConfig;
  const client = yield* Effect.try({
    try: () => new Resend(Redacted.value(apiKey)) as ResendSdkClient,
    catch: (cause) => ResendSdkError.make({ cause }),
  });

  return ResendClient.of({ client });
});

export class ResendClient extends Context.Service<
  ResendClient,
  {
    readonly client: ResendSdkClient;
  }
>()("@siebix/resend-effect/ResendClient") {
  /** Shared SDK client layer backed by direct config values. */
  static readonly layer = (options: ResendClientOptions) =>
    Layer.effect(ResendClient, make).pipe(
      Layer.provide(ResendClientConfig.layer(options)),
    );

  /** Shared SDK client layer backed by configurable Effect Config values. */
  static readonly layerConfig = (options?: ResendClientLayerConfigOptions) =>
    Layer.effect(ResendClient, make).pipe(
      Layer.provide(ResendClientConfig.layerConfig(options)),
    );
}
