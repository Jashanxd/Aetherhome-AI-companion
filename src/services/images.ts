import type { ChatImage } from "@/types";

/**
 * Placeholder seam for a future local image backend (ComfyUI-style).
 * Nothing is faked: until a real endpoint exists this always reports
 * that image generation is unavailable.
 */
export interface ImageGenerationRequest {
  prompt: string;
  resolution: string;
  modelId: string | null;
}

export const imageGenerationAvailable = false;

export async function generateImage(_req: ImageGenerationRequest): Promise<ChatImage> {
  throw new Error("Local image generation is not connected yet.");
}
