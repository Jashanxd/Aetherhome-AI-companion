import { request } from "./api";
import type { LocalModel } from "@/types";

/**
 * Raw shapes tolerated from GET /models — the local backend proxies LM Studio,
 * which may answer with either an OpenAI-style list or a plain array.
 */
type RawModel =
  | string
  | {
      id?: string;
      model?: string;
      name?: string;
      owned_by?: string;
      state?: string;
      status?: string;
      loaded?: boolean;
      active?: boolean;
    };

type RawModelsResponse = RawModel[] | { data?: RawModel[]; models?: RawModel[] };

function normalize(raw: RawModel): LocalModel | null {
  if (typeof raw === "string") {
    return raw ? { id: raw, label: raw, availability: "available" } : null;
  }
  const id = raw.id ?? raw.model ?? raw.name;
  if (!id) return null;

  const flag = (raw.state ?? raw.status ?? "").toLowerCase();
  const availability = raw.active || flag === "active"
    ? "active"
    : raw.loaded || flag === "loaded"
      ? "loaded"
      : "available";

  const model: LocalModel = { id, label: raw.name ?? id, availability };
  if (raw.owned_by) model.ownedBy = raw.owned_by;
  return model;
}

export async function fetchModels(signal?: AbortSignal): Promise<LocalModel[]> {
  const payload = await request<RawModelsResponse>("/models", { signal, timeoutMs: 20_000 });
  const list = Array.isArray(payload)
    ? payload
    : (payload.data ?? payload.models ?? []);

  const models = list.map(normalize).filter((m): m is LocalModel => m !== null);
  // De-duplicate by id while preserving backend ordering.
  return Array.from(new Map(models.map((m) => [m.id, m])).values());
}
