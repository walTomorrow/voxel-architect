"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuilderMessageView } from "@/src/app/builder/components/BuilderMessage";
import {
  formatBuilderConversationForExport,
  type BuilderConversationExportMeta,
} from "@/src/lib/builder/formatBuilderConversationExport";

const IS_DEV =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_BUILDER_DEV_TOOLS === "true";

type Props = {
  readonly messages: readonly BuilderMessageView[];
  readonly exportMeta: BuilderConversationExportMeta;
};

export function BuilderChatDevMenu({ messages, exportMeta }: Props) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleCopy = useCallback(async () => {
    const text = formatBuilderConversationForExport(messages, exportMeta);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      setOpen(false);
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }, [messages, exportMeta]);

  if (!IS_DEV) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Conversation options"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-200"
      >
        <span className="text-base leading-none tracking-widest" aria-hidden>
          ···
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-zinc-700/90 bg-zinc-900 py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleCopy()}
            className="w-full px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-zinc-800"
          >
            Copy entire conversation
          </button>
          <p className="border-t border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-500">
            Dev export for debugging
          </p>
        </div>
      ) : null}
      {copyState === "copied" ? (
        <span className="absolute -bottom-5 right-0 text-[10px] text-emerald-400/90">
          Copied
        </span>
      ) : null}
      {copyState === "failed" ? (
        <span className="absolute -bottom-5 right-0 text-[10px] text-red-400/90">
          Copy failed
        </span>
      ) : null}
    </div>
  );
}
