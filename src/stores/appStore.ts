import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultCompanions, createCompanion, defaultMediaResponses } from "@/data/companions";

const firstCompanion = defaultCompanions[0]!;
import type {
  ChatMessage,
  Companion,
  CompanionState,
  Conversation,
  GlobalSettings,
  LocalModel,
  MemoryEntry,
} from "@/types";
import { DEFAULT_API_BASE_URL } from "@/services/api";

const id = () => Math.random().toString(36).slice(2, 11);

function newConversation(companionId: string): Conversation {
  const now = Date.now();
  return {
    id: id(),
    companionId,
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

const initialConversation = newConversation(firstCompanion.id);

export const defaultSettings: GlobalSettings = {
  companion3dEnabled: true,
  showCompanionPanel: true,
  companionSize: "medium",
  companionPosition: "right",
  animationLevel: "full",
  voiceEnabled: false,
  imagesEnabled: false,
  imageMode: "ask",
  memoryEnabled: true,
  apiBaseUrl: DEFAULT_API_BASE_URL,
  streamingReveal: true,
};

interface AppState {
  companions: Companion[];
  activeCompanionId: string;
  conversations: Conversation[];
  activeConversationId: string;

  models: LocalModel[];
  selectedModelId: string | null;
  modelsLoading: boolean;
  modelsError: string | null;

  companionState: CompanionState;
  sidebarCollapsed: boolean;
  settings: GlobalSettings;
  memories: MemoryEntry[];

  // companions
  setActiveCompanion: (companionId: string) => void;
  addCompanion: (input: { name: string; tagline?: string; personality?: string }) => string;
  updateCompanion: (companionId: string, patch: Partial<Companion>) => void;
  removeCompanion: (companionId: string) => void;

  // conversations
  startConversation: (companionId?: string) => void;
  setActiveConversation: (conversationId: string) => void;
  removeConversation: (conversationId: string) => void;
  appendMessage: (message: ChatMessage) => void;
  patchMessage: (messageId: string, patch: Partial<ChatMessage>) => void;

  // models
  setModels: (models: LocalModel[]) => void;
  setSelectedModel: (modelId: string | null) => void;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: string | null) => void;

  // ui
  setCompanionState: (state: CompanionState) => void;
  toggleSidebar: () => void;
  updateSettings: (patch: Partial<GlobalSettings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      companions: defaultCompanions,
      activeCompanionId: firstCompanion.id,
      conversations: [initialConversation],
      activeConversationId: initialConversation.id,

      models: [],
      selectedModelId: null,
      modelsLoading: false,
      modelsError: null,

      companionState: "idle",
      sidebarCollapsed: false,
      settings: defaultSettings,
      memories: [],

      setActiveCompanion: (companionId) => {
        const existing = get().conversations.filter((c) => c.companionId === companionId);
        const latest = [...existing].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (latest) {
          set({ activeCompanionId: companionId, activeConversationId: latest.id });
          return;
        }
        const conversation = newConversation(companionId);
        set((s) => ({
          activeCompanionId: companionId,
          conversations: [conversation, ...s.conversations],
          activeConversationId: conversation.id,
        }));
      },

      addCompanion: (input) => {
        const companion = createCompanion(input);
        const conversation = newConversation(companion.id);
        set((s) => ({
          companions: [...s.companions, companion],
          conversations: [conversation, ...s.conversations],
          activeCompanionId: companion.id,
          activeConversationId: conversation.id,
        }));
        return companion.id;
      },

      updateCompanion: (companionId, patch) =>
        set((s) => ({
          companions: s.companions.map((c) =>
            c.id === companionId ? { ...c, ...patch } : c,
          ),
        })),

      removeCompanion: (companionId) =>
        set((s) => {
          if (s.companions.length <= 1) return s;
          const companions = s.companions.filter((c) => c.id !== companionId);
          const nextCompanion = companions[0];
          if (!nextCompanion) return s;
          const conversations = s.conversations.filter((c) => c.companionId !== companionId);
          const activeCompanionId =
            s.activeCompanionId === companionId ? nextCompanion.id : s.activeCompanionId;
          const pool = conversations.filter((c) => c.companionId === activeCompanionId);
          const fallback = pool[0] ?? newConversation(activeCompanionId);
          return {
            companions,
            conversations: pool.length ? conversations : [fallback, ...conversations],
            activeCompanionId,
            activeConversationId: fallback.id,
          };
        }),

      startConversation: (companionId) => {
        const target = companionId ?? get().activeCompanionId;
        const conversation = newConversation(target);
        set((s) => ({
          conversations: [conversation, ...s.conversations],
          activeCompanionId: target,
          activeConversationId: conversation.id,
        }));
      },

      setActiveConversation: (conversationId) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation) return;
        set({
          activeConversationId: conversationId,
          activeCompanionId: conversation.companionId,
        });
      },

      removeConversation: (conversationId) =>
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== conversationId);
          const firstRemaining = conversations[0];
          if (!firstRemaining) {
            const fresh = newConversation(s.activeCompanionId);
            return { conversations: [fresh], activeConversationId: fresh.id };
          }
          return {
            conversations,
            activeConversationId:
              s.activeConversationId === conversationId
                ? firstRemaining.id
                : s.activeConversationId,
          };
        }),

      appendMessage: (message) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== s.activeConversationId) return c;
            const isFirstUser = c.messages.length === 0 && message.role === "user";
            return {
              ...c,
              title: isFirstUser ? message.content.slice(0, 48) : c.title,
              updatedAt: Date.now(),
              messages: [...c.messages, message],
            };
          }),
        })),

      patchMessage: (messageId, patch) =>
        set((s) => ({
          conversations: s.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
          })),
        })),

      setModels: (models) => set({ models }),
      setSelectedModel: (modelId) => set({ selectedModelId: modelId }),
      setModelsLoading: (modelsLoading) => set({ modelsLoading }),
      setModelsError: (modelsError) => set({ modelsError }),

      setCompanionState: (companionState) => set({ companionState }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: "local-companion-store",
      version: 2,
      skipHydration: true,
      migrate: (persisted, fromVersion) => {
        const data = (persisted ?? {}) as { companions?: Array<Record<string, unknown>> };
        if (fromVersion < 2 && Array.isArray(data.companions)) {
          data.companions = data.companions.map((c) => ({
            ...c,
            mediaResponses: c["mediaResponses"] ?? defaultMediaResponses(),
          }));
        }
        return data as never;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        companions: state.companions,
        activeCompanionId: state.activeCompanionId,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        selectedModelId: state.selectedModelId,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings,
        memories: state.memories,
      }),
    },
  ),
);

export const newMessageId = id;
