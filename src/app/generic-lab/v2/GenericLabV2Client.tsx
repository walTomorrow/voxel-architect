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
import { SelectedComponentPreviewOverlay } from "@/src/app/generic-lab/v2/SelectedComponentPreviewOverlay";
import { ValidationDebugStrip } from "@/src/app/generic-lab/v2/ValidationDebugStrip";
import {
  GENERIC_LAB_V2_PRESET_OPTIONS,
  blueprintToDebugJson,
  cloneV2PresetBlueprint,
  findRootRoom,
  setRootMaterial,
  summarizeComponentPlanV2,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";

const SELECT_CLASS =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100";

const MATERIAL_SLOTS = [
  ["wall", "Wall"],
  ["floor", "Floor"],
  ["roof", "Roof"],
  ["window", "Window"],
  ["door", "Door"],
  ["accent", "Accent"],
] as const;

const LEFT_WIDTH = "w-full shrink-0 lg:w-[min(100%,19rem)] xl:w-[20rem]";
const RIGHT_WIDTH = "w-full shrink-0 lg:w-[min(100%,21rem)] xl:w-[22rem]";

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
  const [semanticMapOpen, setSemanticMapOpen] = useState(true);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);

  const validation = useMemo(() => validateBlueprint(draft), [draft]);

  const v2Validation = useMemo(() => {
    if (!isBlueprintValidationResultV2(validation)) return null;
    return validation;
  }, [validation]);

  const allIssues = useMemo(
    () =>
      v2Validation
        ? [...v2Validation.errors, ...v2Validation.warnings, ...v2Validation.notes]
        : [],
    [v2Validation],
  );

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-800/90 bg-zinc-950/98 px-3 py-2 lg:px-4">
        <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-[10px] text-zinc-500 sm:max-w-xs">
          <span className="shrink-0 uppercase tracking-wider">Preset</span>
          <select
            className={`${SELECT_CLASS} min-w-0 flex-1`}
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
          className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-200 hover:bg-zinc-700"
          onClick={() => loadPreset(selectedPresetId)}
        >
          Reload
        </button>
        <details className="text-[10px]">
          <summary className="cursor-pointer font-medium uppercase tracking-wider text-zinc-500">
            Blueprint materials
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {MATERIAL_SLOTS.map(([slot, label]) => (
              <label key={slot} className="min-w-[7rem] text-zinc-500">
                {label}
                <select
                  className={`${SELECT_CLASS} mt-0.5 block w-full py-1`}
                  value={draft.materials[slot]}
                  onChange={(e) =>
                    setDraft((d) =>
                      setRootMaterial(d, slot, e.target.value as ClassicMaterialKey),
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
        </details>
        <button
          type="button"
          className="ml-auto rounded-lg border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500 lg:hidden"
          onClick={() => setSemanticMapOpen((o) => !o)}
        >
          {semanticMapOpen ? "Hide map" : "Show map"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row lg:gap-3 lg:p-3">
        {semanticMapOpen ? (
          <aside
            className={`order-2 flex max-h-[min(38vh,16rem)] min-h-0 flex-col lg:order-1 lg:max-h-none ${LEFT_WIDTH}`}
          >
            <ComponentTreePanel
              draft={draft}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              allIssues={allIssues}
            />
          </aside>
        ) : (
          <button
            type="button"
            className="order-2 hidden w-7 shrink-0 rounded-lg border border-zinc-700 text-zinc-500 hover:bg-zinc-900 lg:order-1 lg:block"
            onClick={() => setSemanticMapOpen(true)}
            aria-label="Show semantic map"
          >
            ›
          </button>
        )}

        <main
          className={`relative order-1 min-h-[min(52vh,28rem)] min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-900/40 lg:order-2 lg:min-h-0`}
        >
          {showingStaleStructure ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-1.5">
              <p className="rounded-md border border-amber-500/40 bg-amber-950/85 px-2.5 py-1 text-[11px] text-amber-100/95 backdrop-blur-sm">
                Invalid draft — last valid structure
              </p>
            </div>
          ) : null}
          {!hasStructure && !v2Validation?.ok ? (
            <div className="flex h-full min-h-[10rem] items-center justify-center p-6 text-center text-sm text-zinc-500">
              Fix validation errors to generate a structure.
            </div>
          ) : null}
          {hasStructure ? (
            <VoxelViewer
              className="absolute inset-0 h-full w-full"
              structure={visibleStructure}
              boundsStructure={displayStructure}
              cameraResetNonce={cameraResetNonce}
            />
          ) : null}
          <SelectedComponentPreviewOverlay
            draft={draft}
            selectedComponentId={selectedComponentId}
          />
        </main>

        <aside
          className={`order-3 flex min-h-0 max-h-[min(42vh,20rem)] flex-col gap-2 lg:max-h-none ${RIGHT_WIDTH}`}
        >
          <div className="min-h-0 flex-1">
            <ComponentInspectorPanel
              draft={draft}
              selectedComponentId={selectedComponentId}
              onDraftChange={setDraft}
              allIssues={allIssues}
            />
          </div>
          <details className="shrink-0 rounded-xl border border-zinc-700/70 bg-zinc-900/55">
            <summary className="cursor-pointer px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Structure inspection
            </summary>
            <div className="max-h-[10rem] overflow-y-auto border-t border-zinc-700/60">
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
          </details>
        </aside>
      </div>

      {v2Validation ? (
        <div className="shrink-0 px-2 pb-2 lg:px-3 lg:pb-3">
          <ValidationDebugStrip
            errors={v2Validation.errors}
            warnings={v2Validation.warnings}
            notes={v2Validation.notes}
            authoringJson={blueprintToDebugJson(draft)}
            normalizedJson={normalizedJson}
            planSummary={planSummary}
            blockCount={hasStructure ? displayStructure.blocks.length : null}
          />
        </div>
      ) : null}
    </div>
  );
}
