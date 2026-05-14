"use client";

import type { LayerViewMode } from "@/src/lib/voxel/layerView";
import { clampLayerY } from "@/src/lib/voxel/layerView";

export type StructureInspectionPresetOption = {
  readonly id: string;
  readonly label: string;
};

type Props = {
  readonly title?: string;
  readonly presetOptions: readonly StructureInspectionPresetOption[];
  readonly selectedPresetId: string;
  readonly onPresetIdChange: (id: string) => void;
  readonly hasStructure: boolean;
  readonly layerViewMode: LayerViewMode;
  readonly onLayerViewModeChange: (mode: LayerViewMode) => void;
  readonly layerExtents: { yMin: number; yMax: number } | null;
  readonly selectedLayer: number;
  readonly onSelectedLayerChange: (y: number) => void;
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly onRefitCamera: () => void;
};

function modeButtonClass(active: boolean): string {
  return [
    "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
    active
      ? "bg-emerald-600/90 text-white ring-1 ring-emerald-400/40"
      : "border border-zinc-600/80 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/90",
  ].join(" ");
}

export function StructureInspectionPanel({
  title = "Structure inspection",
  presetOptions,
  selectedPresetId,
  onPresetIdChange,
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
  const showLayerControls =
    hasStructure &&
    layerExtents &&
    (layerViewMode === "build-up" || layerViewMode === "slice");

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-5 border-t border-zinc-800/90 bg-zinc-950/98 p-4 md:w-[min(100%,18rem)] md:shrink-0 md:border-l md:border-t-0 md:py-5">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          Preset loads a hand-authored tower. Layer modes filter voxels for
          inspection only — generation is unchanged.
        </p>
      </div>

      <section className="space-y-2">
        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Preset
        </label>
        <select
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
          value={selectedPresetId}
          onChange={(e) => onPresetIdChange(e.target.value)}
        >
          {presetOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          View mode
        </span>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
          {(
            [
              ["full", "Full"] as const,
              ["build-up", "Build-up"] as const,
              ["slice", "Slice"] as const,
            ] satisfies readonly [LayerViewMode, string][]
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
        <p className="text-[10px] leading-relaxed text-zinc-500">
          <strong className="text-zinc-400">Full</strong> — all blocks.{" "}
          <strong className="text-zinc-400">Build-up</strong> — y ≤ layer.{" "}
          <strong className="text-zinc-400">Slice</strong> — y = layer.
        </p>
      </section>

      {showLayerControls && layerExtents ? (
        <section className="space-y-3 border-t border-zinc-800/80 pt-4">
          <div className="font-mono text-xs text-zinc-300">
            Current layer{" "}
            <span className="text-emerald-300/95">y = {selectedLayer}</span>
            <span className="text-zinc-500">
              {" "}
              (range {layerExtents.yMin}–{layerExtents.yMax})
            </span>
          </div>
          <input
            type="range"
            className="h-2 w-full cursor-pointer accent-emerald-500"
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
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
              onClick={() =>
                onSelectedLayerChange(
                  clampLayerY(selectedLayer - 1, layerExtents),
                )
              }
            >
              Prev layer
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
              onClick={() =>
                onSelectedLayerChange(
                  clampLayerY(selectedLayer + 1, layerExtents),
                )
              }
            >
              Next layer
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-2 border-t border-zinc-800/80 pt-4">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Block counts
        </span>
        <p className="font-mono text-sm text-zinc-200">
          {hasStructure ? (
            <>
              {visibleCount.toLocaleString()} / {totalCount.toLocaleString()}{" "}
              <span className="text-zinc-500">visible / total</span>
            </>
          ) : (
            <span className="text-zinc-500">— / — (no geometry)</span>
          )}
        </p>
      </section>

      <div className="mt-auto border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          disabled={!hasStructure}
          className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onRefitCamera}
        >
          Refit camera
        </button>
      </div>
    </aside>
  );
}
