import { request } from "./api";

export interface ChatRequestPayload {
  message: string;
  /** Extra fields the backend may ignore today but will use later. */
  model?: string | null;
  system_prompt?: string | null;
  temperature?: number;
  conversation_id?: string;
}

interface RawChatResponse {
  response?: string;
  message?: string;
  content?: string;
}

/** POST /chat — returns the backend's real reply text. Never faked. */
export async function sendChatMessage(
  payload: ChatRequestPayload,
  signal?: AbortSignal,
): Promise<string> {
  const body: Record<string, unknown> = { message: payload.message };
  if (payload.model) body.model = payload.model;
  if (payload.system_prompt) body.system_prompt = payload.system_prompt;
  if (payload.temperature !== undefined) body.temperature = payload.temperature;
  if (payload.conversation_id) body.conversation_id = payload.conversation_id;

  const data = await request<RawChatResponse>("/chat", { method: "POST", body, signal });
  const text = data.response ?? data.message ?? data.content;
  if (typeof text !== "string") {
    throw new Error("The backend replied in an unexpected format.");
  }
  return text;
}
