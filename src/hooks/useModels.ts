import { useCallback, useEffect, useState } from "react";
import { fetchModels } from "@/services/models";
import { checkBackendHealth, getApiBaseUrl } from "@/services/api";
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
    const healthy = await checkBackendHealth();
    if (!healthy) {
      setModels([]);
      setStatus("offline");
      setModelsError(
        `Cannot reach the local backend at ${getApiBaseUrl()}. Make sure it is running.`,
      );
      setModelsLoading(false);
      return;
    }
    setStatus("online");
    try {
      const models = await fetchModels();
      setModels(models);

      const { selectedModelId, setSelectedModel } = useAppStore.getState();
      // Keep the chosen model if it still exists; otherwise auto-pick only when none chosen.
      const first = models[0];
      if (!selectedModelId && first) setSelectedModel(first.id);
    } catch (error) {
      setModels([]);
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
