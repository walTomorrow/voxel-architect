"use client";

import { useRef, useState } from "react";
import {
  BUILDER_IMAGE_MIME_TYPES,
  BUILDER_MAX_IMAGE_BYTES,
  type BuilderImageMimeType,
} from "@/src/lib/builder/builderChatTypes";

export type PendingImageReference = {
  readonly file: File;
  readonly previewUrl: string;
  readonly mimeType: BuilderImageMimeType;
  readonly name: string;
};

type Props = {
  readonly disabled?: boolean;
  readonly onSend: (text: string, image: PendingImageReference | null) => void;
};

function fileToMimeType(file: File): BuilderImageMimeType | null {
  const t = file.type as BuilderImageMimeType;
  return (BUILDER_IMAGE_MIME_TYPES as readonly string[]).includes(t) ? t : null;
}

const MAX_IMAGE_MB = Math.round(BUILDER_MAX_IMAGE_BYTES / (1024 * 1024));

export function BuilderPromptInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImageReference | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearPendingImage() {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPickError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const mimeType = fileToMimeType(file);
    if (!mimeType) {
      setPickError("Use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > BUILDER_MAX_IMAGE_BYTES) {
      setPickError(`Image must be under ${MAX_IMAGE_MB} MB.`);
      return;
    }

    clearPendingImage();
    setPendingImage({
      file,
      mimeType,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    });
  }

  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && !pendingImage) || disabled) return;
    onSend(trimmed, pendingImage);
    setValue("");
    clearPendingImage();
    setPickError(null);
  }

  const canSend = !disabled && (value.trim().length > 0 || pendingImage != null);

  return (
    <div className="shrink-0 border-t border-zinc-800/90 bg-zinc-950/95 p-3">
      {pendingImage ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/80 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL */}
          <img
            src={pendingImage.previewUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-zinc-300">{pendingImage.name}</p>
            <p className="text-[10px] text-zinc-600">Reference image · not stored</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            onClick={clearPendingImage}
          >
            Remove
          </button>
        </div>
      ) : null}
      {pickError ? (
        <p className="mb-2 text-[10px] text-amber-300/90">{pickError}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={value}
          disabled={disabled}
          placeholder="Describe your building or ask about the reference…"
          className="min-h-[5.5rem] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={disabled || pendingImage != null}
            title={
              pendingImage
                ? "One image per message — remove the current image first"
                : "Attach reference image (PNG, JPEG, WebP)"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach reference image"
          >
            <svg
              className="h-4 w-4"
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
          <p className="min-w-0 flex-1 text-[10px] leading-snug text-zinc-600">
            One image per message · PNG, JPEG, WebP · max {MAX_IMAGE_MB} MB
          </p>
          <button
            type="button"
            disabled={!canSend}
            onClick={submit}
            className="h-9 shrink-0 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
