import { useCallback, useRef, useState } from "react";
import { sendChatMessage, type ChatHistoryEntry } from "@/services/chat";
import { synthesizeVoice } from "@/services/api";
import { requestNextMedia, syncMediaConfig } from "@/services/media";
import { useAppStore, newMessageId } from "@/stores/appStore";
import type { ChatMessage } from "@/types";

const REVEAL_TICK_MS = 16;
const REVEAL_CHARS_PER_TICK = 3;

function splitIntoSentences(text: string): string[] {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  const matches = normalized.match(
    /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g,
  );

  if (!matches) {
    return [normalized];
  }

  return matches
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function useChat() {
  const [sending, setSending] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);

  const revealRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stopReveal = useCallback(() => {
    if (revealRef.current) {
      clearInterval(revealRef.current);
      revealRef.current = null;
    }
  }, []);

  const stopVoice = useCallback(() => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    useAppStore
      .getState()
      .setCompanionState("idle");
  }, []);

  /*
   * Generate and play one sentence.
   */
  const playVoiceChunk = useCallback(
    async (
      text: string,
      controller: AbortController,
    ) => {
      if (controller.signal.aborted) {
        return;
      }

      try {
        const audioBlob = await synthesizeVoice(
          text,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        const audioUrl =
          URL.createObjectURL(audioBlob);

        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);

        audioRef.current = audio;

        useAppStore
          .getState()
          .setCompanionState("talking");

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            resolve();
          };

          audio.onerror = () => {
            resolve();
          };

          audio.play().catch(() => {
            resolve();
          });
        });

        if (
          audioUrlRef.current === audioUrl
        ) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
        }

        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(
            "Voice chunk failed:",
            error,
          );
        }
      }
    },
    [],
  );

  /*
   * Split the response into sentences and
   * process them sequentially.
   */
  const playVoice = useCallback(
    async (text: string) => {
      stopVoice();

      const controller =
        new AbortController();

      voiceAbortRef.current = controller;

      const sentences =
        splitIntoSentences(text);

      if (!sentences.length) {
        return;
      }

      try {
        for (const sentence of sentences) {
          if (controller.signal.aborted) {
            break;
          }

          await playVoiceChunk(
            sentence,
            controller,
          );
        }
      } finally {
        if (
          voiceAbortRef.current === controller
        ) {
          voiceAbortRef.current = null;
        }

        if (!controller.signal.aborted) {
          useAppStore
            .getState()
            .setCompanionState("idle");
        }
      }
    },
    [playVoiceChunk, stopVoice],
  );

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

          if (
            cursor >= fullText.length
          ) {
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

        const currentSettings =
          useAppStore.getState()
            .settings;

        /*
         * Text reveal and voice generation
         * happen independently.
         */
        const voicePromise =
          currentSettings.voiceEnabled
            ? playVoice(reply)
            : Promise.resolve();

        state.setCompanionState(
          "talking",
        );

        await Promise.all([
          reveal(
            placeholder.id,
            reply,
          ),
          voicePromise,
        ]);

        /*
         * Media is deliberately fire-and-forget.
         * It never blocks the text response or voice.
         *
         * IMPORTANT:
         * Media is strictly tied to the currently
         * active companion. There is no fallback to
         * Mia or any other companion.
         */
        const mediaConfig =
          companion?.mediaResponses;

        if (
          companion &&
          mediaConfig?.enabled &&
          mediaConfig.folderPath?.trim() &&
          !abortRef.current?.signal.aborted
        ) {
          const companionId =
            companion.id;

          /*
           * Re-register this companion's own
           * folder before requesting media.
           *
           * This prevents the backend from using
           * a stale or missing registration for
           * this companion ID.
           */
          void syncMediaConfig(
            companionId,
            mediaConfig,
          )
            .catch(() => undefined)
            .then(() =>
              requestNextMedia(
                companionId,
              ),
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
        stopVoice();

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

        if (!audioRef.current) {
          useAppStore
            .getState()
            .setCompanionState(
              "idle",
            );
        }
      }
    },
    [
      playVoice,
      reveal,
      sending,
      stopReveal,
      stopVoice,
    ],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();

    stopReveal();
    stopVoice();

    useAppStore
      .getState()
      .setCompanionState(
        "idle",
      );
  }, [
    stopReveal,
    stopVoice,
  ]);

  return {
    send,
    cancel,
    sending,
  };
}