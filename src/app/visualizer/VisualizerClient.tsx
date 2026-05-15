"use client";

import { useEffect, useMemo, useState } from "react";
import type { MedievalTowerBlueprint } from "@/src/lib/blueprints/types";
import {
  DEFAULT_MEDIEVAL_PRESET_ID,
  MEDIEVAL_TOWER_PRESETS,
  SAMPLE_MEDIEVAL_TOWER_BLUEPRINT,
  getMedievalTowerPreset,
} from "@/src/lib/blueprints/sampleBlueprints";
import { serializeBlueprintExchange } from "@/src/lib/blueprints/blueprintExchange";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { StructureInspectionPanel } from "@/src/components/voxel/StructureInspectionPanel";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";
import type { VoxelStructure } from "@/src/lib/voxel/types";
import { fullStructureBlockBreakdown } from "@/src/lib/voxel/blockBreakdown";
import {
  type LayerViewMode,
  clampLayerY,
  computeLayerYExtents,
  filterBlocksForLayerView,
} from "@/src/lib/voxel/layerView";
import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";

/** UI / perf caps (stricter than schema minimums where applicable). */
const FOOTPRINT_MIN = 5;
const FOOTPRINT_MAX = 32;
const HEIGHT_MIN = 8;
const HEIGHT_MAX = 48;
const ROOF_HEIGHT_MIN = 1;
const ROOF_HEIGHT_MAX = 12;
const ROOF_OVERHANG_UI_MAX = 4;
const FLOOR_COUNT_MIN = 1;
const FLOOR_COUNT_MAX = 30;
const MAX_BLOCK_COUNT_MIN = 1_000;
const MAX_BLOCK_COUNT_MAX = 500_000;
/** Lab UI cap for wall thickness (validator allows more on large footprints). */
const WALL_THICKNESS_UI_MAX = 8;
/** Lab UI cap for windows per side (validator allows any non-negative int). */
const WINDOWS_COUNT_PER_SIDE_UI_MAX = 12;

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function cloneSampleBlueprint(): MedievalTowerBlueprint {
  return structuredClone(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT) as MedievalTowerBlueprint;
}

/** Mirrors `validateBlueprint` body-layer math for helper text and input caps (read-only preview). */
function verticalEmphasisFactor(
  v: MedievalTowerBlueprint["massing"]["verticalEmphasis"],
): number {
  switch (v) {
    case "low":
      return 0.85;
    case "medium":
      return 1;
    case "tall":
      return 1.15;
    default:
      return 1;
  }
}

function previewBodyWallLayers(bp: MedievalTowerBlueprint): number {
  const Hbud = bp.dimensions.height;
  const { levels, massing, roof } = bp;
  const roofLayersEff = roof.style === "flat" ? 1 : Math.max(1, roof.height);
  const foundationLayers = 1;
  let bodyLayers = Math.floor(
    levels.floorCount * verticalEmphasisFactor(massing.verticalEmphasis),
  );
  bodyLayers = Math.max(1, Math.min(bodyLayers, levels.floorCount + 2));
  const minTotal = foundationLayers + bodyLayers + roofLayersEff;
  if (minTotal > Hbud) {
    const slack = minTotal - Hbud;
    bodyLayers = Math.max(1, bodyLayers - slack);
  }
  return bodyLayers;
}

function planFootprintWD(bp: MedievalTowerBlueprint): { W: number; D: number } {
  let W = bp.dimensions.width;
  let D = bp.dimensions.length;
  if (bp.massing.footprint === "square") {
    D = W;
  }
  return { W, D };
}

const CLASSIC_KEYS = Object.keys(CLASSIC_BLOCK_PACK).sort((a, b) =>
  a.localeCompare(b),
);

const PRESET_INSPECTION_OPTIONS = MEDIEVAL_TOWER_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
}));

export function VisualizerClient() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    DEFAULT_MEDIEVAL_PRESET_ID,
  );
  const [blueprint, setBlueprint] = useState<MedievalTowerBlueprint>(
    cloneSampleBlueprint,
  );
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [blueprintPanelOpen, setBlueprintPanelOpen] = useState(true);
  const [copyBlueprintFeedback, setCopyBlueprintFeedback] = useState<
    "success" | "error" | null
  >(null);

  const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);

  const structure: VoxelStructure = useMemo(() => {
    if (!validation.ok || !validation.resolved) {
      return { blocks: [] };
    }
    return {
      blocks: generateStructureFromResolved(validation.resolved),
    };
  }, [validation]);

  const layerExtents = useMemo(
    () => computeLayerYExtents(structure.blocks),
    [structure.blocks],
  );

  useEffect(() => {
    if (!layerExtents) return;
    setSelectedLayer((y) => clampLayerY(y, layerExtents));
  }, [structure.blocks, layerExtents]);

  useEffect(() => {
    if (!validation.ok) setCopyBlueprintFeedback(null);
  }, [validation.ok]);

  const visibleStructure: VoxelStructure = useMemo(() => {
    if (!validation.ok || structure.blocks.length === 0) {
      return { blocks: [] };
    }
    if (layerViewMode === "full") {
      return structure;
    }
    return {
      blocks: filterBlocksForLayerView(
        structure.blocks,
        layerViewMode,
        selectedLayer,
      ),
    };
  }, [validation.ok, structure, layerViewMode, selectedLayer]);

  const visibleCount = visibleStructure.blocks.length;
  const totalCount = structure.blocks.length;

  const fullStructureBreakdown = useMemo(() => {
    if (!validation.ok || structure.blocks.length === 0) return null;
    return fullStructureBlockBreakdown(structure.blocks);
  }, [validation.ok, structure.blocks]);

  const bp = blueprint;
  const isSquare = bp.massing.footprint === "square";
  const { W: planW, D: planD } = planFootprintWD(bp);
  const T = bp.massing.wallThickness;
  const maxDoorW = Math.max(1, planW - 2 * T - 2);
  const bodyLayersPreview = previewBodyWallLayers(bp);
  const maxEntranceHeightUi = Math.max(2, bodyLayersPreview);
  const maxWallThicknessUi = Math.max(
    1,
    Math.min(
      WALL_THICKNESS_UI_MAX,
      bp.massing.hollowInterior
        ? Math.min(Math.floor((planW - 2) / 2), Math.floor((planD - 2) / 2))
        : Math.min(planW - 2, planD - 2, WALL_THICKNESS_UI_MAX),
    ),
  );

  const handleLayerViewModeChange = (next: LayerViewMode) => {
    setLayerViewMode(next);
    if (next !== "full" && layerExtents) {
      // Start onion inspection from foundation (lowest voxel y).
      setSelectedLayer(layerExtents.yMin);
    }
  };

  const handlePresetIdChange = (id: string) => {
    const preset = getMedievalTowerPreset(id);
    if (!preset) return;
    setSelectedPresetId(id);
    setLayerViewMode("full");
    setBlueprint(structuredClone(preset.blueprint) as MedievalTowerBlueprint);
  };

  const handleCopyBlueprintJson = async () => {
    setCopyBlueprintFeedback(null);
    if (!validation.ok) return;
    const json = serializeBlueprintExchange(blueprint);
    const clip =
      typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clip || typeof clip.writeText !== "function") {
      setCopyBlueprintFeedback("error");
      return;
    }
    try {
      await clip.writeText(json);
      setCopyBlueprintFeedback("success");
    } catch {
      setCopyBlueprintFeedback("error");
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100 lg:flex-row">
      {!blueprintPanelOpen ? (
        <>
          <div className="shrink-0 border-b border-zinc-800/90 bg-zinc-950/98 lg:hidden">
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-sm font-medium text-emerald-200/95 hover:bg-zinc-900/80"
              onClick={() => setBlueprintPanelOpen(true)}
            >
              Show blueprint editor
            </button>
          </div>
          <div className="hidden h-full w-10 shrink-0 flex-col border-zinc-800/90 bg-zinc-950/98 lg:flex lg:border-r">
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center px-0 py-4 text-emerald-200/95 hover:bg-zinc-900/80"
              title="Show blueprint editor"
              aria-label="Show blueprint editor"
              onClick={() => setBlueprintPanelOpen(true)}
            >
              <span className="text-xl leading-none text-zinc-400" aria-hidden>
                ›
              </span>
            </button>
          </div>
        </>
      ) : null}
      {blueprintPanelOpen ? (
        <aside className="max-h-[45vh] shrink-0 flex min-h-0 flex-row overflow-hidden border-b border-zinc-800/90 lg:h-full lg:max-h-none lg:min-h-0 lg:w-[min(100%,32rem)] lg:border-b-0 lg:border-r">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Blueprint editor</h1>
            <p className="mt-1 max-w-prose text-xs text-zinc-500">
              Edit the medieval tower blueprint; validation and generation stay
              deterministic. Structure inspection (preset, layers, refit) lives in
              the right panel — no blocks are placed by hand in the UI.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
              onClick={() => {
                setSelectedPresetId(DEFAULT_MEDIEVAL_PRESET_ID);
                setLayerViewMode("full");
                setBlueprint(cloneSampleBlueprint());
              }}
            >
              Reset to default (Northwatch)
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
              onClick={() => {
                const preset = getMedievalTowerPreset(selectedPresetId);
                if (!preset) return;
                setLayerViewMode("full");
                setBlueprint(
                  structuredClone(preset.blueprint) as MedievalTowerBlueprint,
                );
              }}
            >
              Reload preset
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-b border-zinc-800/80 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!validation.ok}
              className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                void handleCopyBlueprintJson();
              }}
            >
              Copy blueprint JSON
            </button>
            {!validation.ok ? (
              <p className="text-xs text-amber-200/90">
                Fix validation errors before exporting.
              </p>
            ) : null}
          </div>
          {copyBlueprintFeedback === "success" ? (
            <p className="text-xs text-emerald-400/90">
              Blueprint JSON copied to clipboard!
            </p>
          ) : null}
          {copyBlueprintFeedback === "error" ? (
            <p className="text-xs text-red-400/95">
              Blueprint JSON failed to copy. Please check browser settings.
            </p>
          ) : null}
        </div>

        <dl className="mt-5 space-y-3 border-b border-zinc-800/80 pb-4 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Name
            </dt>
            <dd className="mt-0.5 text-zinc-200">{bp.metadata.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Structure type
            </dt>
            <dd className="mt-0.5 font-mono text-zinc-200">{bp.structureType}</dd>
          </div>
        </dl>

        <form
          className="mt-5 space-y-6 text-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Dimensions
            </h2>
            {isSquare && (
              <p className="mt-1 text-[11px] text-zinc-500">
                Square footprint: width and length stay in sync.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs text-zinc-400">
                Width ({FOOTPRINT_MIN}–{FOOTPRINT_MAX})
                <input
                  type="number"
                  min={FOOTPRINT_MIN}
                  max={FOOTPRINT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.dimensions.width}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      FOOTPRINT_MIN,
                      FOOTPRINT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      dimensions: isSquare
                        ? { ...b.dimensions, width: v, length: v }
                        : { ...b.dimensions, width: v },
                    }));
                  }}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Length ({FOOTPRINT_MIN}–{FOOTPRINT_MAX})
                <input
                  type="number"
                  min={FOOTPRINT_MIN}
                  max={FOOTPRINT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.dimensions.length}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      FOOTPRINT_MIN,
                      FOOTPRINT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      dimensions: isSquare
                        ? { ...b.dimensions, width: v, length: v }
                        : { ...b.dimensions, length: v },
                    }));
                  }}
                />
              </label>
              <label className="col-span-2 block text-xs text-zinc-400">
                Height ({HEIGHT_MIN}–{HEIGHT_MAX})
                <input
                  type="number"
                  min={HEIGHT_MIN}
                  max={HEIGHT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.dimensions.height}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      HEIGHT_MIN,
                      HEIGHT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      dimensions: { ...b.dimensions, height: v },
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Materials (classic pack)
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["wall", "Wall"],
                  ["floor", "Floor"],
                  ["roof", "Roof"],
                  ["window", "Window"],
                  ["door", "Door"],
                  ["accent", "Accent"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs text-zinc-400">
                  {label}
                  <select
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[11px] text-zinc-100"
                    value={bp.materials[key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBlueprint((b) => ({
                        ...b,
                        materials: { ...b.materials, [key]: value },
                      }));
                    }}
                  >
                    {CLASSIC_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Levels
            </h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-zinc-400">
                Floor count ({FLOOR_COUNT_MIN}–{FLOOR_COUNT_MAX})
                <input
                  type="number"
                  min={FLOOR_COUNT_MIN}
                  max={FLOOR_COUNT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.levels.floorCount}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      FLOOR_COUNT_MIN,
                      FLOOR_COUNT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      levels: { ...b.levels, floorCount: v },
                    }));
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={bp.levels.includeInteriorFloors}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      levels: {
                        ...b.levels,
                        includeInteriorFloors: e.target.checked,
                      },
                    }))
                  }
                />
                Include interior floors
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Massing
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Vertical emphasis scales effective body wall layers (preview{" "}
              <span className="font-mono text-zinc-400">{bodyLayersPreview}</span>
              ) before the height budget may clamp them further in validation notes.
              Low ≈ 0.85×, medium = 1×, tall ≈ 1.15× floor count (capped by floor count + 2
              and by fitting foundation + body + roof in dimensions.height).
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-zinc-400">
                Vertical emphasis
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.massing.verticalEmphasis}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      massing: {
                        ...b.massing,
                        verticalEmphasis: e.target
                          .value as MedievalTowerBlueprint["massing"]["verticalEmphasis"],
                      },
                    }))
                  }
                >
                  <option value="low">low (squatter shaft)</option>
                  <option value="medium">medium</option>
                  <option value="tall">tall (more body layers)</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Wall thickness (1–{maxWallThicknessUi}
                {bp.massing.hollowInterior
                  ? "; hollow needs inner void ≥ 2·T + 2 on each axis"
                  : ""}
                )
                <input
                  type="number"
                  min={1}
                  max={maxWallThicknessUi}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.massing.wallThickness}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      1,
                      maxWallThicknessUi,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      massing: { ...b.massing, wallThickness: v },
                    }));
                  }}
                />
              </label>
              <label className="col-span-full flex cursor-pointer items-start gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-zinc-600"
                  checked={bp.massing.hollowInterior}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      massing: {
                        ...b.massing,
                        hollowInterior: e.target.checked,
                      },
                    }))
                  }
                />
                <span>
                  Hollow interior (void inside the shell). If the footprint is too small
                  for the chosen thickness, validation fails until you widen the tower or
                  reduce thickness.
                </span>
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Openings
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-zinc-400">
                Entrance side
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.entranceSide}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        entranceSide: e.target.value as MedievalTowerBlueprint["openings"]["entranceSide"],
                      },
                    }))
                  }
                >
                  <option value="front">front</option>
                  <option value="back">back</option>
                  <option value="left">left</option>
                  <option value="right">right</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Entrance style
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.entranceStyle}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        entranceStyle: e.target
                          .value as MedievalTowerBlueprint["openings"]["entranceStyle"],
                      },
                    }))
                  }
                >
                  <option value="simple">simple</option>
                  <option value="arched">arched</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Entrance width (1–{maxDoorW} for current footprint & thickness)
                <input
                  type="number"
                  min={1}
                  max={maxDoorW}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.openings.entranceWidth}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      1,
                      maxDoorW,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      openings: { ...b.openings, entranceWidth: v },
                    }));
                  }}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Entrance height (2–{maxEntranceHeightUi} body wall layers; preview{" "}
                <span className="font-mono text-zinc-400">{bodyLayersPreview}</span>)
                <input
                  type="number"
                  min={2}
                  max={maxEntranceHeightUi}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.openings.entranceHeight}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      2,
                      maxEntranceHeightUi,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      openings: { ...b.openings, entranceHeight: v },
                    }));
                  }}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Window style
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.windowsStyle}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        windowsStyle: e.target
                          .value as MedievalTowerBlueprint["openings"]["windowsStyle"],
                      },
                    }))
                  }
                >
                  <option value="small">small</option>
                  <option value="narrow">narrow</option>
                  <option value="arched">arched</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Window placement
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.windowsPlacement}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        windowsPlacement: e.target
                          .value as MedievalTowerBlueprint["openings"]["windowsPlacement"],
                      },
                    }))
                  }
                >
                  <option value="none">none</option>
                  <option value="front_only">front_only</option>
                  <option value="symmetric">symmetric</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Window floors
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.windowsFloors}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        windowsFloors: e.target
                          .value as MedievalTowerBlueprint["openings"]["windowsFloors"],
                      },
                    }))
                  }
                >
                  <option value="none">none (no window bands)</option>
                  <option value="upper">
                    upper (only above mid-body; pairs well with tall emphasis)
                  </option>
                  <option value="all">all (body layers y ≥ 1, still placement-gated)</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Windows per side (0–{WINDOWS_COUNT_PER_SIDE_UI_MAX}; 0 disables windows)
                <input
                  type="number"
                  min={0}
                  max={WINDOWS_COUNT_PER_SIDE_UI_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.openings.windowsCountPerSide}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      0,
                      WINDOWS_COUNT_PER_SIDE_UI_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      openings: { ...b.openings, windowsCountPerSide: v },
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Roof
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-zinc-400">
                Style
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.roof.style}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      roof: {
                        ...b.roof,
                        style: e.target.value as MedievalTowerBlueprint["roof"]["style"],
                      },
                    }))
                  }
                >
                  <option value="flat">flat</option>
                  <option value="stepped_pyramid">stepped_pyramid</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Roof height ({ROOF_HEIGHT_MIN}–{ROOF_HEIGHT_MAX})
                <input
                  type="number"
                  min={ROOF_HEIGHT_MIN}
                  max={ROOF_HEIGHT_MAX}
                  disabled={bp.roof.style === "flat"}
                  title={
                    bp.roof.style === "flat"
                      ? "Flat roof uses one layer; height is ignored."
                      : undefined
                  }
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
                  value={bp.roof.height}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      ROOF_HEIGHT_MIN,
                      ROOF_HEIGHT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      roof: { ...b.roof, height: v },
                    }));
                  }}
                />
              </label>
              <label className="col-span-full block text-xs text-zinc-400">
                Overhang (0–{ROOF_OVERHANG_UI_MAX}; validator clamps to 0–2)
                <input
                  type="number"
                  min={0}
                  max={ROOF_OVERHANG_UI_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.roof.overhang}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      0,
                      ROOF_OVERHANG_UI_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      roof: { ...b.roof, overhang: v },
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Features
            </h2>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={bp.features.crenellations}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      features: {
                        ...b.features,
                        crenellations: e.target.checked,
                      },
                    }))
                  }
                />
                Crenellations
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={bp.features.cornerPillars}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      features: {
                        ...b.features,
                        cornerPillars: e.target.checked,
                      },
                    }))
                  }
                />
                Corner pillars
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Constraints
            </h2>
            <label className="mt-3 block text-xs text-zinc-400">
              Max block count ({MAX_BLOCK_COUNT_MIN.toLocaleString()}–
              {MAX_BLOCK_COUNT_MAX.toLocaleString()})
              <input
                type="number"
                min={MAX_BLOCK_COUNT_MIN}
                max={MAX_BLOCK_COUNT_MAX}
                step={1000}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                value={bp.constraints.maxBlockCount}
                onChange={(e) => {
                  const v = clampInt(
                    Number.parseInt(e.target.value, 10),
                    MAX_BLOCK_COUNT_MIN,
                    MAX_BLOCK_COUNT_MAX,
                  );
                  setBlueprint((b) => ({
                    ...b,
                    constraints: { ...b.constraints, maxBlockCount: v },
                  }));
                }}
              />
            </label>
          </section>
        </form>

        <div className="mt-6 border-t border-zinc-800/80 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Validation
          </h2>
          {validation.ok ? (
            <p className="mt-2 text-xs text-emerald-400/90">Blueprint OK.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-xs text-red-400/95">
              {validation.errors.map((err, i) => (
                <li key={`${i}-${err}`} className="rounded bg-red-950/40 px-2 py-1.5">
                  {err}
                </li>
              ))}
            </ul>
          )}
          {validation.notes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Notes / simplifications
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-200/85">
                {validation.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>
        <button
          type="button"
          className="w-10 shrink-0 self-stretch min-h-0 border-l border-zinc-700/60 bg-zinc-900/40 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-inset"
          title="Hide blueprint editor"
          aria-label="Hide blueprint editor"
          onClick={() => setBlueprintPanelOpen(false)}
        >
          <span className="flex h-full w-full flex-col items-center justify-center">
            <span className="text-xl leading-none text-zinc-400" aria-hidden>
              ‹
            </span>
          </span>
        </button>
      </aside>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[min(50vh,28rem)] flex-1 min-w-0 md:min-h-0">
          {validation.ok ? (
            <VoxelViewer
              className="h-full w-full"
              structure={visibleStructure}
              boundsStructure={structure}
              cameraResetNonce={cameraResetNonce}
            />
          ) : (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-medium text-zinc-300">
                Blueprint is invalid — geometry hidden
              </p>
              <p className="max-w-sm text-xs text-zinc-500">
                Adjust parameters, reload a preset, or use Reset to default
                (Northwatch). The previous valid model is not shown so you are not
                misled by stale voxels.
              </p>
            </div>
          )}
        </div>

        <StructureInspectionPanel
          presetOptions={PRESET_INSPECTION_OPTIONS}
          selectedPresetId={selectedPresetId}
          onPresetIdChange={handlePresetIdChange}
          hasStructure={validation.ok && totalCount > 0}
          layerViewMode={layerViewMode}
          onLayerViewModeChange={handleLayerViewModeChange}
          layerExtents={layerExtents}
          selectedLayer={selectedLayer}
          onSelectedLayerChange={setSelectedLayer}
          visibleCount={visibleCount}
          totalCount={totalCount}
          fullStructureBreakdown={fullStructureBreakdown}
          onRefitCamera={() => setCameraResetNonce((n) => n + 1)}
        />
      </div>
    </div>
  );
}
