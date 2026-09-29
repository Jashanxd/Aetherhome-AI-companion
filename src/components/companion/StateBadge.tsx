import type { CompanionState } from "@/types";

const LABELS: Record<CompanionState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  talking: "Speaking",
  generating: "Generating image",
  offline: "Offline",
};

const DOT: Record<CompanionState, string> = {
  idle: "bg-primary/70",
  listening: "bg-primary",
  thinking: "bg-accent",
  talking: "bg-success",
  generating: "bg-accent",
  offline: "bg-muted-foreground/60",
};

export function StateBadge({ state }: { state: CompanionState }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
      <span
        className={`size-1.5 rounded-full ${DOT[state]} ${
          state === "offline" ? "" : "animate-pulse-soft"
        }`}
      />
      {LABELS[state]}
    </span>
  );
}
