import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { setApiBaseUrl } from "@/services/api";

/**
 * Gate for the persisted store. Rehydration itself is kicked off in the store
 * module as soon as it loads in the browser, so saved companions are restored
 * before any action can write over them; this hook only waits for it.
 */
export function useHydrateStore() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const done = () => {
      if (cancelled) return;
      setApiBaseUrl(useAppStore.getState().settings.apiBaseUrl);
      setHydrated(true);
    };

    if (useAppStore.persist.hasHydrated()) {
      done();
      return;
    }

    const unsubscribe = useAppStore.persist.onFinishHydration(done);
    // Safety net: never leave the app gated if storage is unavailable.
    const timer = setTimeout(done, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return hydrated;
}
