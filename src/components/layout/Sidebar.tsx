import {
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { useAppStore } from "@/stores/appStore";

interface SidebarProps {
  onAddCompanion: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onAddCompanion, onOpenSettings }: SidebarProps) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const companions = useAppStore((s) => s.companions);
  const activeCompanionId = useAppStore((s) => s.activeCompanionId);
  const setActiveCompanion = useAppStore((s) => s.setActiveCompanion);
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const removeConversation = useAppStore((s) => s.removeConversation);
  const startConversation = useAppStore((s) => s.startConversation);

  const companionConversations = conversations
    .filter((c) => c.companionId === activeCompanionId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300 ${
        collapsed ? "w-[4.5rem]" : "w-[17.5rem]"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/12 text-primary">
          <span className="size-2 rounded-full bg-primary shadow-glow" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-medium tracking-tight">Aetherhome</p>
            <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Local companion
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-4">
          {!collapsed && (
            <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Companions
            </p>
          )}
          <div className="space-y-1">
            {companions.map((companion) => {
              const active = companion.id === activeCompanionId;
              return (
                <button
                  key={companion.id}
                  onClick={() => setActiveCompanion(companion.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                  title={companion.name}
                >
                  <CompanionAvatar companion={companion} size={28} active={active} />
                  {!collapsed && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{companion.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {companion.tagline}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
            <Button
              variant="ghost"
              onClick={onAddCompanion}
              className={`w-full justify-start gap-2.5 text-muted-foreground ${collapsed ? "px-2" : ""}`}
            >
              <Plus className="size-4" />
              {!collapsed && <span className="text-sm">Add companion</span>}
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-2 pb-2">
            {!collapsed && (
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Conversations
              </p>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => startConversation()}
              aria-label="New conversation"
              title="New conversation"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
          {!collapsed && (
            <div className="space-y-0.5">
              {companionConversations.map((conversation) => {
                const active = conversation.id === activeConversationId;
                return (
                  <div
                    key={conversation.id}
                    className={`group flex items-center gap-1 rounded-lg px-2 transition-colors ${
                      active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <button
                      onClick={() => setActiveConversation(conversation.id)}
                      className="min-w-0 flex-1 py-2 text-left"
                    >
                      <span
                        className={`block truncate text-sm ${
                          active ? "text-sidebar-accent-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {conversation.title}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeConversation(conversation.id)}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          onClick={onOpenSettings}
          className={`w-full justify-start gap-2.5 text-muted-foreground ${collapsed ? "px-2" : ""}`}
        >
          <Settings className="size-4" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </Button>
      </div>
    </aside>
  );
}
