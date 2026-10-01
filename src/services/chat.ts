import { postJson } from "./api";

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  history: ChatHistoryEntry[];
  systemPrompt?: string | undefined;
  personality?: string | undefined;
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

/**
 * Stream the LLM response from /chat/stream.
 *
 * The backend sends SSE events in this format:
 * data: {"delta":"some text"}
 *
 * and finishes with:
 * data: {"done":true}
 * data: [DONE]
 */
export async function streamChatMessage(
  payload: ChatRequestPayload,
  onDelta: (delta: string, fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(
    "http://127.0.0.1:8000/chat/stream",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: payload.message,
        history: payload.history,
        systemPrompt: payload.systemPrompt,
        personality: payload.personality,
      }),
      signal,
    },
  );

  if (!response.ok) {
    let detail = "";

    try {
      detail = await response.text();
    } catch {
      // Ignore response-body parsing errors.
    }

    throw new Error(
      detail
        ? `Streaming chat failed (${response.status}): ${detail}`
        : `Streaming chat failed (${response.status}).`,
    );
  }

  if (!response.body) {
    throw new Error(
      "The browser did not provide a streaming response body.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let fullText = "";
  let finished = false;

  const processEvent = (eventText: string) => {
    const lines = eventText
      .replace(/\r\n/g, "\n")
      .split("\n");

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();

      if (!data) {
        continue;
      }

      if (data === "[DONE]") {
        finished = true;
        return;
      }

      let parsed: {
        delta?: unknown;
        done?: unknown;
        error?: unknown;
      };

      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (typeof parsed.error === "string") {
        throw new Error(parsed.error);
      }

      if (typeof parsed.delta === "string") {
        fullText += parsed.delta;
        onDelta(parsed.delta, fullText);
      }

      if (parsed.done === true) {
        finished = true;
        return;
      }
    }
  };

  while (!finished) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

    buffer = buffer.replace(/\r\n/g, "\n");

    let separatorIndex = buffer.indexOf("\n\n");

    while (separatorIndex !== -1) {
      const eventText = buffer.slice(
        0,
        separatorIndex,
      );

      buffer = buffer.slice(
        separatorIndex + 2,
      );

      processEvent(eventText);

      if (finished) {
        break;
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();

  if (!finished && buffer.trim()) {
    processEvent(buffer);
  }

  return fullText;
}