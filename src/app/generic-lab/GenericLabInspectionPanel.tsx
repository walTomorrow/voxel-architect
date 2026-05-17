"use client";

import type { FullStructureBreakdownRow } from "@/src/lib/voxel/blockBreakdown";
import type { LayerViewMode } from "@/src/lib/voxel/layerView";
import { clampLayerY } from "@/src/lib/voxel/layerView";

type Props = {
  readonly hasStructure: boolean;
  readonly layerViewMode: LayerViewMode;
  readonly onLayerViewModeChange: (mode: LayerViewMode) => void;
  readonly layerExtents: { yMin: number; yMax: number } | null;
  readonly selectedLayer: number;
  readonly onSelectedLayerChange: (y: number) => void;
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly fullStructureBreakdown: readonly FullStructureBreakdownRow[] | null;
  readonly onRefitCamera: () => void;
  readonly showingStaleStructure: boolean;
};

function modeButtonClass(active: boolean): string {
  return [
    "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
    active
      ? "bg-emerald-600/90 text-white ring-1 ring-emerald-400/40"
      : "border border-zinc-600/80 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/90",
  ].join(" ");
}

/** Layer modes, counts, breakdown, and camera refit — no preset picker (lives in editor). */
export function GenericLabInspectionPanel(props: Props) {
  const showLayerControls =
    props.hasStructure &&
    props.layerExtents &&
    (props.layerViewMode === "build-up" || props.layerViewMode === "slice");

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-zinc-800/90 bg-zinc-950/98 md:w-[min(100%,18rem)] md:shrink-0 md:border-l">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Structure inspection</h2>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Layer modes filter the canvas only. Breakdown reflects the last valid
            generated structure.
          </p>
          {props.showingStaleStructure ? (
            <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-1.5 text-[10px] text-amber-200/90">
              Editor state is invalid — canvas shows previous valid build.
            </p>
          ) : null}
        </div>

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
                disabled={!props.hasStructure}
                aria-pressed={props.layerViewMode === mode}
                className={`${modeButtonClass(props.layerViewMode === mode)} disabled:cursor-not-allowed disabled:opacity-40`}
                onClick={() => props.onLayerViewModeChange(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {showLayerControls && props.layerExtents ? (
          <section className="space-y-3 border-t border-zinc-800/80 pt-4">
            <div className="font-mono text-xs text-zinc-300">
              Current layer{" "}
              <span className="text-emerald-300/95">y = {props.selectedLayer}</span>
            </div>
            <input
              type="range"
              className="h-2 w-full cursor-pointer accent-emerald-500"
              min={props.layerExtents.yMin}
              max={props.layerExtents.yMax}
              step={1}
              value={clampLayerY(props.selectedLayer, props.layerExtents)}
              onChange={(e) =>
                props.onSelectedLayerChange(
                  clampLayerY(Number.parseInt(e.target.value, 10), props.layerExtents!),
                )
              }
            />
          </section>
        ) : null}

        <section className="space-y-2 border-t border-zinc-800/80 pt-4">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Block counts
          </span>
          <p className="font-mono text-sm text-zinc-200">
            {props.hasStructure ? (
              <>
                {props.visibleCount.toLocaleString()} /{" "}
                {props.totalCount.toLocaleString()}{" "}
                <span className="text-zinc-500">visible / total</span>
              </>
            ) : (
              <span className="text-zinc-500">— / —</span>
            )}
          </p>
        </section>

        {props.fullStructureBreakdown && props.fullStructureBreakdown.length > 0 ? (
          <section className="space-y-2 border-t border-zinc-800/80 pt-4">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Block breakdown
            </span>
            <ul className="max-h-44 space-y-1 overflow-y-auto font-mono text-[11px] text-zinc-300">
              {props.fullStructureBreakdown.map((row) => (
                <li
                  key={row.blockTypeId}
                  className="flex justify-between gap-2 border-b border-zinc-800/40 py-0.5"
                >
                  <span className="min-w-0 truncate" title={row.blockTypeId}>
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {row.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-auto border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            disabled={!props.hasStructure}
            className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={props.onRefitCamera}
          >
            Refit camera
          </button>
        </div>
      </div>
    </aside>
  );
}
