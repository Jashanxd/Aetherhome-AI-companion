import type { Companion, CompanionMediaResponses } from "@/types";

export function defaultMediaResponses(): CompanionMediaResponses {
  return {
    enabled: false,
    folderPath: null,
    allowedTypes: ["jpg", "jpeg", "png", "webp", "gif"],
    frequency: "every_response",
    avoidRepeats: true,
  };
}

export function createCompanion(partial: Partial<Companion> & { name: string }): Companion {
  const id = partial.id ?? `companion-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name: partial.name,
    tagline: partial.tagline ?? "Local companion",
    avatarInitials:
      partial.avatarInitials ?? partial.name.trim().slice(0, 2).toUpperCase(),
    personality: partial.personality ?? "Warm, curious and direct. Placeholder personality.",
    systemPrompt:
      partial.systemPrompt ??
      `You are ${partial.name}, a local AI companion running on the user's own machine. Be warm, concise and genuine.`,
    model: partial.model ?? {
      preferredModelId: null,
      temperature: 0.7,
      contextLength: 8192,
    },
    voice: partial.voice ?? { enabled: false, voiceId: null },
    images: partial.images ?? {
      enabled: false,
      mode: "ask",
      modelId: null,
      resolution: "768x768",
    },
    memory: partial.memory ?? {
      enabled: true,
      shortTermTurns: 12,
      longTermEnabled: false,
    },
    mediaResponses: partial.mediaResponses ?? defaultMediaResponses(),
    appearance: partial.appearance ?? {
      hue: 195,
      modelUrl: null,
      description: "Placeholder appearance — soft light form, calm presence.",
    },
  };
}

/** Initial companion. Personality and appearance are placeholder data. */
export const defaultCompanions: Companion[] = [
  createCompanion({
    id: "mia",
    name: "Mia",
    tagline: "Your everyday presence",
    avatarInitials: "MI",
    personality:
      "Placeholder personality: attentive, playful, a little dry. Remembers small details and asks good follow-up questions.",
    systemPrompt:
      "You are Mia, a local AI companion running entirely on the user's own PC. You are attentive, warm and a little playful. Keep replies natural and concise unless depth is asked for.",
    appearance: {
      hue: 195,
      modelUrl: null,
      description:
        "Placeholder appearance: a luminous drifting form with soft internal light and slow orbiting particles.",
    },
  }),
];
