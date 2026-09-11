/** Error carrying the server's own message, so callers can show it directly. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * fetch() for admin requests, used from client components.
 *
 * Anything other than a 2xx throws, so a handler cannot swallow a failure by
 * only acting on `res.ok` — that is how an expired session used to lose an
 * edit with no message at all.
 *
 * A 401 additionally sends the admin back to sign in, because retrying is
 * pointless until they do. The redirect is delayed so their toast is readable
 * first.
 */
export async function adminFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);

  if (res.ok) {
    // Some routes answer 204/empty; JSON.parse("") would throw.
    const body = await res.text();
    return (body ? JSON.parse(body) : null) as T;
  }

  if (res.status === 401) {
    setTimeout(() => {
      window.location.href = "/admin/login";
    }, 1800);
    throw new ApiError(
      "Your session expired. Taking you to the sign-in page…",
      401,
    );
  }

  throw new ApiError(await readErrorMessage(res), res.status);
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    // Only strings are shown: some routes answer with a nested Zod object,
    // which would otherwise render as "[object Object]".
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Non-JSON body (a proxy error page, say) — fall through to the default.
  }
  return `Request failed (${res.status})`;
}

/** The server's message when there is one, otherwise the caller's fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
