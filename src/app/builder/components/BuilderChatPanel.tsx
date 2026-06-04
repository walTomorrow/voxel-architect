"use client";

import { useEffect, useRef } from "react";
import {
  BuilderMessageBubble,
  type BuilderMessageView,
} from "@/src/app/builder/components/BuilderMessage";
import {
  BuilderPromptInput,
  type PendingImageReference,
} from "@/src/app/builder/components/BuilderPromptInput";

type Props = {
  readonly messages: readonly BuilderMessageView[];
  readonly isLoading: boolean;
  readonly onSendMessage: (text: string, image: PendingImageReference | null) => void;
};

export function BuilderChatPanel({
  messages,
  isLoading,
  onSendMessage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-800/90 bg-zinc-950/98">
      <div className="shrink-0 border-b border-zinc-800/90 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Conversation</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
          Multimodal assistant — static preview until blueprint generation connects.
        </p>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !isLoading ? (
          <p className="text-sm leading-relaxed text-zinc-500">
            No messages yet. Describe your building below — the assistant only sees what you
            send here plus a server-side system prompt.
          </p>
        ) : null}
        {messages.map((message) => (
          <BuilderMessageBubble key={message.id} message={message} />
        ))}
        {isLoading && !messages.some((m) => m.isStreaming) ? (
          <div className="flex items-start gap-2">
            <div className="rounded-2xl border border-zinc-700/80 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-500">
              Assistant is responding…
            </div>
          </div>
        ) : null}
      </div>
      <div className="shrink-0">
        <BuilderPromptInput disabled={isLoading} onSend={onSendMessage} />
      </div>

    </div>
  );
}
