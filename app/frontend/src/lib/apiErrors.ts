export type ApiErrorPayload = {
  success?: false;
  error?: {
    code?: string;
    message?: string | string[];
    request_id?: string;
    correlationId?: string;
    fields?: Record<string, string[]>;
    details?: Record<string, unknown>;
  };
  code?: string;
  errorCode?: string;
  message?: string | string[];
  request_id?: string;
  correlationId?: string;
  fields?: Record<string, string[]>;
  details?: Record<string, unknown>;
};

export type NormalizedApiError = {
  code: string;
  message: string;
  status?: number;
  requestId?: string;
  fields?: Record<string, string[]>;
  details?: Record<string, unknown>;
  raw?: unknown;
};

const DEFAULT_ERROR_CODE = "UNKNOWN_ERROR";
const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function formatMessage(message: unknown): string | undefined {
  if (Array.isArray(message)) {
    return message.filter((part): part is string => typeof part === "string").join(" ");
  }

  return typeof message === "string" && message.trim() ? message : undefined;
}

export class QuickExClientError extends Error {
  readonly apiError: NormalizedApiError;

  constructor(apiError: NormalizedApiError) {
    super(apiError.message);
    this.name = "QuickExClientError";
    this.apiError = apiError;
  }
}

export function normalizeApiErrorPayload(
  payload: unknown,
  options: { status?: number; fallbackMessage?: string } = {},
): NormalizedApiError {
  const body = payload as ApiErrorPayload | null;
  const nested = body && typeof body === "object" ? body.error : undefined;
  const message =
    formatMessage(nested?.message) ??
    formatMessage(body?.message) ??
    options.fallbackMessage ??
    DEFAULT_ERROR_MESSAGE;

  return {
    code:
      nested?.code ??
      body?.code ??
      body?.errorCode ??
      (options.status === 404 ? "NOT_FOUND" : DEFAULT_ERROR_CODE),
    message,
    status: options.status,
    requestId:
      nested?.request_id ??
      nested?.correlationId ??
      body?.request_id ??
      body?.correlationId,
    fields: nested?.fields ?? body?.fields,
    details: nested?.details ?? body?.details,
    raw: payload,
  };
}

export async function parseApiErrorResponse(
  response: Response,
  fallbackMessage?: string,
): Promise<NormalizedApiError> {
  const payload = await response.json().catch(() => null);

  return normalizeApiErrorPayload(payload, {
    status: response.status,
    fallbackMessage: fallbackMessage ?? `Request failed (${response.status})`,
  });
}

export function normalizeUnknownError(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
): NormalizedApiError {
  if (error instanceof QuickExClientError) {
    return error.apiError;
  }

  if (error instanceof Error) {
    return {
      code: DEFAULT_ERROR_CODE,
      message: error.message || fallbackMessage,
      raw: error,
    };
  }

  if (typeof error === "string") {
    return {
      code: DEFAULT_ERROR_CODE,
      message: error,
      raw: error,
    };
  }

  return normalizeApiErrorPayload(error, { fallbackMessage });
}
