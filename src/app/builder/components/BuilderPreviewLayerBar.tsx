"use client";

import type { LayerViewMode } from "@/src/lib/voxel/layerView";
import { clampLayerY } from "@/src/lib/voxel/layerView";

function modeButtonClass(active: boolean): string {
  return [
    "rounded-md px-2 py-1 text-[10px] font-medium transition",
    active
      ? "bg-emerald-600/90 text-white ring-1 ring-emerald-400/40"
      : "border border-zinc-600/80 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800",
  ].join(" ");
}

type Props = {
  readonly hasStructure: boolean;
  readonly layerViewMode: LayerViewMode;
  readonly onLayerViewModeChange: (mode: LayerViewMode) => void;
  readonly layerExtents: { readonly yMin: number; readonly yMax: number } | null;
  readonly selectedLayer: number;
  readonly onSelectedLayerChange: (y: number) => void;
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly onRefitCamera: () => void;
};

export function BuilderPreviewLayerBar({
  hasStructure,
  layerViewMode,
  onLayerViewModeChange,
  layerExtents,
  selectedLayer,
  onSelectedLayerChange,
  visibleCount,
  totalCount,
  onRefitCamera,
}: Props) {
  const showLayerSlider =
    hasStructure &&
    layerExtents &&
    (layerViewMode === "build-up" || layerViewMode === "slice");

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-950/90 px-2.5 py-2 shadow-lg backdrop-blur-sm">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Layers
      </span>
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["full", "Full"],
            ["build-up", "Build-up"],
            ["slice", "Slice"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            disabled={!hasStructure}
            aria-pressed={layerViewMode === mode}
            className={`${modeButtonClass(layerViewMode === mode)} disabled:cursor-not-allowed disabled:opacity-40`}
            onClick={() => onLayerViewModeChange(mode)}
          >
            {label}
          </button>
        ))}
      </div>
      {showLayerSlider && layerExtents ? (
        <div className="flex min-w-[8rem] flex-1 items-center gap-2 sm:min-w-[12rem]">
          <span className="shrink-0 font-mono text-[10px] text-emerald-300/90">
            y={clampLayerY(selectedLayer, layerExtents)}
          </span>
          <input
            type="range"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-emerald-500"
            min={layerExtents.yMin}
            max={layerExtents.yMax}
            step={1}
            value={clampLayerY(selectedLayer, layerExtents)}
            onChange={(e) =>
              onSelectedLayerChange(
                clampLayerY(Number.parseInt(e.target.value, 10), layerExtents),
              )
            }
          />
        </div>
      ) : null}
      <span className="ml-auto hidden font-mono text-[10px] text-zinc-500 sm:inline">
        {hasStructure
          ? `${visibleCount.toLocaleString()} / ${totalCount.toLocaleString()}`
          : "—"}
      </span>
      <button
        type="button"
        disabled={!hasStructure}
        onClick={onRefitCamera}
        className="rounded-md border border-zinc-600/80 bg-zinc-900/90 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
      >
        Refit
      </button>
    </div>
  );
}
