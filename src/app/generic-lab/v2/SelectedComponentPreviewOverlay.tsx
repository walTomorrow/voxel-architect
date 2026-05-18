"use client";

import {
  buildSelectedComponentPreview,
  type SelectedComponentPreview,
} from "@/src/app/generic-lab/v2/genericLabV2Display";
import type { ComponentId } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";

export function SelectedComponentPreviewOverlay({
  draft,
  selectedComponentId,
}: {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedComponentId: ComponentId | null;
}) {
  const preview = selectedComponentId
    ? buildSelectedComponentPreview(draft, selectedComponentId)
    : null;

  if (!preview) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-2 bottom-2 z-10 max-w-md"
      aria-live="polite"
    >
      <PreviewCard preview={preview} />
    </div>
  );
}

function PreviewCard({ preview }: { readonly preview: SelectedComponentPreview }) {
  return (
    <div className="rounded-lg border border-zinc-600/70 bg-zinc-950/85 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-semibold text-zinc-100">{preview.name}</p>
      <p className="font-mono text-[10px] text-zinc-500">id: {preview.id}</p>
      {preview.attachment ? (
        <p className="mt-1 text-[11px] text-zinc-400">{preview.attachment}</p>
      ) : null}
      {preview.details ? (
        <p className="mt-0.5 text-[11px] text-zinc-500">{preview.details}</p>
      ) : null}
    </div>
  );
}
