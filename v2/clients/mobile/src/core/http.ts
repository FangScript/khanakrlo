export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export type RequestOptions = { method?: string; token?: string; body?: unknown; idempotencyKey?: string; signal?: AbortSignal };
export type Transport = <T>(path: string, options?: RequestOptions) => Promise<T>;

export function createTransport(baseUrl: string, development = false): Transport {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !(development && url.protocol === "http:")) throw new Error("The API must use HTTPS.");
  if (url.username || url.password || url.search || url.hash) throw new Error("Invalid API URL.");
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    if (!path.startsWith("/") || path.includes("..")) throw new Error("Invalid API path.");
    const controller = new AbortController();
    const cancel = () => controller.abort();
    const timer = setTimeout(cancel, 5000);
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1${path}`, {
        method: options.method ?? "GET", signal: controller.signal, redirect: "error",
        headers: { Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}) },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > 1_048_576) throw new ApiError(502,"RESPONSE_TOO_LARGE","The server response was too large.");
      const text = await response.text();
      if (text.length > 1_048_576) throw new ApiError(502,"RESPONSE_TOO_LARGE","The server response was too large.");
      let body: unknown;
      try { body = text ? JSON.parse(text) : undefined; } catch { throw new ApiError(502,"INVALID_RESPONSE","The server returned an invalid response."); }
      if (!response.ok) {
        const data = body as { error?: unknown; message?: unknown } | undefined;
        throw new ApiError(response.status,typeof data?.error === "string" ? data.error : "REQUEST_FAILED",typeof data?.message === "string" ? data.message : "Please try again.");
      }
      return body as T;
    } finally { clearTimeout(timer); options.signal?.removeEventListener("abort",cancel); }
  };
}
