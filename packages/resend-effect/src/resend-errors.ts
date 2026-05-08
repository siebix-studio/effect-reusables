import { Effect, Schema } from "effect";
import type { ErrorResponse } from "resend";

const ResendValidationErrorName = Schema.Literals([
  "validation_error",
  "invalid_parameter",
  "missing_required_field",
  "invalid_attachment",
  "invalid_from_address",
  "invalid_region",
]);

const ResendAuthErrorName = Schema.Literals([
  "missing_api_key",
  "restricted_api_key",
  "invalid_api_key",
  "invalid_access",
  "security_error",
]);

const ResendRateLimitErrorName = Schema.Literals([
  "rate_limit_exceeded",
  "monthly_quota_exceeded",
  "daily_quota_exceeded",
]);

const ResendIdempotencyErrorName = Schema.Literals([
  "invalid_idempotency_key",
  "invalid_idempotent_request",
  "concurrent_idempotent_requests",
]);

const ResendApplicationErrorName = Schema.Literals([
  "method_not_allowed",
  "application_error",
  "internal_server_error",
]);

const ResendApiErrorFields = {
  message: Schema.String,
  statusCode: Schema.NullOr(Schema.Number),
};

export class ResendValidationError extends Schema.TaggedErrorClass<ResendValidationError>()(
  "ResendValidationError",
  {
    ...ResendApiErrorFields,
    name: ResendValidationErrorName,
  },
) {}

export class ResendAuthError extends Schema.TaggedErrorClass<ResendAuthError>()(
  "ResendAuthError",
  {
    ...ResendApiErrorFields,
    name: ResendAuthErrorName,
  },
) {}

export class ResendRateLimitError extends Schema.TaggedErrorClass<ResendRateLimitError>()(
  "ResendRateLimitError",
  {
    ...ResendApiErrorFields,
    name: ResendRateLimitErrorName,
  },
) {}

export class ResendNotFoundError extends Schema.TaggedErrorClass<ResendNotFoundError>()(
  "ResendNotFoundError",
  {
    ...ResendApiErrorFields,
    name: Schema.Literal("not_found"),
  },
) {}

export class ResendIdempotencyError extends Schema.TaggedErrorClass<ResendIdempotencyError>()(
  "ResendIdempotencyError",
  {
    ...ResendApiErrorFields,
    name: ResendIdempotencyErrorName,
  },
) {}

export class ResendApplicationError extends Schema.TaggedErrorClass<ResendApplicationError>()(
  "ResendApplicationError",
  {
    ...ResendApiErrorFields,
    name: ResendApplicationErrorName,
  },
) {}

export class ResendUnexpectedApiError extends Schema.TaggedErrorClass<ResendUnexpectedApiError>()(
  "ResendUnexpectedApiError",
  {
    ...ResendApiErrorFields,
    name: Schema.String,
  },
) {}

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

export class ResendSdkError extends Schema.TaggedErrorClass<ResendSdkError>()(
  "ResendSdkError",
  {
    cause: Schema.Defect,
  },
) {
  override get message() {
    return formatCause(this.cause);
  }
}

export class ResendSchemaError extends Schema.TaggedErrorClass<ResendSchemaError>()(
  "ResendSchemaError",
  {
    cause: Schema.Defect,
  },
) {
  override get message() {
    return formatCause(this.cause);
  }
}

export type ResendError =
  | ResendValidationError
  | ResendAuthError
  | ResendRateLimitError
  | ResendNotFoundError
  | ResendIdempotencyError
  | ResendApplicationError
  | ResendUnexpectedApiError
  | ResendSdkError
  | ResendSchemaError;

export const toResendApiError = (error: ErrorResponse): ResendError => {
  switch (error.name) {
    case "validation_error":
    case "invalid_parameter":
    case "missing_required_field":
    case "invalid_attachment":
    case "invalid_from_address":
    case "invalid_region":
      return ResendValidationError.make({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

    case "missing_api_key":
    case "restricted_api_key":
    case "invalid_api_key":
    case "invalid_access":
    case "security_error":
      return ResendAuthError.make({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

    case "rate_limit_exceeded":
    case "monthly_quota_exceeded":
    case "daily_quota_exceeded":
      return ResendRateLimitError.make({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

    case "not_found":
      return ResendNotFoundError.make({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

    case "invalid_idempotency_key":
    case "invalid_idempotent_request":
    case "concurrent_idempotent_requests":
      return ResendIdempotencyError.make({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

    case "method_not_allowed":
    case "application_error":
    case "internal_server_error":
      return ResendApplicationError.make({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

    default:
      return ResendUnexpectedApiError.make(error);
  }
};

export const decodeResendResponse = <S extends Schema.Top>(
  schema: S,
  response: {
    readonly data: unknown;
    readonly error: ErrorResponse | null;
  },
) =>
  Effect.gen(function* () {
    if (response.error !== null) {
      return yield* toResendApiError(response.error);
    }

    return yield* Schema.decodeUnknownEffect(schema)(response.data).pipe(
      Effect.mapError((cause) => ResendSchemaError.make({ cause })),
    );
  });
