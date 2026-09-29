import { useCallback, useEffect, useState } from "react";
import { fetchModels } from "@/services/models";
import { useAppStore } from "@/stores/appStore";
import type { BackendStatus } from "@/types";

/**
 * Dynamic model discovery. Models come only from GET /models — never hardcoded.
 * Refreshes on startup and on demand.
 */
export function useModels(enabled = true) {
  const setModels = useAppStore((s) => s.setModels);
  const setModelsLoading = useAppStore((s) => s.setModelsLoading);
  const setModelsError = useAppStore((s) => s.setModelsError);
  const [status, setStatus] = useState<BackendStatus>("checking");

  const refresh = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const models = await fetchModels();
      setModels(models);
      setStatus("online");

      const { selectedModelId, setSelectedModel } = useAppStore.getState();
      // Never silently switch away from a chosen model: only auto-pick when none.
      if (!selectedModelId && models.length > 0) setSelectedModel(models[0].id);
    } catch (error) {
      setModels([]);
      setStatus("offline");
      setModelsError(error instanceof Error ? error.message : "Failed to load models");
    } finally {
      setModelsLoading(false);
    }
  }, [setModels, setModelsError, setModelsLoading]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { refresh, status };
}
