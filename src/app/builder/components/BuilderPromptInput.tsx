"use client";

import { useRef, useState } from "react";
import {
  BUILDER_IMAGE_MIME_TYPES,
  BUILDER_MAX_IMAGE_BYTES,
  BUILDER_MAX_IMAGES_PER_MESSAGE,
  type BuilderImageMimeType,
} from "@/src/lib/builder/builderChatTypes";

export type PendingImageReference = {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly mimeType: BuilderImageMimeType;
  readonly name: string;
};

type Props = {
  readonly disabled?: boolean;
  readonly onSend: (text: string, images: readonly PendingImageReference[]) => void;
};

function fileToMimeType(file: File): BuilderImageMimeType | null {
  const t = file.type as BuilderImageMimeType;
  return (BUILDER_IMAGE_MIME_TYPES as readonly string[]).includes(t) ? t : null;
}

function defaultPastedFileName(mimeType: BuilderImageMimeType): string {
  if (mimeType === "image/png") return "pasted-reference.png";
  if (mimeType === "image/jpeg") return "pasted-reference.jpg";
  return "pasted-reference.webp";
}

function newImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_IMAGE_MB = Math.round(BUILDER_MAX_IMAGE_BYTES / (1024 * 1024));

export function BuilderPromptInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImageReference[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function revokePreview(url: string) {
    URL.revokeObjectURL(url);
  }

  function removePendingImage(id: string) {
    setPendingImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.previewUrl) revokePreview(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  }

  function clearPendingImages() {
    setPendingImages((prev) => {
      for (const img of prev) {
        if (img.previewUrl) revokePreview(img.previewUrl);
      }
      return [];
    });
  }

  function attachImageFile(file: File, name?: string): boolean {
    setPickError(null);
    const mimeType = fileToMimeType(file);
    if (!mimeType) {
      setPickError("Use PNG, JPEG, or WebP.");
      return false;
    }
    if (file.size > BUILDER_MAX_IMAGE_BYTES) {
      setPickError(`Each image must be under ${MAX_IMAGE_MB} MB.`);
      return false;
    }

    setPendingImages((prev) => {
      if (prev.length >= BUILDER_MAX_IMAGES_PER_MESSAGE) {
        setPickError(`You can attach up to ${BUILDER_MAX_IMAGES_PER_MESSAGE} images per message.`);
        return prev;
      }
      return [
        ...prev,
        {
          id: newImageId(),
          file,
          mimeType,
          name: name?.trim() || file.name || defaultPastedFileName(mimeType),
          previewUrl: URL.createObjectURL(file),
        },
      ];
    });
    return true;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (pendingImages.length >= BUILDER_MAX_IMAGES_PER_MESSAGE) break;
      attachImageFile(file);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;

    const items = e.clipboardData?.items;
    if (!items?.length) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || item.kind !== "file" || !item.type.startsWith("image/")) continue;

      const file = item.getAsFile();
      if (!file) continue;

      if (attachImageFile(file)) {
        e.preventDefault();
      }
      return;
    }
  }

  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && pendingImages.length === 0) || disabled) return;
    onSend(trimmed, pendingImages);
    setValue("");
    clearPendingImages();
    setPickError(null);
  }

  const canSend = !disabled && (value.trim().length > 0 || pendingImages.length > 0);
  const atImageCap = pendingImages.length >= BUILDER_MAX_IMAGES_PER_MESSAGE;

  return (
    <div className="shrink-0 border-t border-zinc-800/90 bg-zinc-950/95 p-3">
      {pendingImages.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingImages.map((img) => (
            <div
              key={img.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/80 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL */}
              <img
                src={img.previewUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 max-w-[8rem]">
                <p className="truncate text-[11px] text-zinc-300">{img.name}</p>
                <p className="text-[10px] text-zinc-600">Reference</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 rounded-md px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={() => removePendingImage(img.id)}
              >
                Remove
              </button>
            </div>
          ))}
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
          placeholder="Describe your building or paste / attach reference images…"
          className="min-h-[5.5rem] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
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
            multiple
            className="hidden"
            disabled={disabled || atImageCap}
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={disabled || atImageCap}
            title={
              atImageCap
                ? `Maximum ${BUILDER_MAX_IMAGES_PER_MESSAGE} images per message`
                : "Attach reference images (PNG, JPEG, WebP)"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach reference images"
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
            Up to {BUILDER_MAX_IMAGES_PER_MESSAGE} images · PNG, JPEG, WebP · max {MAX_IMAGE_MB} MB
            each
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
