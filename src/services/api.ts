/**
 * Single place where the frontend talks HTTP to the local FastAPI backend.
 * No UI component may call fetch directly.
 */

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
export const VOICE_API_BASE_URL = "http://127.0.0.1:8001";

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

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal, timeoutMs = 120_000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener(
      "abort",
      () => controller.abort(),
      { once: true },
    );
  }

  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
    };

    if (body !== undefined) {
      init.headers = {
        "Content-Type": "application/json",
      };
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${apiBaseUrl}${path}`, init);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      throw new ApiError(
        detail?.slice(0, 300) ||
          `Request to ${path} failed (${response.status})`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new ApiError(
        `Request to ${path} timed out or was cancelled`,
      );
    }

    throw new ApiError(
      `Cannot reach the local backend at ${apiBaseUrl}. Make sure it is running.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** POST a JSON document without placing payload fields in the URL. */
export function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body,
    signal,
  });
}

/**
 * Generate companion voice through the local voice engine.
 *
 * Returns a Blob containing the generated WAV audio.
 */
export async function synthesizeVoice(
  text: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    120_000,
  );

  if (signal) {
    signal.addEventListener(
      "abort",
      () => controller.abort(),
      { once: true },
    );
  }

  try {
    const response = await fetch(
      `${VOICE_API_BASE_URL}/synthesize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      throw new ApiError(
        detail?.slice(0, 300) ||
          `Voice synthesis failed (${response.status})`,
        response.status,
      );
    }

    return await response.blob();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new ApiError(
        "Voice synthesis timed out or was cancelled",
      );
    }

    throw new ApiError(
      "Cannot reach the local voice engine at http://127.0.0.1:8001. Make sure it is running.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** GET / — resolves true when the local backend answers. Never throws. */
export async function checkBackendHealth(
  signal?: AbortSignal,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  if (signal) {
    signal.addEventListener(
      "abort",
      () => controller.abort(),
      { once: true },
    );
  }

  try {
    const response = await fetch(`${apiBaseUrl}/`, {
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}