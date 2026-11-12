export class ClientApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function clientApi<T = Record<string, unknown>>(
  input: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const sourceSignal = init.signal;
  const forwardAbort = () => controller.abort(sourceSignal?.reason || "cancelled");
  if (sourceSignal?.aborted) forwardAbort();
  else sourceSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = globalThis.setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (response.redirected && /\/(login|portal-login)(?:$|[?#])/.test(response.url)) {
      throw new ClientApiError("Your session expired. Sign in again, then retry your change.", 401);
    }
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    if (!response.ok) {
      throw new ClientApiError(data?.error || "That change could not be saved.", response.status);
    }
    if (!contentType.includes("application/json")) {
      throw new ClientApiError("The server returned an unexpected response. Please retry.", response.status);
    }
    return data as T;
  } catch (caught) {
    if (controller.signal.aborted) {
      if (controller.signal.reason === "timeout") {
        throw new ClientApiError("The request took too long. Your information is still here, so you can retry.");
      }
      throw new ClientApiError("The request was cancelled.");
    }
    if (caught instanceof ClientApiError) throw caught;
    throw new ClientApiError("LaunchPAD could not reach the server. Check your connection and retry.");
  } finally {
    globalThis.clearTimeout(timeout);
    sourceSignal?.removeEventListener("abort", forwardAbort);
  }
}

export function clientErrorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "That change could not be saved.";
}
