"use client";

import { useState } from "react";
import type { FullStructureBreakdownRow } from "@/src/lib/voxel/blockBreakdown";
import type { LayerViewMode } from "@/src/lib/voxel/layerView";
import { clampLayerY } from "@/src/lib/voxel/layerView";

export type StructureInspectionPresetOption = {
  readonly id: string;
  readonly label: string;
};

export type PreviewLabSource =
  | "preset_towers"
  | "preset_generic"
  | "partial_showcase";

type Props = {
  readonly title?: string;
  /** When set with **`onPreviewSourceChange`**, shows a small source toggle (e.g. `/preview` only). */
  readonly previewSource?: PreviewLabSource;
  readonly onPreviewSourceChange?: (source: PreviewLabSource) => void;
  /** Intro paragraph under the title; defaults to preset-tower copy. */
  readonly panelDescription?: string;
  /** Validator notes when inspecting a generated preset (optional). */
  readonly validationNotes?: readonly string[];
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
  /** Full generated structure only; unchanged by layer slice / build-up. */
  readonly fullStructureBreakdown: readonly FullStructureBreakdownRow[] | null;
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

function LayerSection(props: {
  readonly layerExtents: { yMin: number; yMax: number };
  readonly selectedLayer: number;
  readonly onSelectedLayerChange: (y: number) => void;
}) {
  const { layerExtents: ext, selectedLayer, onSelectedLayerChange } = props;
  return (
    <section className="space-y-3 border-t border-zinc-800/80 pt-4">
      <div className="font-mono text-xs text-zinc-300">
        Current layer{" "}
        <span className="text-emerald-300/95">y = {selectedLayer}</span>
        <span className="text-zinc-500">
          {" "}
          (range {ext.yMin}–{ext.yMax})
        </span>
      </div>
      <input
        type="range"
        className="h-2 w-full cursor-pointer accent-emerald-500"
        min={ext.yMin}
        max={ext.yMax}
        step={1}
        value={clampLayerY(selectedLayer, ext)}
        onChange={(e) =>
          onSelectedLayerChange(
            clampLayerY(Number.parseInt(e.target.value, 10), ext),
          )
        }
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
          onClick={() =>
            onSelectedLayerChange(clampLayerY(selectedLayer - 1, ext))
          }
        >
          Prev layer
        </button>
        <button
          type="button"
          className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
          onClick={() =>
            onSelectedLayerChange(clampLayerY(selectedLayer + 1, ext))
          }
        >
          Next layer
        </button>
      </div>
    </section>
  );
}

/** Shared inspection UI (desktop aside + mobile expanded sheet). */
function InspectionPanelBody(p: Props) {
  const showLayerControls =
    p.hasStructure &&
    p.layerExtents &&
    (p.layerViewMode === "build-up" || p.layerViewMode === "slice");

  const showSourceToggle =
    p.previewSource != null && p.onPreviewSourceChange != null;

  const description =
    p.panelDescription ??
    "Preset loads a hand-authored tower. Layer modes filter the canvas only; the block breakdown below always reflects the full generated structure.";

  return (
    <>
      <div>
        <h2 className="text-sm font-semibold text-white">
          {p.title ?? "Lab inspection"}
        </h2>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">{description}</p>
      </div>

      {showSourceToggle ? (
        <section className="space-y-2">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Source
          </span>
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-900/80 p-0.5">
            <button
              type="button"
              aria-pressed={p.previewSource === "preset_towers"}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${p.previewSource === "preset_towers" ? "bg-emerald-600/90 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              onClick={() => p.onPreviewSourceChange!("preset_towers")}
            >
              Towers
            </button>
            <button
              type="button"
              aria-pressed={p.previewSource === "preset_generic"}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${p.previewSource === "preset_generic" ? "bg-emerald-600/90 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              onClick={() => p.onPreviewSourceChange!("preset_generic")}
            >
              Generic
            </button>
            <button
              type="button"
              aria-pressed={p.previewSource === "partial_showcase"}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${p.previewSource === "partial_showcase" ? "bg-emerald-600/90 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              onClick={() => p.onPreviewSourceChange!("partial_showcase")}
            >
              Partials
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Preset
        </label>
        {p.previewSource === "partial_showcase" ? (
          <p className="rounded-md border border-zinc-700/80 bg-zinc-900/50 px-2 py-2 text-[11px] leading-snug text-zinc-400">
            Preset lists apply to <span className="text-zinc-300">Towers</span> and{" "}
            <span className="text-zinc-300">Generic</span>. This mode uses a static
            developer showcase (partial shapes).
          </p>
        ) : (
          <select
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
            value={p.selectedPresetId}
            onChange={(e) => p.onPresetIdChange(e.target.value)}
          >
            {p.presetOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </section>

      {p.validationNotes && p.validationNotes.length > 0 ? (
        <section className="space-y-1.5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Validation notes
          </span>
          <ul className="space-y-1 rounded-md border border-zinc-700/80 bg-zinc-900/50 px-2 py-2 text-[10px] leading-snug text-zinc-400">
            {p.validationNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
              disabled={!p.hasStructure}
              aria-pressed={p.layerViewMode === mode}
              className={`${modeButtonClass(p.layerViewMode === mode)} disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => p.onLayerViewModeChange(mode)}
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

      {showLayerControls && p.layerExtents ? (
        <LayerSection
          layerExtents={p.layerExtents}
          selectedLayer={p.selectedLayer}
          onSelectedLayerChange={p.onSelectedLayerChange}
        />
      ) : null}

      <section className="space-y-2 border-t border-zinc-800/80 pt-4">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Block counts
        </span>
        <p className="font-mono text-sm text-zinc-200">
          {p.hasStructure ? (
            <>
              {p.visibleCount.toLocaleString()} / {p.totalCount.toLocaleString()}{" "}
              <span className="text-zinc-500">visible / total</span>
            </>
          ) : (
            <span className="text-zinc-500">— / — (no geometry)</span>
          )}
        </p>
      </section>

      {p.fullStructureBreakdown && p.fullStructureBreakdown.length > 0 ? (
        <section className="space-y-2 border-t border-zinc-800/80 pt-4">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Block breakdown
          </span>
          <p className="text-[10px] text-zinc-500">
            Counts by type — full structure (not layer-filtered).
          </p>
          <ul className="max-h-44 space-y-1 overflow-y-auto font-mono text-[11px] leading-snug text-zinc-300">
            {p.fullStructureBreakdown.map((row) => (
              <li
                key={row.blockTypeId}
                className="flex justify-between gap-2 border-b border-zinc-800/40 py-0.5 last:border-b-0"
              >
                <span className="min-w-0 truncate text-zinc-300" title={row.blockTypeId}>
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
          disabled={!p.hasStructure}
          className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={p.onRefitCamera}
        >
          Refit camera
        </button>
      </div>
    </>
  );
}

export function StructureInspectionPanel(props: Props) {
  // Below md: start collapsed so the canvas is primary (ephemeral; no persistence).
  const [mobileInspectionOpen, setMobileInspectionOpen] = useState(false);
  // md+: default expanded; user can collapse to a slim strip for more canvas width.
  const [desktopInspectionOpen, setDesktopInspectionOpen] = useState(true);

  return (
    <>
      {desktopInspectionOpen ? (
        <aside className="hidden h-full min-h-0 w-full flex-row overflow-hidden border-zinc-800/90 bg-zinc-950/98 md:flex md:w-[min(100%,18rem)] md:shrink-0 md:border-l md:border-t-0">
          <button
            type="button"
            className="w-10 shrink-0 self-stretch min-h-0 border-r border-zinc-700/60 bg-zinc-900/40 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-inset"
            title="Hide inspection"
            aria-label="Hide inspection"
            onClick={() => setDesktopInspectionOpen(false)}
          >
            <span className="flex h-full w-full flex-col items-center justify-center">
              <span className="text-xl leading-none text-zinc-400" aria-hidden>
                ›
              </span>
            </span>
          </button>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-5">
            <InspectionPanelBody {...props} />
          </div>
        </aside>
      ) : (
        <div className="hidden h-full w-10 shrink-0 flex-col border-l border-zinc-800/90 bg-zinc-950/98 md:flex">
          <button
            type="button"
            className="flex min-h-0 flex-1 flex-col items-center justify-center px-0 py-4 text-zinc-500 transition-colors hover:bg-zinc-900/80 hover:text-emerald-200/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-inset"
            title="Show inspection"
            aria-label="Show inspection"
            onClick={() => setDesktopInspectionOpen(true)}
          >
            <span className="text-xl leading-none text-zinc-400" aria-hidden>
              ‹
            </span>
          </button>
        </div>
      )}

      {/* <md: collapsible strip + sheet */}
      <div className="flex w-full shrink-0 flex-col border-t border-zinc-800/90 bg-zinc-950/98 md:hidden">
        {!mobileInspectionOpen ? (
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm font-medium text-emerald-200/95 hover:bg-zinc-900/80"
            onClick={() => setMobileInspectionOpen(true)}
          >
            Show inspection
          </button>
        ) : (
          <aside className="flex max-h-[min(52vh,28rem)] min-h-0 flex-row overflow-hidden">
            <button
              type="button"
              className="w-10 shrink-0 self-stretch min-h-0 border-r border-zinc-700/60 bg-zinc-900/40 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-inset"
              title="Hide inspection"
              aria-label="Hide inspection"
              onClick={() => setMobileInspectionOpen(false)}
            >
              <span className="flex h-full w-full flex-col items-center justify-center">
                <span className="text-xl leading-none text-zinc-400" aria-hidden>
                  ›
                </span>
              </span>
            </button>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-5">
                <InspectionPanelBody {...props} />
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
