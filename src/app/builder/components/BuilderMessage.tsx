"use client";

import type { BuilderMessage as BuilderMessageType } from "@/src/app/builder/mockBuilderData";
import { BuilderActivityCard } from "@/src/app/builder/components/BuilderActivityCard";
import type { BuilderActivityStep } from "@/src/lib/builder/mockBuilderActivity";
import type { BuilderToolStatusBanner } from "@/src/lib/builder/builderToolStatusBanner";

export type BuilderMessageView = BuilderMessageType & {
  readonly activitySteps?: readonly BuilderActivityStep[];
  readonly isError?: boolean;
  readonly isStreaming?: boolean;
  readonly toolStatusBanner?: BuilderToolStatusBanner;
};

type Props = {
  readonly message: BuilderMessageView;
};

export function BuilderMessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isError = message.isError === true;
  const banner = message.toolStatusBanner;

  const bannerToneClass =
    banner?.tone === "success"
      ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-100"
      : banner?.tone === "failure"
        ? "border-amber-500/40 bg-amber-950/40 text-amber-100"
        : "border-zinc-600/60 bg-zinc-900/80 text-zinc-300";

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
      {message.attachments?.some((a) => a.previewUrl) ? (
        <div className="max-w-[95%] overflow-hidden rounded-xl border border-zinc-700/70">
          {message.attachments.map((a) =>
            a.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.previewUrl}
                alt=""
                className="max-h-32 w-full object-cover"
              />
            ) : null,
          )}
        </div>
      ) : null}
      {!isUser && banner ? (
        <div
          className={[
            "max-w-[95%] rounded-xl border px-3 py-2 text-xs leading-snug",
            bannerToneClass,
          ].join(" ")}
        >
          <p className="font-medium">{banner.headline}</p>
          {banner.detail ? (
            <p className="mt-0.5 text-[11px] opacity-90">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}
      <div
        className={[
          "max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-emerald-600/90 text-white"
            : isError
              ? "border border-red-500/40 bg-red-950/40 text-red-100/95"
              : "border border-zinc-700/80 bg-zinc-800/80 text-zinc-200",
        ].join(" ")}
      >
        {message.content}
        {message.isStreaming && message.content.length === 0 ? (
          <span className="text-zinc-500">…</span>
        ) : null}
        {message.isStreaming && message.content.length > 0 ? (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-emerald-400/80 align-middle" aria-hidden />
        ) : null}
      </div>
      {message.attachments && message.attachments.length > 0 && !message.attachments[0]?.previewUrl ? (
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
      {message.activitySteps && message.activitySteps.length > 0 ? (
        <BuilderActivityCard steps={message.activitySteps} />
      ) : null}
      <span className="px-1 text-[10px] text-zinc-600">{message.createdAtLabel}</span>
    </div>
  );
}
