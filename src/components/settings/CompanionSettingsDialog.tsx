import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/stores/appStore";
import { defaultMediaResponses } from "@/data/companions";
import { syncMediaConfig } from "@/services/media";
import { MEDIA_FILE_TYPES } from "@/types";
import type { Companion, CompanionMediaResponses, ImageGenerationMode } from "@/types";

const FOLLOW_GLOBAL = "__global__";

export function CompanionSettingsDialog({
  companion,
  open,
  onOpenChange,
}: {
  companion: Companion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useAppStore((s) => s.updateCompanion);
  const models = useAppStore((s) => s.models);

  const patch = (p: Partial<Companion>) => update(companion.id, p);
  const media = companion.mediaResponses ?? defaultMediaResponses();
  const patchMedia = (p: Partial<CompanionMediaResponses>) =>
    patch({ mediaResponses: { ...media, ...p } });

  // Register this companion's folder with the backend (debounced) whenever it changes.
  const firstRun = useRef(true);
  const mediaKey = JSON.stringify(media);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      syncMediaConfig(companion.id, JSON.parse(mediaKey) as CompanionMediaResponses).catch(
        () => undefined,
      );
    }, 600);
    return () => clearTimeout(t);
  }, [companion.id, mediaKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{companion.name}</DialogTitle>
          <DialogDescription>Configure this companion.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="identity" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="images">Images &amp; Media</TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={companion.name} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Avatar initials</Label>
              <Input
                value={companion.avatarInitials}
                maxLength={2}
                onChange={(e) => patch({ avatarInitials: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Presence hue ({companion.appearance.hue}°)</Label>
              <Slider
                value={[companion.appearance.hue]}
                min={0}
                max={360}
                step={1}
                onValueChange={([hue]) =>
                  patch({
                    appearance: { ...companion.appearance, hue: hue ?? companion.appearance.hue },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>3D model (GLB/GLTF path)</Label>
              <Input
                value={companion.appearance.modelUrl ?? ""}
                placeholder="Not set — placeholder presence in use"
                onChange={(e) =>
                  patch({
                    appearance: { ...companion.appearance, modelUrl: e.target.value || null },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Appearance</Label>
              <Textarea
                rows={3}
                value={companion.appearance.description}
                onChange={(e) =>
                  patch({
                    appearance: { ...companion.appearance, description: e.target.value },
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="personality" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Personality</Label>
              <Textarea
                rows={4}
                value={companion.personality}
                onChange={(e) => patch({ personality: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>System prompt</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={companion.systemPrompt}
                onChange={(e) => patch({ systemPrompt: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label>Preferred model</Label>
              <Select
                value={companion.model.preferredModelId ?? FOLLOW_GLOBAL}
                onValueChange={(value) =>
                  patch({
                    model: {
                      ...companion.model,
                      preferredModelId: value === FOLLOW_GLOBAL ? null : value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FOLLOW_GLOBAL}>Follow current selection</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companion.model.preferredModelId &&
                models.length > 0 &&
                !models.some((m) => m.id === companion.model.preferredModelId) && (
                  <p className="text-xs text-destructive">Model unavailable</p>
                )}
            </div>
            <div className="space-y-2">
              <Label>Temperature ({companion.model.temperature.toFixed(2)})</Label>
              <Slider
                value={[companion.model.temperature]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([temperature]) =>
                  patch({
                    model: {
                      ...companion.model,
                      temperature: temperature ?? companion.model.temperature,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Context length</Label>
              <Input
                type="number"
                value={companion.model.contextLength}
                onChange={(e) =>
                  patch({
                    model: { ...companion.model, contextLength: Number(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm">Memory enabled</p>
                <p className="text-xs text-muted-foreground">
                  Long-term storage is not connected yet.
                </p>
              </div>
              <Switch
                checked={companion.memory.enabled}
                onCheckedChange={(enabled) =>
                  patch({ memory: { ...companion.memory, enabled } })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm">Voice enabled</p>
                <p className="text-xs text-muted-foreground">
                  Local speech isn't connected yet.
                </p>
              </div>
              <Switch
                checked={companion.voice.enabled}
                onCheckedChange={(enabled) => patch({ voice: { ...companion.voice, enabled } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Voice</Label>
              <Input
                value={companion.voice.voiceId ?? ""}
                placeholder="No local voices available"
                onChange={(e) =>
                  patch({ voice: { ...companion.voice, voiceId: e.target.value || null } })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4 pt-4">
            <div className="space-y-4 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Media responses</p>
                  <p className="text-xs text-muted-foreground">
                    Attach one image from this companion's local folder after each reply.
                  </p>
                </div>
                <Switch
                  checked={media.enabled}
                  onCheckedChange={(enabled) => patchMedia({ enabled })}
                  aria-label="Toggle media responses"
                />
              </div>
              <div className="space-y-2">
                <Label>Folder path</Label>
                <Input
                  value={media.folderPath ?? ""}
                  placeholder={"C:\\Users\\you\\Pictures\\Mia"}
                  className="font-mono text-xs"
                  onChange={(e) => patchMedia({ folderPath: e.target.value || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Read only by your local backend. Files are never copied or uploaded.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Allowed types</Label>
                <div className="flex flex-wrap gap-4">
                  {MEDIA_FILE_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={media.allowedTypes.includes(type)}
                        onCheckedChange={(checked) =>
                          patchMedia({
                            allowedTypes: checked
                              ? [...media.allowedTypes, type]
                              : media.allowedTypes.filter((t) => t !== type),
                          })
                        }
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Avoid repeats</p>
                  <p className="text-xs text-muted-foreground">
                    Use every file once before any repeats.
                  </p>
                </div>
                <Switch
                  checked={media.avoidRepeats}
                  onCheckedChange={(avoidRepeats) => patchMedia({ avoidRepeats })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm">Image generation</p>
                <p className="text-xs text-muted-foreground">
                  {companion.images.enabled ? "Images: ON" : "Images: OFF"}
                </p>
              </div>
              <Switch
                checked={companion.images.enabled}
                onCheckedChange={(enabled) => patch({ images: { ...companion.images, enabled } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Generation mode</Label>
              <Select
                value={companion.images.mode}
                onValueChange={(mode) =>
                  patch({ images: { ...companion.images, mode: mode as ImageGenerationMode } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="ask">Ask before generating</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image model</Label>
              <Input
                value={companion.images.modelId ?? ""}
                placeholder="No local image backend connected"
                onChange={(e) =>
                  patch({ images: { ...companion.images, modelId: e.target.value || null } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select
                value={companion.images.resolution}
                onValueChange={(resolution) =>
                  patch({
                    images: {
                      ...companion.images,
                      resolution: resolution as Companion["images"]["resolution"],
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="512x512">512 × 512</SelectItem>
                  <SelectItem value="768x768">768 × 768</SelectItem>
                  <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
