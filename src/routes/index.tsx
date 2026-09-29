import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { CompanionPanel } from "@/components/companion/CompanionPanel";
import { AddCompanionDialog } from "@/components/settings/AddCompanionDialog";
import { CompanionSettingsDialog } from "@/components/settings/CompanionSettingsDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useAppStore } from "@/stores/appStore";
import { useModels } from "@/hooks/useModels";
import { useChat } from "@/hooks/useChat";
import { useHydrateStore } from "@/hooks/useHydrateStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aetherhome — Local AI Companion" },
      {
        name: "description",
        content:
          "A private AI companion that runs entirely on your own PC: local models, local voice, local memory and a living 3D presence.",
      },
      { property: "og:title", content: "Aetherhome — Local AI Companion" },
      {
        property: "og:description",
        content:
          "A private AI companion that runs entirely on your own PC: local models, local voice, local memory and a living 3D presence.",
      },
    ],
  }),
  component: CompanionWorkspace,
});

function CompanionWorkspace() {
  const hydrated = useHydrateStore();
  const { refresh, status } = useModels(hydrated);
  const { send, cancel, sending } = useChat();

  const companions = useAppStore((s) => s.companions);
  const activeCompanionId = useAppStore((s) => s.activeCompanionId);
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const companionState = useAppStore((s) => s.companionState);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const selectedModelId = useAppStore((s) => s.selectedModelId);
  const models = useAppStore((s) => s.models);

  const [addOpen, setAddOpen] = useState(false);
  const [companionSettingsOpen, setCompanionSettingsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const companion = companions.find((c) => c.id === activeCompanionId) ?? companions[0];
  const conversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  const effectiveModelId = companion.model.preferredModelId ?? selectedModelId;
  const modelReady =
    status === "online" &&
    !!effectiveModelId &&
    (models.length === 0 || models.some((m) => m.id === effectiveModelId));

  const displayedState = status === "offline" ? "offline" : companionState;
  const showPanel = settings.showCompanionPanel;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar onAddCompanion={() => setAddOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          companion={companion}
          state={displayedState}
          backendStatus={status}
          onRefreshModels={refresh}
          onOpenCompanionSettings={() => setCompanionSettingsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          showCompanionToggle={!showPanel}
          onShowCompanion={() => updateSettings({ showCompanionPanel: true })}
        />

        <div className="flex min-h-0 flex-1 flex-col aurora">
          <MessageList messages={conversation?.messages ?? []} companion={companion} />
          <Composer
            sending={sending}
            disabled={!modelReady}
            onSend={send}
            onCancel={cancel}
          />
        </div>
      </main>

      {showPanel && (
        <CompanionPanel
          companion={companion}
          state={displayedState}
          settings={settings}
          onHide={() => updateSettings({ showCompanionPanel: false })}
        />
      )}

      <AddCompanionDialog open={addOpen} onOpenChange={setAddOpen} />
      <CompanionSettingsDialog
        companion={companion}
        open={companionSettingsOpen}
        onOpenChange={setCompanionSettingsOpen}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onRefreshModels={refresh}
      />
    </div>
  );
}
