import { request } from "./api";

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  history: ChatHistoryEntry[];
}

interface RawChatResponse {
  response?: string;
  message?: string;
  content?: string;
}

/** POST /chat with JSON { message, history }. System prompt stays on the backend. */
export async function sendChatMessage(
  payload: ChatRequestPayload,
  signal?: AbortSignal,
): Promise<string> {
  const data = await request<RawChatResponse>("/chat", {
    method: "POST",
    body: { message: payload.message, history: payload.history },
    signal,
  });
  const text = data.response ?? data.message ?? data.content;
  if (typeof text !== "string") {
    throw new Error("The backend replied in an unexpected format.");
  }
  return text;
}
