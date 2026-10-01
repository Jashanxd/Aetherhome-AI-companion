import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  ArrowUp,
  ImageIcon,
  Mic,
  Paperclip,
  Square,
} from "lucide-react";

import { MicVAD } from "@ricky0123/vad-web";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { transcribeAudio } from "@/services/stt";

interface ComposerProps {
  disabled?: boolean;
  sending: boolean;
  onSend: (
    text: string,
  ) => void | Promise<void>;
  onCancel: () => void;
}

type HandsFreeVAD = Awaited<
  ReturnType<typeof MicVAD.new>
>;

export function Composer({
  disabled,
  sending,
  onSend,
  onCancel,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const [handsFreeActive, setHandsFreeActive] =
    useState(false);

  const [transcribing, setTranscribing] =
    useState(false);

  const settings = useAppStore(
    (s) => s.settings,
  );

  const setCompanionState = useAppStore(
    (s) => s.setCompanionState,
  );

  const vadRef =
    useRef<HandsFreeVAD | null>(null);

  const mountedRef =
    useRef(true);

  const sttAbortRef =
    useRef<AbortController | null>(null);

  /*
   * IMPORTANT:
   * A VAD callback can live longer than the React render
   * that created it. This ref always contains the current
   * hands-free state.
   */
  const handsFreeActiveRef =
    useRef(false);

  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      handsFreeActiveRef.current = false;

      sttAbortRef.current?.abort();

      vadRef.current?.pause();
      vadRef.current = null;
    };
  }, []);

  /* ============================================================
     KEEP VAD OFF WHEN VOICE IS DISABLED
     ============================================================ */

  useEffect(() => {
    if (
      !settings.voiceEnabled &&
      handsFreeActiveRef.current
    ) {
      handsFreeActiveRef.current = false;

      vadRef.current?.pause();

      setHandsFreeActive(false);

      setCompanionState("idle");
    }
  }, [
    settings.voiceEnabled,
    setCompanionState,
  ]);

  /* ============================================================
     SEND TYPED MESSAGE
     ============================================================ */

  const submit = useCallback(() => {
    if (
      !value.trim() ||
      sending ||
      disabled
    ) {
      return;
    }

    const text = value.trim();

    setValue("");

    void onSend(text);
  }, [
    value,
    sending,
    disabled,
    onSend,
  ]);

  /* ============================================================
     KEYBOARD
     ============================================================ */

  const onKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      submit();
    }
  };

  /* ============================================================
     START HANDS-FREE
     ============================================================ */

  const startHandsFree =
    useCallback(async () => {
      if (
        handsFreeActiveRef.current ||
        disabled
      ) {
        return;
      }

      if (!settings.voiceEnabled) {
        toast("Voice is off", {
          description:
            "Turn voice on in settings.",
        });

        return;
      }

      try {
        /*
         * Set the ref BEFORE creating the VAD.
         * This guarantees the VAD callback sees the
         * correct active state later.
         */
        handsFreeActiveRef.current = true;

        setHandsFreeActive(true);

        setCompanionState("listening");

        const vad =
          await MicVAD.new({
            model: "v6",

            /*
             * VAD + ONNX assets are served directly
             * by the local STT server.
             */
            baseAssetPath:
              "http://127.0.0.1:8002/vad/",

            onnxWASMBasePath:
              "http://127.0.0.1:8002/vad/",

            /*
             * Silence required to finish an utterance.
             */
            redemptionMs: 800,

            /*
             * Ignore tiny noises/clicks.
             */
            minSpeechMs: 250,

            /*
             * Preserve a little audio before
             * speech detection.
             */
            preSpeechPadMs: 500,

            onSpeechStart: () => {
              if (
                !mountedRef.current
              ) {
                return;
              }

              setCompanionState(
                "listening",
              );
            },

            onVADMisfire: () => {
              if (
                !mountedRef.current
              ) {
                return;
              }

              setCompanionState(
                "listening",
              );
            },

            onSpeechEnd:
              async (audio) => {
                if (
                  !mountedRef.current ||
                  !handsFreeActiveRef.current
                ) {
                  return;
                }

                /*
                 * Pause while this utterance is
                 * being transcribed and answered.
                 */
                vad.pause();

                setTranscribing(true);

                setCompanionState(
                  "thinking",
                );

                const controller =
                  new AbortController();

                sttAbortRef.current =
                  controller;

                try {
                  const text =
                    await transcribeAudio(
                      audio,
                      controller.signal,
                    );

                  if (
                    !text ||
                    text.trim().length < 2
                  ) {
                    return;
                  }

                  if (
                    !mountedRef.current ||
                    controller.signal.aborted ||
                    !handsFreeActiveRef.current
                  ) {
                    return;
                  }

                  /*
                   * Use the exact same send path
                   * as typed messages.
                   */
                  await onSend(
                    text.trim(),
                  );
                } catch (error) {
                  if (
                    controller.signal.aborted
                  ) {
                    return;
                  }

                  console.error(
                    "Speech transcription failed:",
                    error,
                  );

                  toast(
                    "Voice input failed",
                    {
                      description:
                        error instanceof
                        Error
                          ? error.message
                          : "The local STT server did not respond.",
                    },
                  );
                } finally {
                  if (
                    sttAbortRef.current ===
                    controller
                  ) {
                    sttAbortRef.current =
                      null;
                  }

                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setTranscribing(false);

                  /*
                   * Read the CURRENT state rather than
                   * the state captured when the VAD was created.
                   */
                  const currentVoiceEnabled =
                    useAppStore.getState()
                      .settings.voiceEnabled;

                  if (
                    handsFreeActiveRef.current &&
                    !disabled &&
                    currentVoiceEnabled
                  ) {
                    try {
                      setCompanionState(
                        "listening",
                      );

                      /*
                       * Reuse the same VAD instance.
                       * We do NOT recreate it after every utterance.
                       */
                      vad.start();
                    } catch (error) {
                      console.error(
                        "Failed to resume VAD:",
                        error,
                      );

                      handsFreeActiveRef.current =
                        false;

                      setHandsFreeActive(
                        false,
                      );

                      setCompanionState(
                        "idle",
                      );

                      toast(
                        "Voice listening stopped",
                        {
                          description:
                            "The microphone listener could not resume.",
                        },
                      );
                    }
                  } else {
                    setCompanionState(
                      "idle",
                    );
                  }
                }
              },
          });

        if (
          !mountedRef.current ||
          !handsFreeActiveRef.current
        ) {
          vad.pause();
          return;
        }

        vadRef.current = vad;

        vad.start();

        setCompanionState(
          "listening",
        );

        toast(
          "Hands-free voice enabled",
          {
            description:
              "Speak normally. Aetherhome will listen automatically.",
          },
        );
      } catch (error) {
        console.error(
          "Failed to start voice input:",
          error,
        );

        handsFreeActiveRef.current =
          false;

        setHandsFreeActive(false);

        setCompanionState(
          "idle",
        );

        toast(
          "Microphone unavailable",
          {
            description:
              error instanceof
              Error
                ? error.message
                : "Could not start the local microphone.",
          },
        );
      }
    }, [
      disabled,
      settings.voiceEnabled,
      onSend,
      setCompanionState,
    ]);

  /* ============================================================
     STOP HANDS-FREE
     ============================================================ */

  const stopHandsFree =
    useCallback(() => {
      handsFreeActiveRef.current =
        false;

      sttAbortRef.current?.abort();

      sttAbortRef.current = null;

      vadRef.current?.pause();

      setHandsFreeActive(false);

      setTranscribing(false);

      setCompanionState("idle");

      toast(
        "Hands-free voice disabled",
      );
    }, [
      setCompanionState,
    ]);

  /* ============================================================
     TOGGLE
     ============================================================ */

  const toggleHandsFree =
    useCallback(() => {
      if (
        handsFreeActiveRef.current
      ) {
        stopHandsFree();
      } else {
        void startHandsFree();
      }
    }, [
      stopHandsFree,
      startHandsFree,
    ]);

  /* ============================================================
     UI
     ============================================================ */

  return (
    <div className="border-t border-border bg-background/80 px-6 py-4 backdrop-blur xl:px-10">
      <div className="mx-auto max-w-3xl">

        <div className="panel flex items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-ring">

          <div className="flex items-center gap-0.5 pb-1 pl-1">

            {/* ==================================================
                MICROPHONE
               ================================================== */}

            <Button
              variant="ghost"
              size="icon"
              aria-label={
                handsFreeActive
                  ? "Disable hands-free voice"
                  : "Enable hands-free voice"
              }
              aria-pressed={
                handsFreeActive
              }
              onClick={
                toggleHandsFree
              }
              disabled={disabled}
              className={
                handsFreeActive
                  ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                  : ""
              }
            >
              <Mic
                className={`size-4 ${
                  handsFreeActive ||
                  settings.voiceEnabled
                    ? "text-primary"
                    : ""
                }`}
              />
            </Button>

            {/* ==================================================
                IMAGE
               ================================================== */}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Generate image"
              onClick={() =>
                toast(
                  settings.imagesEnabled
                    ? "Image generation isn't connected yet"
                    : "Image generation is off",
                  {
                    description:
                      settings.imagesEnabled
                        ? "A local image backend will handle this."
                        : "Turn images on in the header or settings.",
                  },
                )
              }
            >
              <ImageIcon
                className={`size-4 ${
                  settings.imagesEnabled
                    ? "text-accent"
                    : ""
                }`}
              />
            </Button>

            {/* ==================================================
                ATTACHMENT
               ================================================== */}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Attach file"
              disabled
            >
              <Paperclip className="size-4" />
            </Button>
          </div>

          {/* ====================================================
              TEXT INPUT
             ==================================================== */}

          <Textarea
            value={value}
            onChange={(e) =>
              setValue(
                e.target.value,
              )
            }
            onKeyDown={
              onKeyDown
            }
            rows={1}
            placeholder={
              disabled
                ? "Select an available model to chat"
                : handsFreeActive
                  ? transcribing
                    ? "Listening paused — transcribing…"
                    : "Hands-free voice active…"
                  : "Message your companion…"
            }
            className="max-h-40 min-h-11 resize-none border-0 bg-transparent px-1 py-2.5 text-sm shadow-none focus-visible:ring-0"
          />

          {/* ====================================================
              SEND / STOP
             ==================================================== */}

          {sending ? (
            <Button
              variant="secondary"
              size="icon"
              className="mb-1 mr-1"
              onClick={onCancel}
              aria-label="Stop"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="mb-1 mr-1"
              onClick={submit}
              disabled={
                !value.trim() ||
                disabled
              }
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>

        <p className="mt-2 px-1 text-[11px] text-muted-foreground/60">
          {handsFreeActive
            ? transcribing
              ? "Processing your voice…"
              : "Hands-free listening active"
            : "Enter to send · Shift + Enter for a new line · Runs locally"}
        </p>

      </div>
    </div>
  );
}
