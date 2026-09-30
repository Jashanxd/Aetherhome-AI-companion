/**
 * Local voice seam. Text-to-speech uses the local Kokoro server via
 * services/api.ts. Speech-to-text is not connected yet.
 */
import { synthesizeSpeech } from "./api";

export const voiceAvailable = true;

export const DEFAULT_VOICE_ID = "af_heart";
export const DEFAULT_VOICE_SPEED = 1.0;

export interface VoiceOption {
  id: string;
  label: string;
}

/** Populated later by the local voice backend. */
export async function listVoices(): Promise<VoiceOption[]> {
  return [];
}

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let currentFinish: (() => void) | null = null;

/** Stop any playing speech immediately. */
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
  }
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentAudio = null;
  currentUrl = null;
  const finish = currentFinish;
  currentFinish = null;
  finish?.();
}

/**
 * Synthesize `text` and play it. Resolves when playback ends or is stopped.
 * Rejects only on synthesis/playback failure (callers should treat as non-fatal).
 */
export async function speak(
  text: string,
  options: { voiceId?: string | null | undefined; speed?: number | undefined; signal?: AbortSignal | undefined } = {},
): Promise<void> {
  const { signal } = options;
  if (!text.trim() || signal?.aborted) return;

  let blob: Blob;
  try {
    blob = await synthesizeSpeech({
      text,
      voice: options.voiceId || DEFAULT_VOICE_ID,
      speed: options.speed ?? DEFAULT_VOICE_SPEED,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) return;
    throw error;
  }
  if (signal?.aborted) return;

  stopSpeaking();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentUrl = url;

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => stopSpeaking();
    currentFinish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => stopSpeaking();
    audio.onerror = () => {
      stopSpeaking();
      reject(new Error("Could not play the voice audio."));
    };
    audio.play().catch((error: unknown) => {
      stopSpeaking();
      reject(error instanceof Error ? error : new Error("Audio playback was blocked."));
    });
  });
}

export async function transcribe(_audio: Blob): Promise<string> {
  throw new Error("Local speech-to-text is not connected yet.");
}
