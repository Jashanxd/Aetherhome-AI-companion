import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { setApiBaseUrl } from "@/services/api";

/** Rehydrates the persisted store on the client only (SSR-safe). */
export function useHydrateStore() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void useAppStore.persist.rehydrate()?.then?.(() => {
      if (cancelled) return;
      setApiBaseUrl(useAppStore.getState().settings.apiBaseUrl);
      setHydrated(true);
    });
    // Non-promise rehydrate paths still need to release the gate.
    const timer = setTimeout(() => !cancelled && setHydrated(true), 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return hydrated;
}
