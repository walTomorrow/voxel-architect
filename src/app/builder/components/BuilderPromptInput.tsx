"use client";

import { useState } from "react";

type Props = {
  readonly disabled?: boolean;
  readonly onSend: (text: string) => void;
};

export function BuilderPromptInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="shrink-0 border-t border-zinc-800/90 bg-zinc-950/95 p-3">
      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled
          title="Image input coming soon"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/80 text-zinc-500 opacity-70"
          aria-label="Attach image (coming soon)"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <textarea
            rows={2}
            value={value}
            disabled={disabled}
            placeholder="Describe changes to your building…"
            className="w-full resize-none rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <p className="mt-1 text-[10px] text-zinc-600">
            Image input coming soon — references for style and layout.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submit}
          className="h-10 shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
