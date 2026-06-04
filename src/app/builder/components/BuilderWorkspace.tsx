"use client";

import Link from "next/link";
import type { BuilderChat } from "@/src/app/builder/mockBuilderData";
import { statusLabel } from "@/src/app/builder/mockBuilderData";
import { getGenericBuildingPreset } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import { BuilderPreviewPanel } from "@/src/app/builder/components/BuilderPreviewPanel";
import { BuilderChatPanel } from "@/src/app/builder/components/BuilderChatPanel";
import type { BuilderMessageView } from "@/src/app/builder/components/BuilderMessage";
import type { PendingImageReference } from "@/src/app/builder/components/BuilderPromptInput";

type Props = {
  readonly chat: BuilderChat;
  readonly messages: readonly BuilderMessageView[];
  readonly isLoading: boolean;
  readonly onSendMessage: (text: string, image: PendingImageReference | null) => void;
  readonly onResetChat: () => void;
};

export function BuilderWorkspace({
  chat,
  messages,
  isLoading,
  onSendMessage,
  onResetChat,
}: Props) {
  const preset = getGenericBuildingPreset(chat.presetId);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
      <section className="flex min-h-[min(55vh,32rem)] min-w-0 flex-[1.6] flex-col lg:min-h-0">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800/90 bg-zinc-950/98 px-3 py-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">{chat.title}</h2>
            <p className="truncate text-[11px] text-zinc-500">
              {statusLabel(chat.status)}
              {preset ? ` · ${preset.label}` : ""}
              <span className="text-zinc-600"> · Static preview</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/preview"
              className="rounded-lg border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              Preview
            </Link>
            <button
              type="button"
              title="Copy blueprint — coming soon"
              disabled
              className="cursor-not-allowed rounded-lg border border-zinc-800 px-2 py-1 text-[10px] text-zinc-600"
            >
              Copy blueprint
            </button>
            <button
              type="button"
              onClick={onResetChat}
              disabled={isLoading}
              className="rounded-lg border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset chat
            </button>
          </div>
        </header>
        <BuilderPreviewPanel presetId={chat.presetId} />
      </section>
      <section className="flex min-h-[min(52vh,28rem)] w-full shrink-0 flex-col border-t border-zinc-800/90 lg:h-full lg:min-h-0 lg:max-w-[22rem] lg:flex-1 lg:flex-none lg:border-l lg:border-t-0 xl:max-w-[24rem]">
        <BuilderChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
        />
      </section>
    </div>
  );
}
