import { request } from "./api";

export interface ChatRequestPayload {
  message: string;
  /** Extra fields the backend may ignore today but will use later. */
  model?: string | null | undefined;
  system_prompt?: string | null | undefined;
  temperature?: number | undefined;
  conversation_id?: string | undefined;
}

interface ChatRequestBody {
  message: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  conversation_id?: string;
}

interface RawChatResponse {
  response?: string;
  message?: string;
  content?: string;
}

/**
 * POST /chat?message=... — the current backend reads `message` as a query
 * parameter and uses a fixed model internally. Model / system prompt /
 * temperature are accepted here so the call site is ready once the backend
 * supports them; flip SEND_EXTENDED_FIELDS then (as query params or JSON body).
 */
const SEND_EXTENDED_FIELDS = false;

export async function sendChatMessage(
  payload: ChatRequestPayload,
  signal?: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({ message: payload.message });
  if (SEND_EXTENDED_FIELDS) {
    const extra: ChatRequestBody = { message: payload.message };
    if (payload.model) extra.model = payload.model;
    if (payload.system_prompt) extra.system_prompt = payload.system_prompt;
    if (payload.temperature !== undefined) extra.temperature = payload.temperature;
    if (payload.conversation_id) extra.conversation_id = payload.conversation_id;
    for (const [k, v] of Object.entries(extra)) if (k !== "message") params.set(k, String(v));
  }

  const data = await request<RawChatResponse>(`/chat?${params.toString()}`, {
    method: "POST",
    signal,
  });
  const text = data.response ?? data.message ?? data.content;
  if (typeof text !== "string") {
    throw new Error("The backend replied in an unexpected format.");
  }
  return text;
}
