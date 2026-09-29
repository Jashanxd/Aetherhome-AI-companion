import { useEffect, useRef } from "react";
import { ImageIcon, TriangleAlert } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { ChatMessage, Companion } from "@/types";

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageList({
  messages,
  companion,
}: {
  messages: ChatMessage[];
  companion: Companion;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md text-center">
          <CompanionAvatar companion={companion} size={56} active />
          <h2 className="mt-5 font-display text-2xl font-medium tracking-tight">
            {companion.name} is here
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {companion.personality}
          </p>
          <p className="mt-6 text-xs text-muted-foreground/70">
            Everything runs on your machine. Say something to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 xl:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex animate-message-in gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && <CompanionAvatar companion={companion} size={32} />}
              <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-soft ${
                    isUser
                      ? "border-primary/25 bg-primary/12 text-foreground"
                      : message.error
                        ? "border-destructive/35 bg-destructive/10 text-destructive"
                        : "border-border bg-surface text-surface-foreground"
                  }`}
                >
                  {message.error && (
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                      <TriangleAlert className="size-3.5" /> Backend error
                    </span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{message.content}</span>
                  {message.streaming && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse-soft bg-primary align-middle" />
                  )}

                  {message.imagePending && (
                    <span className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-muted-foreground">
                      <ImageIcon className="size-3.5 animate-pulse-soft" /> Generating image…
                    </span>
                  )}
                  {message.image && (
                    <img
                      src={message.image.url}
                      alt={message.image.prompt}
                      className="mt-3 w-full rounded-xl border border-border"
                    />
                  )}
                </div>
                <span className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {timeLabel(message.createdAt)}
                  {!isUser && message.modelId ? ` · ${message.modelId}` : ""}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
