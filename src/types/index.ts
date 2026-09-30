/** Shared domain types for the local AI companion app. */

export type CompanionState =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "generating"
  | "offline";

/** Model lifecycle, ready for future loaded/active distinction from the backend. */
export type ModelAvailability = "available" | "loaded" | "active";

export interface LocalModel {
  /** Real model id reported by the backend (never hardcoded). */
  id: string;
  label: string;
  availability: ModelAvailability;
  ownedBy?: string | undefined;
}

/** Categories, not hardcoded models. A companion maps a category to a real id. */
export type ModelCategory = "fast" | "companion" | "quality";

export type ImageGenerationMode = "automatic" | "ask" | "manual";

export interface CompanionImageSettings {
  enabled: boolean;
  mode: ImageGenerationMode;
  /** Future local image model id (ComfyUI-style backend). */
  modelId: string | null;
  resolution: "512x512" | "768x768" | "1024x1024";
}

export interface CompanionVoiceSettings {
  enabled: boolean;
  voiceId: string | null;
}

export interface CompanionModelSettings {
  /** Preferred local model id, or null to follow the global selection. */
  preferredModelId: string | null;
  temperature: number;
  contextLength: number;
}

export interface CompanionMemorySettings {
  enabled: boolean;
  shortTermTurns: number;
  longTermEnabled: boolean;
}

export type MemoryKind = "fact" | "preference" | "summary";

/** Placeholder shape for future SQLite / vector retrieval. */
export interface MemoryEntry {
  id: string;
  companionId: string;
  kind: MemoryKind;
  content: string;
  createdAt: number;
}

export type MediaFileType = "jpg" | "jpeg" | "png" | "webp" | "gif";
export const MEDIA_FILE_TYPES: MediaFileType[] = ["jpg", "jpeg", "png", "webp", "gif"];

/** Companion-specific local media responses. Filesystem access happens only in the backend. */
export interface CompanionMediaResponses {
  enabled: boolean;
  folderPath: string | null;
  allowedTypes: MediaFileType[];
  frequency: "every_response";
  avoidRepeats: boolean;
}

/** Reference only — never a URL or blob, so nothing is duplicated into local storage. */
export interface ChatMediaAttachment {
  mediaId: string;
  filename: string;
  mimeType: string;
}

export interface CompanionAppearance {
  /** Accent hue used by the 3D presence + avatar ring. */
  hue: number;
  /** Future GLB/GLTF model path. */
  modelUrl: string | null;
  description: string;
}

export interface Companion {
  id: string;
  name: string;
  tagline: string;
  avatarInitials: string;
  personality: string;
  systemPrompt: string;
  model: CompanionModelSettings;
  voice: CompanionVoiceSettings;
  images: CompanionImageSettings;
  memory: CompanionMemorySettings;
  mediaResponses: CompanionMediaResponses;
  appearance: CompanionAppearance;
}

export type MessageRole = "user" | "companion";

export interface ChatImage {
  /** Populated only by a real local image backend. */
  url: string;
  prompt: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  modelId?: string | null;
  /** Streaming-style reveal in progress. */
  streaming?: boolean;
  error?: boolean;
  imagePending?: boolean;
  image?: ChatImage;
  media?: ChatMediaAttachment;
}

export interface Conversation {
  id: string;
  companionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type BackendStatus = "checking" | "online" | "offline";

export interface GlobalSettings {
  companion3dEnabled: boolean;
  showCompanionPanel: boolean;
  companionSize: "small" | "medium" | "large";
  companionPosition: "left" | "center" | "right";
  animationLevel: "full" | "reduced" | "off";
  voiceEnabled: boolean;
  imagesEnabled: boolean;
  imageMode: ImageGenerationMode;
  memoryEnabled: boolean;
  apiBaseUrl: string;
  streamingReveal: boolean;
}
