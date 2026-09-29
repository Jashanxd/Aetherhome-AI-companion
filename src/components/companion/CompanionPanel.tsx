import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { PanelRightClose, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateBadge } from "@/components/companion/StateBadge";
import type { Companion, CompanionState, GlobalSettings } from "@/types";

const Companion3D = lazy(() =>
  import("@/components/companion/Companion3D").then((m) => ({ default: m.Companion3D })),
);

const SIZE_CLASS = {
  small: "h-56",
  medium: "h-80",
  large: "h-[26rem]",
} as const;

interface CompanionPanelProps {
  companion: Companion;
  state: CompanionState;
  settings: GlobalSettings;
  onHide: () => void;
}

export function CompanionPanel({
  companion,
  state,
  settings,
  onHide,
}: CompanionPanelProps) {
  return (
    <aside className="hidden w-[22rem] shrink-0 flex-col gap-4 border-l border-border bg-sidebar/60 p-5 xl:flex">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Companion presence
        </span>
        <Button variant="ghost" size="icon" onClick={onHide} aria-label="Hide companion">
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      <div className="panel aurora relative overflow-hidden">
        <div className={`${SIZE_CLASS[settings.companionSize]} w-full`}>
          {settings.companion3dEnabled ? (
            <ClientOnly
              fallback={
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Preparing presence…
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    Preparing presence…
                  </div>
                }
              >
                <Companion3D
                  state={state}
                  hue={companion.appearance.hue}
                  animation={settings.animationLevel}
                  className="size-full"
                />
              </Suspense>
            </ClientOnly>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="size-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">3D companion is turned off</p>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
          <h3 className="font-display text-lg font-medium tracking-tight">{companion.name}</h3>
          <StateBadge state={state} />
        </div>
      </div>

      <div className="panel space-y-3 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Appearance
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {companion.appearance.description}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {companion.appearance.modelUrl
            ? `3D model: ${companion.appearance.modelUrl}`
            : "No GLB/GLTF character loaded — placeholder presence active."}
        </p>
      </div>

      <div className="panel space-y-3 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Memory
        </p>
        <p className="text-sm text-muted-foreground">
          {companion.memory.enabled
            ? `Short-term memory keeps the last ${companion.memory.shortTermTurns} turns.`
            : "Memory is disabled for this companion."}
        </p>
        <p className="text-xs text-muted-foreground/70">
          Long-term memory storage is not connected yet.
        </p>
      </div>
    </aside>
  );
}
