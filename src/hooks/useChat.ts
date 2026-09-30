import { useCallback, useRef, useState } from "react";
import { sendChatMessage, type ChatHistoryEntry } from "@/services/chat";
import { requestNextMedia } from "@/services/media";
import { useAppStore, newMessageId } from "@/stores/appStore";
import type { ChatMessage } from "@/types";

const REVEAL_TICK_MS = 16;
const REVEAL_CHARS_PER_TICK = 3;

export function useChat() {
  const [sending, setSending] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const revealRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const stopReveal = useCallback(() => {
    if (revealRef.current) {
      clearInterval(revealRef.current);
      revealRef.current = null;
    }
  }, []);

  const reveal = useCallback(
    (
      messageId: string,
      fullText: string,
    ) =>
      new Promise<void>((resolve) => {
        const {
          settings,
          patchMessage,
        } = useAppStore.getState();

        if (
          !settings.streamingReveal ||
          settings.animationLevel === "off"
        ) {
          patchMessage(messageId, {
            content: fullText,
            streaming: false,
          });

          resolve();
          return;
        }

        let cursor = 0;

        stopReveal();

        revealRef.current = setInterval(() => {
          cursor = Math.min(
            fullText.length,
            cursor + REVEAL_CHARS_PER_TICK,
          );

          patchMessage(messageId, {
            content: fullText.slice(
              0,
              cursor,
            ),
          });

          if (cursor >= fullText.length) {
            stopReveal();

            patchMessage(messageId, {
              streaming: false,
            });

            resolve();
          }
        }, REVEAL_TICK_MS);
      }),
    [stopReveal],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();

      if (!trimmed || sending) {
        return;
      }

      const state =
        useAppStore.getState();

      const companion =
        state.companions.find(
          (c) =>
            c.id ===
            state.activeCompanionId,
        );

      const modelId =
        companion?.model
          .preferredModelId ??
        state.selectedModelId;

      const conversation =
        state.conversations.find(
          (c) =>
            c.id ===
            state.activeConversationId,
        );

      const history: ChatHistoryEntry[] = (
        conversation?.messages ?? []
      )
        .filter(
          (m) =>
            !m.error &&
            !m.streaming &&
            !m.imagePending &&
            m.content.trim() !== "",
        )
        .map((m) => ({
          role:
            m.role === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: m.content,
        }));

      const userMessage: ChatMessage = {
        id: newMessageId(),
        conversationId:
          state.activeConversationId,
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      state.appendMessage(userMessage);

      const placeholder: ChatMessage = {
        id: newMessageId(),
        conversationId:
          state.activeConversationId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        modelId,
        streaming: true,
      };

      state.appendMessage(placeholder);

      setSending(true);

      state.setCompanionState("thinking");

      abortRef.current =
        new AbortController();

      try {
        const reply =
          await sendChatMessage(
            {
              message: trimmed,
              history,
              systemPrompt:
                companion?.systemPrompt,
              personality:
                companion?.personality,
            },
            abortRef.current.signal,
          );

        state.setCompanionState(
          "talking",
        );

        await reveal(
          placeholder.id,
          reply,
        );

        /*
         * Media is fire-and-forget.
         * It never blocks the text response.
         */
        if (
          companion?.mediaResponses?.enabled &&
          !abortRef.current?.signal.aborted
        ) {
          const companionId =
            companion.id;

          void requestNextMedia(
            companionId,
          )
            .then((media) => {
              if (media) {
                useAppStore
                  .getState()
                  .patchMessage(
                    placeholder.id,
                    { media },
                  );
              }
            })
            .catch(() => undefined);
        }
      } catch (error) {
        stopReveal();

        useAppStore
          .getState()
          .patchMessage(
            placeholder.id,
            {
              content:
                error instanceof Error
                  ? error.message
                  : "The local backend could not be reached.",
              streaming: false,
              error: true,
            },
          );
      } finally {
        setSending(false);

        abortRef.current = null;

        useAppStore
          .getState()
          .setCompanionState(
            "idle",
          );
      }
    },
    [
      reveal,
      sending,
      stopReveal,
    ],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();

    stopReveal();

    useAppStore
      .getState()
      .setCompanionState(
        "idle",
      );
  }, [stopReveal]);

  return {
    send,
    cancel,
    sending,
  };
}