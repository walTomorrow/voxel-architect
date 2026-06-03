"use client";

import { useEffect, useRef } from "react";
import type { BuilderChat } from "@/src/app/builder/mockBuilderData";
import { BuilderMessageBubble } from "@/src/app/builder/components/BuilderMessage";
import { BuilderPromptInput } from "@/src/app/builder/components/BuilderPromptInput";

type Props = {
  readonly chat: BuilderChat;
  readonly onSendMessage: (text: string) => void;
};

export function BuilderChatPanel({ chat, onSendMessage }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-800/90 bg-zinc-950/98">
      <div className="shrink-0 border-b border-zinc-800/90 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Conversation</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
          Build with conversation — describe a structure, refine step by step.
        </p>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {chat.messages.map((message) => (
          <BuilderMessageBubble key={message.id} message={message} />
        ))}
      </div>
      <BuilderPromptInput onSend={onSendMessage} />
    </div>
  );
}
