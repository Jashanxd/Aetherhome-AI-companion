import { getApiBaseUrl, postJson } from "./api";
import type { ChatMediaAttachment, CompanionMediaResponses } from "@/types";

/**
 * Companion-specific local media responses.
 *
 * Backend contract (FastAPI, implemented by the user):
 * - POST /media/config  { companion_id, enabled, folder_path, allowed_types, frequency, avoid_repeats }
 *     Registers the folder for that companion. The backend stores this as the
 *     only folder it will ever read for that companion.
 * - POST /media/next    { companion_id }
 *     Only the companion id is sent; the backend resolves the folder from its own
 *     registered config. Returns { media_id, filename, mime_type } or { media: null }.
 * - GET  /media/file/{media_id}
 *     Streams the original file unchanged (GIFs stay animated).
 */

interface RawNextMedia {
  media_id?: string;
  filename?: string;
  mime_type?: string;
  media?: null;
}

export async function syncMediaConfig(
  companionId: string,
  config: CompanionMediaResponses,
): Promise<void> {
  await postJson("/media/config", {
    companion_id: companionId,
    enabled: config.enabled,
    folder_path: config.folderPath,
    allowed_types: config.allowedTypes,
    frequency: config.frequency,
    avoid_repeats: config.avoidRepeats,
  });
}

/** Returns a reference to one media file, or null when none is eligible. */
export async function requestNextMedia(
  companionId: string,
  signal?: AbortSignal,
): Promise<ChatMediaAttachment | null> {
  const data = await postJson<RawNextMedia | null>(
    "/media/next",
    { companion_id: companionId },
    signal,
  );
  if (!data || typeof data.media_id !== "string" || data.media_id === "") return null;
  return {
    mediaId: data.media_id,
    filename: data.filename ?? data.media_id,
    mimeType: data.mime_type ?? "",
  };
}

/** Direct backend URL — used straight in <img>, never converted to a blob. */
export function mediaFileUrl(mediaId: string): string {
  return `${getApiBaseUrl()}/media/file/${encodeURIComponent(mediaId)}`;
}
