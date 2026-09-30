import { postJson } from "./api";

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  history: ChatHistoryEntry[];
  systemPrompt?: string;
  personality?: string;
}

interface RawChatResponse {
  response?: string;
  message?: string;
  content?: string;
}

/** POST /chat with the active companion's personality and system prompt. */
export async function sendChatMessage(
  payload: ChatRequestPayload,
  signal?: AbortSignal,
): Promise<string> {
  const body: ChatRequestPayload = {
    message: payload.message,
    history: payload.history,
    systemPrompt: payload.systemPrompt,
    personality: payload.personality,
  };

  const data = await postJson<RawChatResponse>(
    "/chat",
    body,
    signal,
  );

  const text =
    data.response ??
    data.message ??
    data.content;

  if (typeof text !== "string") {
    throw new Error(
      "The backend replied in an unexpected format.",
    );
  }

  return text;
}