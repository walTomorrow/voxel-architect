"use client";

import { useMemo, useState } from "react";
import type {
  EntranceSide,
  GenericBuildingBlueprint,
  GenericRoofKind,
  GenericWindowHeightBand,
  GenericWindowMode,
  ResolvedGenericBuilding,
} from "@/src/lib/blueprints/types";
import { DEFAULT_GENERIC_PRESET_ID } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";
import type { VoxelStructure } from "@/src/lib/voxel/types";
import { fullStructureBlockBreakdown } from "@/src/lib/voxel/blockBreakdown";
import {
  type LayerViewMode,
  clampLayerY,
  computeLayerYExtents,
  filterBlocksForLayerView,
} from "@/src/lib/voxel/layerView";
import { GenericLabInspectionPanel } from "@/src/app/generic-lab/GenericLabInspectionPanel";
import {
  CLASSIC_MATERIAL_KEYS,
  GENERIC_LAB_PRESET_OPTIONS,
  MAX_BLOCK_COUNT_MAX,
  MAX_BLOCK_COUNT_MIN,
  blueprintToDebugJson,
  clampInt,
  clonePresetBlueprint,
} from "@/src/app/generic-lab/genericLabUtils";

const BODY_WIDTH_MIN = 5;
const BODY_WIDTH_MAX = 17;
const BODY_DEPTH_MIN = 5;
const BODY_DEPTH_MAX = 13;
const BODY_HEIGHT_MIN = 4;
const BODY_HEIGHT_MAX = 9;
const ROOF_LAYERS_MIN = 1;
const ROOF_LAYERS_MAX = 3;
const ROOF_OVERHANG_MIN = 0;
const ROOF_OVERHANG_MAX = 1;
const ENTRANCE_WIDTH_MIN = 1;
const ENTRANCE_WIDTH_MAX = 3;
const ENTRANCE_HEIGHT_MIN = 2;
const ENTRANCE_HEIGHT_MAX = 4;
const WINDOW_COUNT_MIN = 0;
const WINDOW_COUNT_MAX = 12;

const INPUT_CLASS =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100";
const SELECT_CLASS = INPUT_CLASS;
const TEXTAREA_CLASS =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100";

const ENTRANCE_SIDES: readonly EntranceSide[] = [
  "front",
  "back",
  "left",
  "right",
];
const ROOF_KINDS: readonly GenericRoofKind[] = ["none", "pitched_gable", "shed"];
const WINDOW_MODES: readonly GenericWindowMode[] = [
  "none",
  "front_only",
  "front_and_sides",
  "all_sides",
];
const WINDOW_BANDS: readonly GenericWindowHeightBand[] = ["auto", "mid", "upper"];

const MATERIAL_SLOTS = [
  ["wall", "Wall"],
  ["floor", "Floor"],
  ["roof", "Roof"],
  ["window", "Window"],
  ["door", "Door"],
  ["accent", "Accent"],
] as const;

type ValidSnapshot = {
  readonly structure: VoxelStructure;
  readonly resolved: ResolvedGenericBuilding;
};

function LabSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-zinc-800/80 pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function GenericLabClient() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    DEFAULT_GENERIC_PRESET_ID,
  );
  const [blueprint, setBlueprint] = useState<GenericBuildingBlueprint>(() =>
    clonePresetBlueprint(DEFAULT_GENERIC_PRESET_ID),
  );
  const [blueprintPanelOpen, setBlueprintPanelOpen] = useState(true);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [copyJsonFeedback, setCopyJsonFeedback] = useState<"success" | "error" | null>(
    null,
  );

  const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);

  const currentValid = useMemo((): ValidSnapshot | null => {
    if (!validation.ok || !validation.resolved) return null;
    if (validation.resolved.structureType !== "generic_building") return null;
    const blocks = generateStructureFromResolved(validation.resolved);
    return {
      structure: { blocks },
      resolved: validation.resolved,
    };
  }, [validation]);

  const [lastValidSnapshot, setLastValidSnapshot] = useState<ValidSnapshot | null>(
    null,
  );
  const [trackedValid, setTrackedValid] = useState<ValidSnapshot | null>(null);

  if (currentValid !== trackedValid) {
    setTrackedValid(currentValid);
    if (currentValid) {
      setLastValidSnapshot(currentValid);
    }
  }

  const displayStructure = useMemo(
    () =>
      currentValid?.structure ??
      lastValidSnapshot?.structure ?? { blocks: [] },
    [currentValid, lastValidSnapshot],
  );
  const lastValidResolved =
    currentValid?.resolved ?? lastValidSnapshot?.resolved ?? null;

  const showingStaleStructure =
    !validation.ok && displayStructure.blocks.length > 0;

  const hasStructure = displayStructure.blocks.length > 0;

  const layerExtents = useMemo(
    () => computeLayerYExtents(displayStructure.blocks),
    [displayStructure.blocks],
  );

  const effectiveLayer = useMemo(() => {
    if (!layerExtents) return selectedLayer;
    return clampLayerY(selectedLayer, layerExtents);
  }, [selectedLayer, layerExtents]);

  const visibleStructure: VoxelStructure = useMemo(() => {
    if (!hasStructure) return { blocks: [] };
    if (layerViewMode === "full") return displayStructure;
    return {
      blocks: filterBlocksForLayerView(
        displayStructure.blocks,
        layerViewMode,
        effectiveLayer,
      ),
    };
  }, [displayStructure, hasStructure, layerViewMode, effectiveLayer]);

  const fullStructureBreakdown = useMemo(() => {
    if (!hasStructure) return null;
    return fullStructureBlockBreakdown(displayStructure.blocks);
  }, [displayStructure.blocks, hasStructure]);

  const roofLayersDisabled = blueprint.roof.kind === "none";

  function loadPreset(presetId: string) {
    setSelectedPresetId(presetId);
    setBlueprint(clonePresetBlueprint(presetId));
    setLayerViewMode("full");
  }

  async function copyBlueprintJson() {
    try {
      await navigator.clipboard.writeText(blueprintToDebugJson(blueprint));
      setCopyJsonFeedback("success");
      window.setTimeout(() => setCopyJsonFeedback(null), 2000);
    } catch {
      setCopyJsonFeedback("error");
      window.setTimeout(() => setCopyJsonFeedback(null), 2000);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
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
        <aside className="flex max-h-[50vh] min-h-0 shrink-0 flex-row overflow-hidden border-b border-zinc-800/90 lg:h-full lg:max-h-none lg:w-[min(100%,32rem)] lg:border-b-0 lg:border-r">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Generic blueprint editor
                </h1>
                <p className="mt-1 max-w-prose text-xs text-zinc-500">
                  Edit a <code className="text-zinc-400">GenericBuildingBlueprint</code>{" "}
                  — validation and generation use the component pipeline. Structure
                  inspection is in the right panel.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 lg:hidden"
                onClick={() => setBlueprintPanelOpen(false)}
              >
                Hide editor
              </button>
            </div>

            <div className="mt-4 space-y-3 border-b border-zinc-800/80 pb-4">
              <label className="block text-xs text-zinc-400">
                Starting preset
                <select
                  className={SELECT_CLASS}
                  value={selectedPresetId}
                  onChange={(e) => loadPreset(e.target.value)}
                >
                  {GENERIC_LAB_PRESET_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                onClick={() => loadPreset(selectedPresetId)}
              >
                Reload preset
              </button>
            </div>

            <LabSection title="Metadata">
              <label className="block text-xs text-zinc-400">
                Name
                <input
                  type="text"
                  className={INPUT_CLASS}
                  value={blueprint.metadata.name}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      metadata: { ...b.metadata, name: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Description
                <textarea
                  rows={2}
                  className={TEXTAREA_CLASS}
                  value={blueprint.metadata.description ?? ""}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      metadata: {
                        ...b.metadata,
                        description: e.target.value || undefined,
                      },
                    }))
                  }
                />
              </label>
            </LabSection>

            <LabSection title="Body">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-400">
                  Width ({BODY_WIDTH_MIN}–{BODY_WIDTH_MAX})
                  <input
                    type="number"
                    min={BODY_WIDTH_MIN}
                    max={BODY_WIDTH_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.body.width}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        body: {
                          ...b.body,
                          width: clampInt(
                            Number.parseInt(e.target.value, 10),
                            BODY_WIDTH_MIN,
                            BODY_WIDTH_MAX,
                          ),
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Depth ({BODY_DEPTH_MIN}–{BODY_DEPTH_MAX})
                  <input
                    type="number"
                    min={BODY_DEPTH_MIN}
                    max={BODY_DEPTH_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.body.depth}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        body: {
                          ...b.body,
                          depth: clampInt(
                            Number.parseInt(e.target.value, 10),
                            BODY_DEPTH_MIN,
                            BODY_DEPTH_MAX,
                          ),
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Height ({BODY_HEIGHT_MIN}–{BODY_HEIGHT_MAX})
                  <input
                    type="number"
                    min={BODY_HEIGHT_MIN}
                    max={BODY_HEIGHT_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.body.height}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        body: {
                          ...b.body,
                          height: clampInt(
                            Number.parseInt(e.target.value, 10),
                            BODY_HEIGHT_MIN,
                            BODY_HEIGHT_MAX,
                          ),
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Wall thickness
                  <select
                    className={SELECT_CLASS}
                    value={blueprint.body.wallThickness}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        body: {
                          ...b.body,
                          wallThickness: Number.parseInt(e.target.value, 10) as 1 | 2,
                        },
                      }))
                    }
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </label>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={blueprint.body.hollowInterior}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      body: { ...b.body, hollowInterior: e.target.checked },
                    }))
                  }
                />
                Hollow interior
              </label>
            </LabSection>

            <LabSection title="Roof">
              <label className="block text-xs text-zinc-400">
                Kind
                <select
                  className={SELECT_CLASS}
                  value={blueprint.roof.kind}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      roof: {
                        ...b.roof,
                        kind: e.target.value as GenericRoofKind,
                      },
                    }))
                  }
                >
                  {ROOF_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-400">
                  Layers ({ROOF_LAYERS_MIN}–{ROOF_LAYERS_MAX})
                  <input
                    type="number"
                    min={ROOF_LAYERS_MIN}
                    max={ROOF_LAYERS_MAX}
                    disabled={roofLayersDisabled}
                    className={`${INPUT_CLASS} disabled:opacity-40`}
                    value={blueprint.roof.layers ?? 2}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        roof: {
                          ...b.roof,
                          layers: clampInt(
                            Number.parseInt(e.target.value, 10),
                            ROOF_LAYERS_MIN,
                            ROOF_LAYERS_MAX,
                          ),
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Overhang ({ROOF_OVERHANG_MIN}–{ROOF_OVERHANG_MAX})
                  <input
                    type="number"
                    min={ROOF_OVERHANG_MIN}
                    max={ROOF_OVERHANG_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.roof.overhang ?? 0}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        roof: {
                          ...b.roof,
                          overhang: clampInt(
                            Number.parseInt(e.target.value, 10),
                            ROOF_OVERHANG_MIN,
                            ROOF_OVERHANG_MAX,
                          ),
                        },
                      }))
                    }
                  />
                </label>
              </div>
            </LabSection>

            <LabSection title="Entrance">
              <label className="block text-xs text-zinc-400">
                Side
                <select
                  className={SELECT_CLASS}
                  value={blueprint.openings.entrance.side}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        entrance: {
                          ...b.openings.entrance,
                          side: e.target.value as EntranceSide,
                        },
                      },
                    }))
                  }
                >
                  {ENTRANCE_SIDES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-400">
                  Width ({ENTRANCE_WIDTH_MIN}–{ENTRANCE_WIDTH_MAX})
                  <input
                    type="number"
                    min={ENTRANCE_WIDTH_MIN}
                    max={ENTRANCE_WIDTH_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.openings.entrance.width}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        openings: {
                          ...b.openings,
                          entrance: {
                            ...b.openings.entrance,
                            width: clampInt(
                              Number.parseInt(e.target.value, 10),
                              ENTRANCE_WIDTH_MIN,
                              ENTRANCE_WIDTH_MAX,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Height ({ENTRANCE_HEIGHT_MIN}–{ENTRANCE_HEIGHT_MAX})
                  <input
                    type="number"
                    min={ENTRANCE_HEIGHT_MIN}
                    max={ENTRANCE_HEIGHT_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.openings.entrance.height}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        openings: {
                          ...b.openings,
                          entrance: {
                            ...b.openings.entrance,
                            height: clampInt(
                              Number.parseInt(e.target.value, 10),
                              ENTRANCE_HEIGHT_MIN,
                              ENTRANCE_HEIGHT_MAX,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </label>
              </div>
            </LabSection>

            <LabSection title="Windows">
              <label className="block text-xs text-zinc-400">
                Mode
                <select
                  className={SELECT_CLASS}
                  value={blueprint.openings.windows.mode}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        windows: {
                          ...b.openings.windows,
                          mode: e.target.value as GenericWindowMode,
                        },
                      },
                    }))
                  }
                >
                  {WINDOW_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              {blueprint.openings.windows.mode === "none" ? (
                <p className="text-[11px] text-zinc-500">Count is ignored when mode is none.</p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-400">
                  Count ({WINDOW_COUNT_MIN}–{WINDOW_COUNT_MAX})
                  <input
                    type="number"
                    min={WINDOW_COUNT_MIN}
                    max={WINDOW_COUNT_MAX}
                    className={INPUT_CLASS}
                    value={blueprint.openings.windows.count}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        openings: {
                          ...b.openings,
                          windows: {
                            ...b.openings.windows,
                            count: clampInt(
                              Number.parseInt(e.target.value, 10),
                              WINDOW_COUNT_MIN,
                              WINDOW_COUNT_MAX,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Height band
                  <select
                    className={SELECT_CLASS}
                    value={blueprint.openings.windows.heightBand ?? "auto"}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        openings: {
                          ...b.openings,
                          windows: {
                            ...b.openings.windows,
                            heightBand: e.target.value as GenericWindowHeightBand,
                          },
                        },
                      }))
                    }
                  >
                    {WINDOW_BANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </LabSection>

            <LabSection title="Features">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={blueprint.features.chimney?.enabled ?? false}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      features: {
                        ...b.features,
                        chimney: {
                          enabled: e.target.checked,
                          side: b.features.chimney?.side ?? "right",
                        },
                      },
                    }))
                  }
                />
                Chimney
              </label>
              {blueprint.features.chimney?.enabled ? (
                <label className="block text-xs text-zinc-400">
                  Chimney side
                  <select
                    className={SELECT_CLASS}
                    value={blueprint.features.chimney?.side ?? "right"}
                    onChange={(e) =>
                      setBlueprint((b) => ({
                        ...b,
                        features: {
                          ...b.features,
                          chimney: {
                            enabled: true,
                            side: e.target.value as "left" | "right",
                          },
                        },
                      }))
                    }
                  >
                    <option value="left">left</option>
                    <option value="right">right</option>
                  </select>
                </label>
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={blueprint.features.frontStep?.enabled ?? false}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      features: {
                        ...b.features,
                        frontStep: { enabled: e.target.checked },
                      },
                    }))
                  }
                />
                Front step
              </label>
            </LabSection>

            <LabSection title="Materials">
              <div className="grid grid-cols-2 gap-3">
                {MATERIAL_SLOTS.map(([key, label]) => (
                  <label key={key} className="block text-xs text-zinc-400">
                    {label}
                    <select
                      className={SELECT_CLASS}
                      value={blueprint.materials[key]}
                      onChange={(e) =>
                        setBlueprint((b) => ({
                          ...b,
                          materials: { ...b.materials, [key]: e.target.value },
                        }))
                      }
                    >
                      {CLASSIC_MATERIAL_KEYS.map((mk) => (
                        <option key={mk} value={mk}>
                          {mk}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </LabSection>

            <LabSection title="Constraints">
              <label className="block text-xs text-zinc-400">
                Max block count ({MAX_BLOCK_COUNT_MIN.toLocaleString()}–
                {MAX_BLOCK_COUNT_MAX.toLocaleString()})
                <input
                  type="number"
                  min={MAX_BLOCK_COUNT_MIN}
                  max={MAX_BLOCK_COUNT_MAX}
                  className={INPUT_CLASS}
                  value={blueprint.constraints.maxBlockCount}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      constraints: {
                        ...b.constraints,
                        maxBlockCount: clampInt(
                          Number.parseInt(e.target.value, 10),
                          MAX_BLOCK_COUNT_MIN,
                          MAX_BLOCK_COUNT_MAX,
                        ),
                      },
                    }))
                  }
                />
              </label>
            </LabSection>

            <LabSection title="Validation">
              {validation.ok ? (
                <p className="text-sm text-emerald-400/95">Blueprint OK</p>
              ) : (
                <ul className="list-inside list-disc space-y-1 text-sm text-red-400/95">
                  {validation.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
              {validation.notes.length > 0 ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-200/80">
                  {validation.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
              {showingStaleStructure ? (
                <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-1.5 text-xs text-amber-200/90">
                  Current fields are invalid — canvas shows the previous valid
                  structure.
                </p>
              ) : null}
            </LabSection>

            <LabSection title="Resolved stats (last valid)">
              {lastValidResolved ? (
                <div className="space-y-2 font-mono text-[11px] text-zinc-300">
                  <p>
                    Blocks:{" "}
                    <span className="text-zinc-100">
                      {displayStructure.blocks.length.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Grid: W={lastValidResolved.grid.width} D=
                    {lastValidResolved.grid.depth} body=
                    {lastValidResolved.grid.bodyLayers} roof=
                    {lastValidResolved.grid.roofLayers} overhang=
                    {lastValidResolved.grid.overhang}
                  </p>
                  <p>
                    Body: {lastValidResolved.body.width}×{lastValidResolved.body.depth}{" "}
                    h={lastValidResolved.body.height} T=
                    {lastValidResolved.body.wallThickness}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No valid structure yet.</p>
              )}
            </LabSection>

            <LabSection title="Debug">
              <p className="text-[11px] text-zinc-500">
                Current editor state (may be invalid). Not blueprintExchange.
              </p>
              <pre className="max-h-48 overflow-auto rounded border border-zinc-800 bg-zinc-900/80 p-2 font-mono text-[10px] text-zinc-400">
                {blueprintToDebugJson(blueprint)}
              </pre>
              <button
                type="button"
                className="rounded-md border border-emerald-700/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-900/50"
                onClick={() => void copyBlueprintJson()}
              >
                Copy GenericBuildingBlueprint JSON
              </button>
              {copyJsonFeedback === "success" ? (
                <p className="text-xs text-emerald-400">Copied to clipboard.</p>
              ) : null}
              {copyJsonFeedback === "error" ? (
                <p className="text-xs text-red-400">Copy failed.</p>
              ) : null}
            </LabSection>
          </div>

          <div className="hidden w-10 shrink-0 flex-col border-l border-zinc-800/90 lg:flex">
            <button
              type="button"
              className="flex flex-1 items-center justify-center text-zinc-400 hover:bg-zinc-900/80"
              title="Hide blueprint editor"
              aria-label="Hide blueprint editor"
              onClick={() => setBlueprintPanelOpen(false)}
            >
              ‹
            </button>
          </div>
        </aside>
      ) : null}

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <main className="relative h-full min-h-[min(52vh,26rem)] min-w-0 flex-1 lg:min-h-0">
          {showingStaleStructure ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-2">
              <p className="rounded-md border border-amber-500/40 bg-amber-950/80 px-3 py-1.5 text-xs text-amber-100/95 shadow-lg backdrop-blur-sm">
                Invalid blueprint — showing last valid structure
              </p>
            </div>
          ) : null}
          {!hasStructure && !validation.ok ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-500">
              Fix validation errors to generate a structure.
            </div>
          ) : null}
          {!hasStructure && validation.ok ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-500">
              Generating…
            </div>
          ) : null}
          {hasStructure ? (
            <VoxelViewer
              className="h-full w-full"
              structure={visibleStructure}
              boundsStructure={displayStructure}
              cameraResetNonce={cameraResetNonce}
            />
          ) : null}
        </main>

        <GenericLabInspectionPanel
          hasStructure={hasStructure}
          layerViewMode={layerViewMode}
          onLayerViewModeChange={setLayerViewMode}
          layerExtents={layerExtents}
          selectedLayer={effectiveLayer}
          onSelectedLayerChange={setSelectedLayer}
          visibleCount={visibleStructure.blocks.length}
          totalCount={displayStructure.blocks.length}
          fullStructureBreakdown={fullStructureBreakdown}
          onRefitCamera={() => setCameraResetNonce((n) => n + 1)}
          showingStaleStructure={showingStaleStructure}
        />
      </div>
    </div>
  );
}
