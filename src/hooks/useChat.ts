import { useCallback, useRef, useState } from "react";
import { sendChatMessage, type ChatHistoryEntry } from "@/services/chat";
import { useAppStore, newMessageId } from "@/stores/appStore";
import type { ChatMessage } from "@/types";

const REVEAL_TICK_MS = 16;
const REVEAL_CHARS_PER_TICK = 3;

/** Chat orchestration: real backend replies, revealed with a streaming animation. */
export function useChat() {
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopReveal = useCallback(() => {
    if (revealRef.current) {
      clearInterval(revealRef.current);
      revealRef.current = null;
    }
  }, []);

  const reveal = useCallback(
    (messageId: string, fullText: string) =>
      new Promise<void>((resolve) => {
        const { settings, patchMessage } = useAppStore.getState();
        if (!settings.streamingReveal || settings.animationLevel === "off") {
          patchMessage(messageId, { content: fullText, streaming: false });
          resolve();
          return;
        }
        let cursor = 0;
        stopReveal();
        revealRef.current = setInterval(() => {
          cursor = Math.min(fullText.length, cursor + REVEAL_CHARS_PER_TICK);
          patchMessage(messageId, { content: fullText.slice(0, cursor) });
          if (cursor >= fullText.length) {
            stopReveal();
            patchMessage(messageId, { streaming: false });
            resolve();
          }
        }, REVEAL_TICK_MS);
      }),
    [stopReveal],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const state = useAppStore.getState();
      const companion = state.companions.find((c) => c.id === state.activeCompanionId);
      const modelId = companion?.model.preferredModelId ?? state.selectedModelId;

      // Snapshot history BEFORE adding the new user message; only real, finished turns.
      const conversation = state.conversations.find((c) => c.id === state.activeConversationId);
      const history: ChatHistoryEntry[] = (conversation?.messages ?? [])
        .filter((m) => !m.error && !m.streaming && !m.imagePending && m.content.trim() !== "")
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }));

      const userMessage: ChatMessage = {
        id: newMessageId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      state.appendMessage(userMessage);

      const placeholder: ChatMessage = {
        id: newMessageId(),
        role: "companion",
        content: "",
        createdAt: Date.now(),
        modelId,
        streaming: true,
      };
      state.appendMessage(placeholder);

      setSending(true);
      state.setCompanionState("thinking");
      abortRef.current = new AbortController();

      try {
        const reply = await sendChatMessage(
          { message: trimmed, history },
          abortRef.current.signal,
        );
        useAppStore.getState().setCompanionState("talking");
        await reveal(placeholder.id, reply);
      } catch (error) {
        stopReveal();
        useAppStore.getState().patchMessage(placeholder.id, {
          content:
            error instanceof Error
              ? error.message
              : "The local backend could not be reached.",
          streaming: false,
          error: true,
        });
      } finally {
        setSending(false);
        abortRef.current = null;
        useAppStore.getState().setCompanionState("idle");
      }
    },
    [reveal, sending, stopReveal],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    stopReveal();
  }, [stopReveal]);

  return { send, cancel, sending };
}
