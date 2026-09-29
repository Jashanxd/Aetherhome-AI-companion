import { RefreshCw, Cpu, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";

export function ModelSelector({ onRefresh }: { onRefresh: () => void }) {
  const models = useAppStore((s) => s.models);
  const selectedModelId = useAppStore((s) => s.selectedModelId);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const loading = useAppStore((s) => s.modelsLoading);

  const selectedMissing =
    !!selectedModelId && models.length > 0 && !models.some((m) => m.id === selectedModelId);

  return (
    <div className="flex items-center gap-1.5">
      <Select
        {...(selectedMissing || !selectedModelId ? {} : { value: selectedModelId })}
        onValueChange={setSelectedModel}
        onOpenChange={(open) => {
          if (open) onRefresh();
        }}
      >
        <SelectTrigger className="h-9 w-[15rem] border-border bg-surface text-sm">
          <Cpu className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
          <SelectValue
            placeholder={
              loading
                ? "Loading models…"
                : models.length === 0
                  ? "No models available"
                  : selectedMissing
                    ? "Model unavailable"
                    : "Select a model"
            }
          />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {models.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No models reported by the backend.
            </div>
          ) : (
            models.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-sm">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs">{model.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {model.availability}
                  </span>
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedMissing && (
        <span className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          <AlertTriangle className="size-3" /> Model unavailable
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        aria-label="Refresh models"
        title="Refresh model list"
      >
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
