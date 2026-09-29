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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";
import { setApiBaseUrl } from "@/services/api";
import type { GlobalSettings, ImageGenerationMode } from "@/types";

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="text-sm">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  onRefreshModels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshModels: () => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const models = useAppStore((s) => s.models);

  const set = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    update({ [key]: value } as Partial<GlobalSettings>);
    if (key === "apiBaseUrl") setApiBaseUrl(String(value));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Settings</DialogTitle>
          <DialogDescription>Everything here stays on this machine.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="companion3d">3D</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label>Local backend URL</Label>
              <Input
                value={settings.apiBaseUrl}
                onChange={(e) => set("apiBaseUrl", e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Your FastAPI backend. It talks to LM Studio for you.
              </p>
            </div>
            <Button variant="secondary" onClick={onRefreshModels}>
              Reconnect and refresh models
            </Button>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-3 pt-4">
            <Row title="Animations" hint="Respects your system reduced-motion setting too">
              <Select
                value={settings.animationLevel}
                onValueChange={(v) => set("animationLevel", v as GlobalSettings["animationLevel"])}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="reduced">Reduced</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row title="Streaming reveal" hint="Animate replies as they appear">
              <Switch
                checked={settings.streamingReveal}
                onCheckedChange={(v) => set("streamingReveal", v)}
              />
            </Row>
          </TabsContent>

          <TabsContent value="models" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              {models.length > 0
                ? `${models.length} model${models.length === 1 ? "" : "s"} reported by the backend.`
                : "No models reported yet."}
            </p>
            <div className="space-y-1.5">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="truncate font-mono text-xs">{m.id}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.availability}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={onRefreshModels}>
              Refresh models
            </Button>
          </TabsContent>

          <TabsContent value="voice" className="space-y-3 pt-4">
            <Row title="Voice" hint="Local speech-to-text and text-to-speech are not connected yet">
              <Switch
                checked={settings.voiceEnabled}
                onCheckedChange={(v) => set("voiceEnabled", v)}
              />
            </Row>
          </TabsContent>

          <TabsContent value="images" className="space-y-3 pt-4">
            <Row
              title={`Images: ${settings.imagesEnabled ? "ON" : "OFF"}`}
              hint="When off, no image requests are sent"
            >
              <Switch
                checked={settings.imagesEnabled}
                onCheckedChange={(v) => set("imagesEnabled", v)}
              />
            </Row>
            <Row title="Generation mode">
              <Select
                value={settings.imageMode}
                onValueChange={(v) => set("imageMode", v as ImageGenerationMode)}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="ask">Ask before generating</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <p className="text-xs text-muted-foreground">
              A local image backend can be connected later; nothing is generated today.
            </p>
          </TabsContent>

          <TabsContent value="memory" className="space-y-3 pt-4">
            <Row title="Memory" hint="Persistent storage is not connected yet">
              <Switch
                checked={settings.memoryEnabled}
                onCheckedChange={(v) => set("memoryEnabled", v)}
              />
            </Row>
          </TabsContent>

          <TabsContent value="companion3d" className="space-y-3 pt-4">
            <Row title="3D companion">
              <Switch
                checked={settings.companion3dEnabled}
                onCheckedChange={(v) => set("companion3dEnabled", v)}
              />
            </Row>
            <Row title="Show companion panel">
              <Switch
                checked={settings.showCompanionPanel}
                onCheckedChange={(v) => set("showCompanionPanel", v)}
              />
            </Row>
            <Row title="Companion size">
              <Select
                value={settings.companionSize}
                onValueChange={(v) => set("companionSize", v as GlobalSettings["companionSize"])}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row title="Position">
              <Select
                value={settings.companionPosition}
                onValueChange={(v) =>
                  set("companionPosition", v as GlobalSettings["companionPosition"])
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <p className="text-xs text-muted-foreground">
              3D character selection arrives with GLB/GLTF support.
            </p>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Conversations, companions and settings are stored locally in this browser profile.
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                localStorage.removeItem("local-companion-store");
                window.location.reload();
              }}
            >
              Reset local data
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
