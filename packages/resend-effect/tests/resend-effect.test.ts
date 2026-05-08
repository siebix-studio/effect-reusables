import {
  Config,
  ConfigProvider,
  Effect,
  Layer,
  Redacted,
  Result,
  Schema,
} from "effect";
import { describe, expect, it } from "vitest";
import {
  ResendAuthError,
  ResendClient,
  ResendContactId,
  ResendContacts,
  type ResendContactsClient,
  ResendEmailId,
  ResendEmails,
  type ResendEmailsClient,
  type ResendGetContactResponse,
  ResendLayer,
  ResendLayerConfig,
  ResendSchemaError,
  type ResendSdkClient,
  ResendSdkError,
  ResendValidationError,
} from "../src/index.ts";

const email = {
  from: "Siebix <hello@siebix.com>",
  to: "user@example.com",
  subject: "Hello",
  text: "It works.",
} as const;

const emailId = Schema.decodeUnknownSync(ResendEmailId)("email-1");
const contactId = Schema.decodeUnknownSync(ResendContactId)("contact-1");

const storedEmail = {
  bcc: null,
  cc: null,
  created_at: "2026-05-08T09:00:00.000Z",
  from: email.from,
  html: null,
  id: emailId,
  last_event: "sent" as const,
  object: "email" as const,
  reply_to: null,
  scheduled_at: null,
  subject: email.subject,
  tags: [{ name: "kind", value: "test" }],
  text: email.text,
  to: [email.to],
};

const listedEmail = {
  bcc: null,
  cc: null,
  created_at: storedEmail.created_at,
  from: storedEmail.from,
  id: emailId,
  last_event: storedEmail.last_event,
  reply_to: null,
  scheduled_at: null,
  subject: storedEmail.subject,
  to: storedEmail.to,
};

const storedContact = {
  created_at: "2026-05-08T09:00:00.000Z",
  email: "user@example.com",
  first_name: "Siebe",
  id: contactId,
  last_name: null,
  object: "contact" as const,
  properties: {
    plan: { type: "string" as const, value: "pro" },
    seats: { type: "number" as const, value: 3 },
  },
  unsubscribed: false,
};

const storedContactWithRawProperties = {
  ...storedContact,
  properties: {
    company_name: "Acme Corp",
    seats: 3,
  },
};

const listedContact = {
  created_at: storedContact.created_at,
  email: storedContact.email,
  first_name: storedContact.first_name,
  id: contactId,
  last_name: storedContact.last_name,
  unsubscribed: storedContact.unsubscribed,
};

const notImplemented = async (): Promise<never> => {
  throw new Error("not implemented");
};

const makeEmailsClient = (
  client: Partial<ResendEmailsClient>,
): ResendEmailsClient => ({
  cancel: client.cancel ?? notImplemented,
  get: client.get ?? notImplemented,
  list: client.list ?? notImplemented,
  send: client.send ?? notImplemented,
  update: client.update ?? notImplemented,
});

const makeContactsClient = (
  client: Partial<ResendContactsClient>,
): ResendContactsClient => ({
  create: client.create ?? notImplemented,
  get: client.get ?? notImplemented,
  list: client.list ?? notImplemented,
  remove: client.remove ?? notImplemented,
  update: client.update ?? notImplemented,
});

const makeSdkClient = (client: {
  readonly contacts?: ResendContactsClient;
  readonly emails?: ResendEmailsClient;
}): ResendSdkClient => ({
  contacts: client.contacts ?? makeContactsClient({}),
  emails: client.emails ?? makeEmailsClient({}),
});

const layerFromSdkClient = (client: ResendSdkClient) =>
  Layer.succeed(ResendClient, ResendClient.of({ client }));

const provideEmailsClient = (client: ResendEmailsClient) =>
  ResendEmails.layer.pipe(
    Layer.provide(layerFromSdkClient(makeSdkClient({ emails: client }))),
  );

const provideContactsClient = (client: ResendContactsClient) =>
  ResendContacts.layer.pipe(
    Layer.provide(layerFromSdkClient(makeSdkClient({ contacts: client }))),
  );

const sendEmail = (client: ResendEmailsClient) =>
  Effect.gen(function* () {
    const emails = yield* ResendEmails;
    return yield* emails.send(email);
  }).pipe(Effect.provide(provideEmailsClient(client)));

describe("Resend schemas", () => {
  it("brands non-empty email ids", () => {
    const result = Schema.decodeUnknownResult(ResendEmailId)("email-1");

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("rejects empty email ids", () => {
    const result = Schema.decodeUnknownResult(ResendEmailId)("");

    expect(Result.isFailure(result)).toBe(true);
  });

  it("brands non-empty contact ids", () => {
    const result = Schema.decodeUnknownResult(ResendContactId)("contact-1");

    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("ResendEmails", () => {
  it("sends an email and returns the branded id", async () => {
    const calls: Array<typeof email> = [];
    const client = makeEmailsClient({
      send: async (payload) => {
        calls.push(payload as typeof email);
        return {
          data: { id: "email-1" },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(sendEmail(client));

    expect(result.id).toBe("email-1");
    expect(calls).toEqual([email]);
  });

  it("passes Resend request options through to the SDK", async () => {
    const options = { idempotencyKey: "key-1" };
    const seen: Array<unknown> = [];
    const client = makeEmailsClient({
      send: async (_payload, requestOptions) => {
        seen.push(requestOptions);
        return {
          data: { id: "email-1" },
          error: null,
          headers: null,
        };
      },
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        return yield* emails.send(email, options);
      }).pipe(Effect.provide(provideEmailsClient(client))),
    );

    expect(seen).toEqual([options]);
  });

  it("does not let SDK payload mutation leak back to callers", async () => {
    const payload = { ...email };
    const client = makeEmailsClient({
      send: async (received) => {
        (received as { subject: string }).subject = "Mutated by SDK";
        return {
          data: { id: "email-1" },
          error: null,
          headers: null,
        };
      },
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        return yield* emails.send(payload);
      }).pipe(Effect.provide(provideEmailsClient(client))),
    );

    expect(payload.subject).toBe("Hello");
  });

  it("gets an email by id", async () => {
    const seen: Array<string> = [];
    const client = makeEmailsClient({
      get: async (id) => {
        seen.push(id);
        return {
          data: storedEmail,
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        return yield* emails.get(emailId);
      }).pipe(Effect.provide(provideEmailsClient(client))),
    );

    expect(result.id).toBe(emailId);
    expect(result.tags).toEqual([{ name: "kind", value: "test" }]);
    expect(seen).toEqual([emailId]);
  });

  it("lists emails with pagination options", async () => {
    const options = { limit: 1 };
    const seen: Array<unknown> = [];
    const client = makeEmailsClient({
      list: async (listOptions) => {
        seen.push(listOptions);
        return {
          data: {
            object: "list",
            has_more: false,
            data: [listedEmail],
          },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        return yield* emails.list(options);
      }).pipe(Effect.provide(provideEmailsClient(client))),
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(emailId);
    expect(seen).toEqual([options]);
  });

  it("updates a scheduled email", async () => {
    const payload = {
      id: emailId,
      scheduledAt: "2026-05-08T10:00:00.000Z",
    };
    const seen: Array<unknown> = [];
    const client = makeEmailsClient({
      update: async (updatePayload) => {
        seen.push(updatePayload);
        return {
          data: { id: emailId, object: "email" },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        return yield* emails.update(payload);
      }).pipe(Effect.provide(provideEmailsClient(client))),
    );

    expect(result.id).toBe(emailId);
    expect(seen).toEqual([payload]);
  });

  it("cancels a scheduled email", async () => {
    const seen: Array<string> = [];
    const client = makeEmailsClient({
      cancel: async (id) => {
        seen.push(id);
        return {
          data: { id: emailId, object: "email" },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        return yield* emails.cancel(emailId);
      }).pipe(Effect.provide(provideEmailsClient(client))),
    );

    expect(result.id).toBe(emailId);
    expect(seen).toEqual([emailId]);
  });

  it("maps Resend validation errors", async () => {
    const client = makeEmailsClient({
      send: async () => ({
        data: null,
        error: {
          name: "invalid_from_address",
          message: "Invalid from address.",
          statusCode: 422,
        },
        headers: null,
      }),
    });

    const error = await Effect.runPromise(sendEmail(client).pipe(Effect.flip));

    expect(error).toBeInstanceOf(ResendValidationError);
    expect((error as ResendValidationError).name).toBe("invalid_from_address");
    expect((error as ResendValidationError).statusCode).toBe(422);
  });

  it("maps Resend auth errors", async () => {
    const client = makeEmailsClient({
      send: async () => ({
        data: null,
        error: {
          name: "invalid_api_key",
          message: "Invalid API key.",
          statusCode: 401,
        },
        headers: null,
      }),
    });

    const error = await Effect.runPromise(sendEmail(client).pipe(Effect.flip));

    expect(error).toBeInstanceOf(ResendAuthError);
    expect((error as ResendAuthError).name).toBe("invalid_api_key");
  });

  it("wraps thrown SDK errors", async () => {
    const client = makeEmailsClient({
      send: async () => {
        throw new Error("render failed");
      },
    });

    const error = await Effect.runPromise(sendEmail(client).pipe(Effect.flip));

    expect(error).toBeInstanceOf(ResendSdkError);
    expect(error.message).toBe("render failed");
  });

  it("wraps malformed successful responses", async () => {
    const client = makeEmailsClient({
      send: async () => ({
        data: { id: "" },
        error: null,
        headers: null,
      }),
    });

    const error = await Effect.runPromise(sendEmail(client).pipe(Effect.flip));

    expect(error).toBeInstanceOf(ResendSchemaError);
  });
});

describe("ResendContacts", () => {
  it("creates a contact", async () => {
    const payload = {
      email: storedContact.email,
      firstName: "Siebe",
      properties: { plan: "pro" },
      segments: [{ id: "segment-1" }],
    };
    const seen: Array<unknown> = [];
    const client = makeContactsClient({
      create: async (createPayload) => {
        seen.push(createPayload);
        return {
          data: { id: contactId, object: "contact" },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const contacts = yield* ResendContacts;
        return yield* contacts.create(payload);
      }).pipe(Effect.provide(provideContactsClient(client))),
    );

    expect(result.id).toBe(contactId);
    expect(seen).toEqual([payload]);
  });

  it("gets a contact by id", async () => {
    const seen: Array<unknown> = [];
    const client = makeContactsClient({
      get: async (options) => {
        seen.push(options);
        return {
          data: storedContact,
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const contacts = yield* ResendContacts;
        return yield* contacts.get(contactId);
      }).pipe(Effect.provide(provideContactsClient(client))),
    );

    expect(result.id).toBe(contactId);
    expect(result.properties.plan).toEqual({ type: "string", value: "pro" });
    expect(seen).toEqual([contactId]);
  });

  it("accepts raw contact property values from get", async () => {
    const seen: Array<unknown> = [];
    const client = makeContactsClient({
      get: async (options) => {
        seen.push(options);
        return {
          data: storedContactWithRawProperties,
          error: null,
          headers: null,
        } as unknown as ResendGetContactResponse;
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const contacts = yield* ResendContacts;
        return yield* contacts.get(contactId);
      }).pipe(Effect.provide(provideContactsClient(client))),
    );

    expect(result.id).toBe(contactId);
    expect(result.properties.company_name).toBe("Acme Corp");
    expect(result.properties.seats).toBe(3);
    expect(seen).toEqual([contactId]);
  });

  it("lists contacts by segment", async () => {
    const options = { limit: 1, segmentId: "segment-1" };
    const seen: Array<unknown> = [];
    const client = makeContactsClient({
      list: async (listOptions) => {
        seen.push(listOptions);
        return {
          data: {
            object: "list",
            has_more: false,
            data: [listedContact],
          },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const contacts = yield* ResendContacts;
        return yield* contacts.list(options);
      }).pipe(Effect.provide(provideContactsClient(client))),
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(contactId);
    expect(seen).toEqual([options]);
  });

  it("updates a contact", async () => {
    const payload = {
      id: contactId,
      firstName: null,
      properties: { plan: "enterprise" },
    };
    const seen: Array<unknown> = [];
    const client = makeContactsClient({
      update: async (updatePayload) => {
        seen.push(updatePayload);
        return {
          data: { id: contactId, object: "contact" },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const contacts = yield* ResendContacts;
        return yield* contacts.update(payload);
      }).pipe(Effect.provide(provideContactsClient(client))),
    );

    expect(result.id).toBe(contactId);
    expect(seen).toEqual([payload]);
  });

  it("removes a contact", async () => {
    const seen: Array<unknown> = [];
    const client = makeContactsClient({
      remove: async (options) => {
        seen.push(options);
        return {
          data: {
            object: "contact",
            deleted: true,
            contact: contactId,
          },
          error: null,
          headers: null,
        };
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const contacts = yield* ResendContacts;
        return yield* contacts.remove(contactId);
      }).pipe(Effect.provide(provideContactsClient(client))),
    );

    expect(result.deleted).toBe(true);
    expect(seen).toEqual([contactId]);
  });
});

describe("Resend layers", () => {
  it("creates email and contact services from direct layer options", async () => {
    const services = await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        const contacts = yield* ResendContacts;

        return { emails, contacts };
      }).pipe(
        Effect.provide(ResendLayer({ apiKey: Redacted.make("re_test") })),
      ),
    );

    expect(typeof services.emails.send).toBe("function");
    expect(typeof services.contacts.create).toBe("function");
  });

  it("creates email and contact services from custom Effect Config values", async () => {
    const layer = ResendLayerConfig({
      apiKey: Config.redacted("MY_RESEND_API_KEY"),
    }).pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            MY_RESEND_API_KEY: "re_test",
          }),
        ),
      ),
    );

    const services = await Effect.runPromise(
      Effect.gen(function* () {
        const emails = yield* ResendEmails;
        const contacts = yield* ResendContacts;

        return { emails, contacts };
      }).pipe(Effect.provide(layer)),
    );

    expect(typeof services.emails.send).toBe("function");
    expect(typeof services.contacts.create).toBe("function");
  });
});
