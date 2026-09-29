/**
 * Single place where the frontend talks HTTP to the local FastAPI backend.
 * No UI component may call fetch directly.
 */

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

let apiBaseUrl = DEFAULT_API_BASE_URL;

export function setApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/+$/, "") || DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export class ApiError extends Error {
  status?: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, timeoutMs = 120_000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const init: RequestInit = { method, signal: controller.signal };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const response = await fetch(`${apiBaseUrl}${path}`, init);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new ApiError(
        detail?.slice(0, 300) || `Request to ${path} failed (${response.status})`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`Request to ${path} timed out or was cancelled`);
    }
    throw new ApiError(
      `Cannot reach the local backend at ${apiBaseUrl}. Make sure it is running.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
