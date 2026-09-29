import { ImageIcon, Mic, PanelRightOpen, Settings2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ModelSelector } from "@/components/models/ModelSelector";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { StateBadge } from "@/components/companion/StateBadge";
import { useAppStore } from "@/stores/appStore";
import type { BackendStatus, Companion, CompanionState } from "@/types";

interface ChatHeaderProps {
  companion: Companion;
  state: CompanionState;
  backendStatus: BackendStatus;
  onRefreshModels: () => void;
  onOpenCompanionSettings: () => void;
  onOpenSettings: () => void;
  showCompanionToggle: boolean;
  onShowCompanion: () => void;
}

export function ChatHeader({
  companion,
  state,
  backendStatus,
  onRefreshModels,
  onOpenCompanionSettings,
  onOpenSettings,
  showCompanionToggle,
  onShowCompanion,
}: ChatHeaderProps) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-background/70 px-6 py-3 backdrop-blur xl:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <CompanionAvatar companion={companion} size={38} active={state !== "offline"} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-base font-medium tracking-tight">
              {companion.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                backendStatus === "online"
                  ? "border-success/35 bg-success/10 text-success"
                  : backendStatus === "checking"
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-destructive/35 bg-destructive/10 text-destructive"
              }`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {backendStatus === "online"
                ? "Local"
                : backendStatus === "checking"
                  ? "Connecting"
                  : "Backend offline"}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{companion.tagline}</p>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="hidden lg:block">
          <StateBadge state={state} />
        </div>

        <ModelSelector onRefresh={onRefreshModels} />

        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <ImageIcon
            className={`size-3.5 ${settings.imagesEnabled ? "text-accent" : "text-muted-foreground"}`}
          />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Images {settings.imagesEnabled ? "on" : "off"}
          </span>
          <Switch
            checked={settings.imagesEnabled}
            onCheckedChange={(imagesEnabled) => updateSettings({ imagesEnabled })}
            aria-label="Toggle image generation"
          />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <Mic
            className={`size-3.5 ${settings.voiceEnabled ? "text-primary" : "text-muted-foreground"}`}
          />
          <Switch
            checked={settings.voiceEnabled}
            onCheckedChange={(voiceEnabled) => updateSettings({ voiceEnabled })}
            aria-label="Toggle voice"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenCompanionSettings}
          aria-label="Companion settings"
          title="Companion settings"
        >
          <Sliders className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <Settings2 className="size-4" />
        </Button>
        {showCompanionToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowCompanion}
            aria-label="Show companion"
            title="Show companion"
          >
            <PanelRightOpen className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
