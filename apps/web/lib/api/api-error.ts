// Every API failure becomes an ApiError (docs/rules.md §5.2). UI code branches
// on `code`, never on `message`.

export type ApiErrorBody = {
  statusCode?: number;
  message?: unknown;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static isApiError(value: unknown): value is ApiError {
    return value instanceof ApiError;
  }

  /** Builds an ApiError from the API's `{ statusCode, message, code?, details? }`. */
  static fromResponse(status: number, body: ApiErrorBody | null): ApiError {
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : typeof body?.message === "string"
        ? body.message
        : `Request failed with status ${status}`;
    return new ApiError(
      status,
      body?.code ?? codeForStatus(status),
      message,
      body?.details,
    );
  }

  static network(cause: unknown): ApiError {
    const timeout =
      cause instanceof DOMException && cause.name === "TimeoutError";
    return new ApiError(
      0,
      timeout ? "TIMEOUT" : "NETWORK_ERROR",
      timeout ? "The request timed out" : "Could not reach the server",
    );
  }
}

function codeForStatus(status: number): string {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED";
}
