import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/stores/appStore";

export function AddCompanionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addCompanion = useAppStore((s) => s.addCompanion);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [personality, setPersonality] = useState("");

  const create = () => {
    if (!name.trim()) return;
    addCompanion({
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      personality: personality.trim() || undefined,
    });
    setName("");
    setTagline("");
    setPersonality("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">New companion</DialogTitle>
          <DialogDescription>
            Each companion keeps its own personality, model, voice and memories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="companion-name">Name</Label>
            <Input
              id="companion-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nova"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companion-tagline">Tagline</Label>
            <Input
              id="companion-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companion-personality">Personality</Label>
            <Textarea
              id="companion-personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={4}
              placeholder="How should they behave?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={!name.trim()}>
            Create companion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
