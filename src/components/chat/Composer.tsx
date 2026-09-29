import { useState, type KeyboardEvent } from "react";
import { ArrowUp, ImageIcon, Mic, Paperclip, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";

interface ComposerProps {
  disabled?: boolean;
  sending: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
}

export function Composer({ disabled, sending, onSend, onCancel }: ComposerProps) {
  const [value, setValue] = useState("");
  const settings = useAppStore((s) => s.settings);
  const setCompanionState = useAppStore((s) => s.setCompanionState);

  const submit = () => {
    if (!value.trim() || sending || disabled) return;
    onSend(value);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-background/80 px-6 py-4 backdrop-blur xl:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="panel flex items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-ring">
          <div className="flex items-center gap-0.5 pb-1 pl-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Voice input"
              onClick={() => {
                if (!settings.voiceEnabled) {
                  toast("Voice is off", { description: "Turn voice on in settings." });
                  return;
                }
                setCompanionState("listening");
                toast("Voice input isn't connected yet", {
                  description: "Local speech-to-text will plug in here.",
                });
                setTimeout(() => setCompanionState("idle"), 900);
              }}
            >
              <Mic className={`size-4 ${settings.voiceEnabled ? "text-primary" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Generate image"
              onClick={() =>
                toast(
                  settings.imagesEnabled
                    ? "Image generation isn't connected yet"
                    : "Image generation is off",
                  {
                    description: settings.imagesEnabled
                      ? "A local image backend will handle this."
                      : "Turn images on in the header or settings.",
                  },
                )
              }
            >
              <ImageIcon className={`size-4 ${settings.imagesEnabled ? "text-accent" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Attach file" disabled>
              <Paperclip className="size-4" />
            </Button>
          </div>

          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={disabled ? "Select an available model to chat" : "Message your companion…"}
            className="max-h-40 min-h-11 resize-none border-0 bg-transparent px-1 py-2.5 text-sm shadow-none focus-visible:ring-0"
          />

          {sending ? (
            <Button variant="secondary" size="icon" className="mb-1 mr-1" onClick={onCancel} aria-label="Stop">
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="mb-1 mr-1"
              onClick={submit}
              disabled={!value.trim() || disabled}
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground/60">
          Enter to send · Shift + Enter for a new line · Runs locally
        </p>
      </div>
    </div>
  );
}
