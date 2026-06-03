"use client";

import type { BuilderMessage as BuilderMessageType } from "@/src/app/builder/mockBuilderData";

export function BuilderMessageBubble({ message }: { readonly message: BuilderMessageType }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <p className="text-center text-[11px] text-zinc-600">{message.content}</p>
    );
  }

  return (
    <div
      className={[
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-emerald-600/90 text-white"
            : "border border-zinc-700/80 bg-zinc-800/80 text-zinc-200",
        ].join(" ")}
      >
        {message.content}
      </div>
      {message.attachments && message.attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {message.attachments.map((a) => (
            <span
              key={a.id}
              className="rounded-full border border-zinc-600/70 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-400"
            >
              {a.name}
            </span>
          ))}
        </div>
      ) : null}
      <span className="px-1 text-[10px] text-zinc-600">{message.createdAtLabel}</span>
    </div>
  );
}
