// Typed fetch client for the NestJS API (docs/architecture.md §3.4). Works in
// Server and Client Components. Errors are always ApiError.
import type { z } from "zod";
import { apiBaseUrl, DEFAULT_TIMEOUT_MS, isServer } from "./api-config";
import { ApiError, type ApiErrorBody } from "./api-error";
import { getAccessToken, getTokenGeneration, refreshSession } from "./session";

type Query = Record<
  string,
  string | number | boolean | null | undefined | readonly (string | number)[]
>;

export type RequestOptions<S extends z.ZodType | undefined = undefined> = {
  query?: Query;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Validates the JSON response; the return type follows the schema. */
  schema?: S;
  /** Next.js fetch options for Server Components (e.g. { tags: [...] }). */
  next?: NextFetchRequestConfig;
  cache?: RequestCache;
  /** Auth endpoints: never try a refresh-and-retry on 401 (would loop). */
  skipAuthRefresh?: boolean;
};

type Result<T, S> = S extends z.ZodType ? z.infer<S> : T;

function buildUrl(path: string, query?: Query): string {
  const base = apiBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function encodeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (
    body instanceof FormData ||
    body instanceof Blob ||
    typeof body === "string"
  ) {
    return body;
  }
  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

async function send(
  method: string,
  path: string,
  options: RequestOptions<z.ZodType | undefined>,
  accept: string,
  isRetry = false,
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Accept", accept);
  const token = isServer ? null : getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Server Components call the API directly (not through proxy.ts), so they
  // add the shared secret themselves. API_PROXY_SECRET is a server-only env
  // var: it is never inlined into browser bundles.
  if (isServer) {
    const secret = process.env.API_PROXY_SECRET;
    if (secret) {
      headers.set("x-aaarchive-proxy", secret);
      headers.set("x-aaarchive-ssr", "1");
    }
  }
  const seenGeneration = getTokenGeneration();

  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: encodeBody(options.body, headers),
      credentials: "include",
      signal,
      cache: options.cache,
      next: options.next,
    });
  } catch (cause) {
    // A caller-initiated abort (e.g. TanStack cancelling a stale query) is not an error to report.
    if (options.signal?.aborted) throw cause;
    throw ApiError.network(cause);
  }

  // One silent refresh + retry on 401 (browser only).
  if (
    response.status === 401 &&
    !isServer &&
    !isRetry &&
    !options.skipAuthRefresh
  ) {
    const fresh = await refreshSession(seenGeneration);
    if (fresh) return send(method, path, options, accept, true);
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw ApiError.fromResponse(response.status, body);
  }
  return response;
}

async function request<T, S extends z.ZodType | undefined = undefined>(
  method: string,
  path: string,
  options: RequestOptions<S> = {},
): Promise<Result<T, S>> {
  const response = await send(method, path, options, "application/json");
  if (response.status === 204) return undefined as Result<T, S>;
  const data: unknown = await response.json();
  if (options.schema) {
    const parsed = options.schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "The server sent an unexpected response",
        parsed.error.issues,
      );
    }
    return parsed.data as Result<T, S>;
  }
  return data as Result<T, S>;
}

/** Downloads a file (CSV/Excel exports) and returns it with the server's file name. */
async function download(
  path: string,
  options: Omit<RequestOptions, "schema" | "body"> = {},
): Promise<{ blob: Blob; filename: string }> {
  const response = await send("GET", path, options, "*/*");
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return {
    blob: await response.blob(),
    filename: match?.[1] ? decodeURIComponent(match[1]) : "export",
  };
}

export const api = {
  get: <T = unknown, S extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<S>,
  ) => request<T, S>("GET", path, options),
  post: <T = unknown, S extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<S>,
  ) => request<T, S>("POST", path, options),
  put: <T = unknown, S extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<S>,
  ) => request<T, S>("PUT", path, options),
  patch: <T = unknown, S extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<S>,
  ) => request<T, S>("PATCH", path, options),
  delete: <T = unknown, S extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<S>,
  ) => request<T, S>("DELETE", path, options),
  download,
};
