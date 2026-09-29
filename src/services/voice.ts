/**
 * Placeholder seam for local speech-to-text / text-to-speech.
 * Voice is intentionally not implemented yet; the UI only reflects the toggle.
 */
export const voiceAvailable = false;

export interface VoiceOption {
  id: string;
  label: string;
}

/** Populated later by the local voice backend. */
export async function listVoices(): Promise<VoiceOption[]> {
  return [];
}

export async function speak(_text: string, _voiceId: string | null): Promise<void> {
  throw new Error("Local text-to-speech is not connected yet.");
}

export async function transcribe(_audio: Blob): Promise<string> {
  throw new Error("Local speech-to-text is not connected yet.");
}
