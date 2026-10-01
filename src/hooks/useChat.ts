import { useCallback, useRef, useState } from "react";
import {
  sendChatMessage,
  streamChatMessage,
  type ChatHistoryEntry,
} from "@/services/chat";
import { requestNextMedia } from "@/services/media";
import {
  DEFAULT_VOICE_ID,
  DEFAULT_VOICE_SPEED,
} from "@/services/voice";
import { synthesizeSpeech } from "@/services/api";
import { stopSpeaking } from "@/services/voice";
import { toast } from "sonner";
import { useAppStore, newMessageId } from "@/stores/appStore";
import type { ChatMessage } from "@/types";

const REVEAL_TICK_MS = 16;
const REVEAL_CHARS_PER_TICK = 3;


/* ============================================================
   SENTENCE DETECTION
   ============================================================ */

function takeCompleteSentences(
  input: string,
): {
  sentences: string[];
  remainder: string;
} {
  const sentences: string[] = [];
  let remainder = input;

  while (true) {
    const match = remainder.match(
      /^([\s\S]*?[.!?…]+(?:["'”’)\]]+)?)(?:\s+|$)/,
    );

    if (!match) {
      break;
    }

    const sentence = match[1]?.trim();

    if (!sentence) {
      break;
    }

    sentences.push(sentence);

    remainder = remainder
      .slice(match[0].length)
      .trimStart();
  }

  return {
    sentences,
    remainder,
  };
}


/* ============================================================
   STREAMING SPEECH QUEUE
   ============================================================ */

class StreamingSpeechQueue {
  private synthesisTail: Promise<void> =
    Promise.resolve();

  private playbackTail: Promise<void> =
    Promise.resolve();

  private currentAudio: HTMLAudioElement | null =
    null;

  private currentUrl: string | null = null;

  private currentResolve:
    (() => void) | null = null;

  private stopped = false;

  enqueue(
    text: string,
    voiceId: string | null | undefined,
    signal?: AbortSignal,
  ): Promise<void> {
    const clean = text.trim();

    if (!clean) {
      return this.playbackTail;
    }

    /*
     * Synthesis is serialized so Kokoro doesn't try to run
     * multiple GPU generations simultaneously.
     *
     * BUT synthesis of sentence 2 begins as soon as sentence 1's
     * synthesis finishes — which means it can happen while
     * sentence 1 is still playing.
     */
    const synthesisPromise = this.synthesisTail.then(
      async () => {
        if (
          this.stopped ||
          signal?.aborted
        ) {
          throw new DOMException(
            "Speech synthesis aborted.",
            "AbortError",
          );
        }

        return synthesizeSpeech({
          text: clean,
          voice:
            voiceId || DEFAULT_VOICE_ID,
          speed: DEFAULT_VOICE_SPEED,
          signal,
        });
      },
    );

    this.synthesisTail =
      synthesisPromise.then(
        () => undefined,
        () => undefined,
      );

    /*
     * Playback is strictly ordered.
     *
     * Even if sentence 2 finishes synthesizing before sentence 1
     * finishes playing, sentence 2 waits for sentence 1.
     */
    const previousPlayback =
      this.playbackTail.catch(
        () => undefined,
      );

    this.playbackTail =
      previousPlayback.then(
        async () => {
          if (
            this.stopped ||
            signal?.aborted
          ) {
            return;
          }

          const blob =
            await synthesisPromise;

          if (
            this.stopped ||
            signal?.aborted
          ) {
            return;
          }

          await this.playBlob(
            blob,
            signal,
          );
        },
      );

    return this.playbackTail;
  }

  private playBlob(
    blob: Blob,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise<void>(
      (resolve, reject) => {
        if (
          this.stopped ||
          signal?.aborted
        ) {
          resolve();
          return;
        }

        const url =
          URL.createObjectURL(blob);

        const audio = new Audio(url);

        this.currentAudio = audio;
        this.currentUrl = url;
        this.currentResolve = resolve;

        let finished = false;

        const cleanup = () => {
          if (signal) {
            signal.removeEventListener(
              "abort",
              handleAbort,
            );
          }

          audio.onended = null;
          audio.onerror = null;

          if (
            this.currentAudio === audio
          ) {
            this.currentAudio = null;
          }

          if (
            this.currentUrl === url
          ) {
            this.currentUrl = null;
          }

          if (
            this.currentResolve === resolve
          ) {
            this.currentResolve = null;
          }

          URL.revokeObjectURL(url);
        };

        const finish = () => {
          if (finished) {
            return;
          }

          finished = true;
          cleanup();
          resolve();
        };

        const fail = (
          error: Error,
        ) => {
          if (finished) {
            return;
          }

          finished = true;
          cleanup();
          reject(error);
        };

        const handleAbort = () => {
          audio.pause();
          audio.currentTime = 0;
          finish();
        };

        audio.onended = () => {
          finish();
        };

        audio.onerror = () => {
          fail(
            new Error(
              "Could not play the voice audio.",
            ),
          );
        };

        signal?.addEventListener(
          "abort",
          handleAbort,
          { once: true },
        );

        audio.play().catch(
          (error: unknown) => {
            fail(
              error instanceof Error
                ? error
                : new Error(
                    "Audio playback was blocked.",
                  ),
            );
          },
        );
      },
    );
  }

  waitForAll(): Promise<void> {
    return this.playbackTail;
  }

  stop() {
    this.stopped = true;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    this.currentResolve?.();

    this.currentResolve = null;

    if (this.currentUrl) {
      URL.revokeObjectURL(
        this.currentUrl,
      );
    }

    this.currentUrl = null;
    this.currentAudio = null;
  }
}


/* ============================================================
   HOOK
   ============================================================ */

export function useChat() {
  const [sending, setSending] =
    useState(false);

  const abortRef =
    useRef<AbortController | null>(
      null,
    );

  const revealRef =
    useRef<
      ReturnType<typeof setInterval> | null
    >(null);

  const speechQueueRef =
    useRef<StreamingSpeechQueue | null>(
      null,
    );


  /* ==========================================================
     REVEAL
     ========================================================== */

  const stopReveal = useCallback(() => {
    if (revealRef.current) {
      clearInterval(
        revealRef.current,
      );

      revealRef.current = null;
    }
  }, []);


  const reveal = useCallback(
    (
      messageId: string,
      fullText: string,
    ) =>
      new Promise<void>(
        (resolve) => {
          const {
            settings,
            patchMessage,
          } =
            useAppStore.getState();

          if (
            !settings.streamingReveal ||
            settings.animationLevel === "off"
          ) {
            patchMessage(
              messageId,
              {
                content: fullText,
                streaming: false,
              },
            );

            resolve();
            return;
          }

          let cursor = 0;

          stopReveal();

          revealRef.current =
            setInterval(() => {
              cursor = Math.min(
                fullText.length,
                cursor +
                  REVEAL_CHARS_PER_TICK,
              );

              patchMessage(
                messageId,
                {
                  content:
                    fullText.slice(
                      0,
                      cursor,
                    ),
                },
              );

              if (
                cursor >=
                fullText.length
              ) {
                stopReveal();

                patchMessage(
                  messageId,
                  {
                    streaming: false,
                  },
                );

                resolve();
              }
            }, REVEAL_TICK_MS);
        },
      ),
    [stopReveal],
  );


  /* ==========================================================
     SEND
     ========================================================== */

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();

      if (
        !trimmed ||
        sending
      ) {
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

      const history:
        ChatHistoryEntry[] =
        (
          conversation?.messages ??
          []
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
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      state.appendMessage(
        userMessage,
      );

      const placeholder: ChatMessage = {
        id: newMessageId(),
        role: "companion",
        content: "",
        createdAt: Date.now(),
        modelId,
        streaming: true,
      };

      state.appendMessage(
        placeholder,
      );

      setSending(true);

      state.setCompanionState(
        "thinking",
      );

      const controller =
        new AbortController();

      abortRef.current =
        controller;

      const signal =
        controller.signal;

      const voiceEnabled =
        useAppStore.getState()
          .settings.voiceEnabled;

      let speechQueue:
        | StreamingSpeechQueue
        | null = null;

      try {
        /*
         * ======================================================
         * VOICE ON:
         * Use the streaming endpoint.
         * ======================================================
         */

        if (voiceEnabled) {
          speechQueue =
            new StreamingSpeechQueue();

          speechQueueRef.current =
            speechQueue;

          let speechBuffer = "";

          let firstSpeechStarted =
            false;

          const reply =
            await streamChatMessage(
              {
                message: trimmed,
                history,
                systemPrompt:
                  companion?.systemPrompt,
                personality:
                  companion?.personality,
              },
              (
                delta,
                fullText,
              ) => {
                if (signal.aborted) {
                  return;
                }

                /*
                 * Show the LLM response as it streams.
                 */
                useAppStore
                  .getState()
                  .patchMessage(
                    placeholder.id,
                    {
                      content:
                        fullText,
                      streaming: true,
                    },
                  );

                if (!firstSpeechStarted) {
                  firstSpeechStarted =
                    true;

                  useAppStore
                    .getState()
                    .setCompanionState(
                      "talking",
                    );
                }

                /*
                 * Add incoming tokens to the
                 * speech buffer.
                 */
                speechBuffer +=
                  delta;

                const result =
                  takeCompleteSentences(
                    speechBuffer,
                  );

                speechBuffer =
                  result.remainder;

                /*
                 * Send each completed sentence
                 * to Kokoro immediately.
                 */
                for (const sentence of
                  result.sentences) {
                  void speechQueue?.enqueue(
                    sentence,
                    companion?.voice
                      .voiceId,
                    signal,
                  );
                }
              },
              signal,
            );

          /*
           * If the model ended without a final
           * punctuation mark, speak the remaining text.
           */
          if (
            !signal.aborted &&
            speechBuffer.trim()
          ) {
            void speechQueue.enqueue(
              speechBuffer.trim(),
              companion?.voice.voiceId,
              signal,
            );
          }

          /*
           * Streaming is finished.
           */
          useAppStore
            .getState()
            .patchMessage(
              placeholder.id,
              {
                content: reply,
                streaming: false,
              },
            );

          /*
           * Media still happens after the complete
           * response, exactly like before.
           */
          if (
            companion?.mediaResponses
              ?.enabled &&
            !signal.aborted
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
              .catch(
                () => undefined,
              );
          }

          /*
           * Keep the stop button live while
           * queued speech is still playing.
           */
          if (speechQueue) {
            try {
              await speechQueue.waitForAll();
            } catch (
              error
            ) {
              if (
                !signal.aborted
              ) {
                toast(
                  "Voice unavailable",
                  {
                    description:
                      error instanceof
                      Error
                        ? error.message
                        : "The local voice server did not respond.",
                  },
                );
              }
            }
          }

        /*
         * ======================================================
         * VOICE OFF:
         * Keep the original non-streaming chat behavior.
         * ======================================================
         */
        } else {
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
              signal,
            );

          useAppStore
            .getState()
            .setCompanionState(
              "talking",
            );

          await reveal(
            placeholder.id,
            reply,
          );

          if (
            companion?.mediaResponses
              ?.enabled &&
            !signal.aborted
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
              .catch(
                () => undefined,
              );
          }
        }
      } catch (
        error
      ) {
        stopReveal();

        if (signal.aborted) {
          useAppStore
            .getState()
            .patchMessage(
              placeholder.id,
              {
                streaming: false,
              },
            );

          return;
        }

        useAppStore
          .getState()
          .patchMessage(
            placeholder.id,
            {
              content:
                error instanceof
                Error
                  ? error.message
                  : "The local backend could not be reached.",
              streaming: false,
              error: true,
            },
          );
      } finally {
        speechQueue?.stop();

        if (
          speechQueueRef.current ===
          speechQueue
        ) {
          speechQueueRef.current =
            null;
        }

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


  /* ==========================================================
     CANCEL
     ========================================================== */

  const cancel = useCallback(() => {
    abortRef.current?.abort();

    speechQueueRef.current?.stop();

    speechQueueRef.current = null;

    stopReveal();

    stopSpeaking();

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