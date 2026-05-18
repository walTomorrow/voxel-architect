"use client";

import { useMemo, useState } from "react";
import { DEFAULT_GENERIC_V2_PRESET_ID } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type { ComponentId } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ClassicMaterialKey } from "@/src/lib/blueprints/types";
import { generateStructure } from "@/src/lib/generation/generateStructure";
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
import { CLASSIC_MATERIAL_KEYS } from "@/src/app/generic-lab/genericLabUtils";
import { ComponentTreePanel } from "@/src/app/generic-lab/v2/ComponentTreePanel";
import { ComponentInspectorPanel } from "@/src/app/generic-lab/v2/ComponentInspectorPanel";
import { ValidationPanel } from "@/src/app/generic-lab/v2/ValidationPanel";
import { DebugPanel } from "@/src/app/generic-lab/v2/DebugPanel";
import {
  GENERIC_LAB_V2_PRESET_OPTIONS,
  blueprintToDebugJson,
  cloneV2PresetBlueprint,
  findRootRoom,
  setRootMaterial,
  summarizeComponentPlanV2,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";

const SELECT_CLASS =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100";

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
};

export function GenericLabV2Client() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    DEFAULT_GENERIC_V2_PRESET_ID,
  );
  const [draft, setDraft] = useState<GenericBuildingBlueprintV2Draft>(() =>
    cloneV2PresetBlueprint(DEFAULT_GENERIC_V2_PRESET_ID),
  );
  const [selectedComponentId, setSelectedComponentId] = useState<ComponentId | null>(
    "main-room",
  );
  const [editorPanelOpen, setEditorPanelOpen] = useState(true);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);

  const validation = useMemo(() => validateBlueprint(draft), [draft]);

  const v2Validation = useMemo(() => {
    if (!isBlueprintValidationResultV2(validation)) return null;
    return validation;
  }, [validation]);

  const currentValid = useMemo((): ValidSnapshot | null => {
    if (!v2Validation?.ok) return null;
    try {
      const blocks = generateStructure(draft);
      return { structure: { blocks } };
    } catch {
      return null;
    }
  }, [v2Validation, draft]);

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

  const showingStaleStructure =
    !v2Validation?.ok && displayStructure.blocks.length > 0;

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

  const normalizedJson = useMemo(() => {
    if (!v2Validation?.ok || !v2Validation.normalized) return null;
    return blueprintToDebugJson(v2Validation.normalized);
  }, [v2Validation]);

  const planSummary = useMemo(() => {
    if (!v2Validation?.ok || !v2Validation.normalized) return null;
    try {
      return summarizeComponentPlanV2(v2Validation.normalized);
    } catch {
      return null;
    }
  }, [v2Validation]);

  function loadPreset(presetId: string) {
    setSelectedPresetId(presetId);
    const next = cloneV2PresetBlueprint(presetId);
    setDraft(next);
    const room = findRootRoom(next);
    setSelectedComponentId(room?.id ?? null);
    setLayerViewMode("full");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      {!editorPanelOpen ? (
        <>
          <div className="shrink-0 border-b border-zinc-800/90 bg-zinc-950/98 lg:hidden">
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-sm font-medium text-emerald-200/95 hover:bg-zinc-900/80"
              onClick={() => setEditorPanelOpen(true)}
            >
              Show v2 editor
            </button>
          </div>
          <div className="hidden h-full w-10 shrink-0 flex-col border-zinc-800/90 bg-zinc-950/98 lg:flex lg:border-r">
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center px-0 py-4 text-emerald-200/95 hover:bg-zinc-900/80"
              title="Show v2 editor"
              aria-label="Show v2 editor"
              onClick={() => setEditorPanelOpen(true)}
            >
              <span className="text-xl leading-none text-zinc-400" aria-hidden>
                ›
              </span>
            </button>
          </div>
        </>
      ) : null}

      {editorPanelOpen ? (
        <aside className="flex max-h-[50vh] min-h-0 shrink-0 flex-row overflow-hidden border-b border-zinc-800/90 lg:h-full lg:max-h-none lg:w-[min(100%,36rem)] lg:border-b-0 lg:border-r">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Generic v2 component lab
                </h1>
                <p className="mt-1 max-w-prose text-xs text-zinc-500">
                  Edit component-authored{" "}
                  <code className="text-zinc-400">GenericBuildingBlueprint</code>{" "}
                  schema v2 — validate, generate, and inspect in 3D.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 lg:hidden"
                onClick={() => setEditorPanelOpen(false)}
              >
                Hide editor
              </button>
            </div>

            <div className="mt-4 space-y-3 border-b border-zinc-800/80 pb-4">
              <label className="block text-xs text-zinc-400">
                V2 preset
                <select
                  className={SELECT_CLASS}
                  value={selectedPresetId}
                  onChange={(e) => loadPreset(e.target.value)}
                >
                  {GENERIC_LAB_V2_PRESET_OPTIONS.map((p) => (
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

            <section className="mt-4 space-y-2 border-b border-zinc-800/80 pb-4">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Blueprint materials
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {MATERIAL_SLOTS.map(([slot, label]) => (
                  <label key={slot} className="block text-xs text-zinc-400">
                    {label}
                    <select
                      className={SELECT_CLASS}
                      value={draft.materials[slot]}
                      onChange={(e) =>
                        setDraft((d) =>
                          setRootMaterial(
                            d,
                            slot,
                            e.target.value as ClassicMaterialKey,
                          ),
                        )
                      }
                    >
                      {CLASSIC_MATERIAL_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <ComponentTreePanel
              draft={draft}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
            />

            <ComponentInspectorPanel
              draft={draft}
              selectedComponentId={selectedComponentId}
              onDraftChange={setDraft}
            />

            {v2Validation ? (
              <ValidationPanel
                errors={v2Validation.errors}
                warnings={v2Validation.warnings}
                notes={v2Validation.notes}
              />
            ) : null}

            <DebugPanel
              authoringJson={blueprintToDebugJson(draft)}
              normalizedJson={normalizedJson}
              planSummary={planSummary}
              blockCount={hasStructure ? displayStructure.blocks.length : null}
            />
          </div>
        </aside>
      ) : null}

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <main className="relative h-full min-h-[min(52vh,26rem)] min-w-0 flex-1 bg-zinc-900 lg:min-h-0">
          {showingStaleStructure ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-2">
              <p className="rounded-md border border-amber-500/40 bg-amber-950/80 px-3 py-1.5 text-xs text-amber-100/95 shadow-lg backdrop-blur-sm">
                Invalid draft — showing last valid structure
              </p>
            </div>
          ) : null}
          {!hasStructure && !v2Validation?.ok ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-500">
              Fix validation errors to generate a structure.
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
