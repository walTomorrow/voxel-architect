"use client";

import Link from "next/link";
import type { BuilderChat } from "@/src/app/builder/mockBuilderData";
import { statusLabel } from "@/src/app/builder/mockBuilderData";

type Props = {
  readonly chats: readonly BuilderChat[];
  readonly activeChatId: string;
  readonly onSelectChat: (id: string) => void;
  readonly onNewBuild: () => void;
};

export function BuilderSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewBuild,
}: Props) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-zinc-800/90 bg-zinc-950 lg:w-[14rem] xl:w-[15rem]">
      <div className="shrink-0 border-b border-zinc-800/90 px-4 py-4">
        <Link
          href="/"
          className="text-[11px] font-medium text-zinc-500 transition hover:text-emerald-400/90"
        >
          ← Voxel Architect
        </Link>
        <h1 className="mt-2 text-base font-semibold tracking-tight text-white">
          Builder
        </h1>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Describe structures in conversation and preview voxel results.
        </p>
        <button
          type="button"
          onClick={onNewBuild}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-600/15 px-3 py-2.5 text-sm font-medium text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-600/25"
        >
          <span aria-hidden className="text-lg leading-none">
            +
          </span>
          New build
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Build chats">
        <ul className="space-y-1">
          {chats.map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onSelectChat(chat.id)}
                  className={[
                    "w-full rounded-xl px-3 py-2.5 text-left transition",
                    active
                      ? "bg-zinc-800/90 ring-1 ring-emerald-500/30"
                      : "hover:bg-zinc-900/80",
                  ].join(" ")}
                >
                  <span className="block truncate text-sm font-medium text-zinc-100">
                    {chat.title}
                  </span>
                  {chat.subtitle ? (
                    <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                      {chat.subtitle}
                    </span>
                  ) : null}
                  <span className="mt-1 inline-block text-[10px] text-zinc-600">
                    {statusLabel(chat.status)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="shrink-0 border-t border-zinc-800/90 p-3 text-[10px] text-zinc-600">
        <Link href="/preview" className="text-zinc-500 hover:text-zinc-300">
          Preview gallery
        </Link>
        <span className="mx-1.5 text-zinc-700">·</span>
        <Link href="/generic-lab" className="text-zinc-500 hover:text-zinc-300">
          Developer lab
        </Link>
      </div>
    </aside>
  );
}
