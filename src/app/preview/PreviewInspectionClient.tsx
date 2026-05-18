"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GenericBuildingBlueprint,
  StructureBlueprint,
} from "@/src/lib/blueprints/types";
import {
  DEFAULT_GENERIC_PRESET_ID,
  GENERIC_BUILDING_PRESETS,
  getGenericBuildingPreset,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import {
  StructureInspectionPanel,
  type PreviewLabSource,
  type StructureInspectionPresetOption,
} from "@/src/components/voxel/StructureInspectionPanel";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";
import type { VoxelStructure } from "@/src/lib/voxel/types";
import { fullStructureBlockBreakdown } from "@/src/lib/voxel/blockBreakdown";
import {
  type LayerViewMode,
  clampLayerY,
  computeLayerYExtents,
  filterBlocksForLayerView,
} from "@/src/lib/voxel/layerView";
import { PARTIAL_BLOCK_SHOWCASE_STRUCTURE } from "@/src/lib/voxel/sampleStructure";
import { validateVoxelStructurePlacements } from "@/src/lib/voxel/voxelBlockPlacement";

const GENERIC_PRESET_OPTIONS: readonly StructureInspectionPresetOption[] =
  GENERIC_BUILDING_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
  }));

/**
 * Read-only inspection for `/preview` — generic presets or static partial-block showcase.
 */
export function PreviewInspectionClient() {
  const [previewSource, setPreviewSource] =
    useState<PreviewLabSource>("preset_generic");
  const [selectedGenericPresetId, setSelectedGenericPresetId] = useState<string>(
    DEFAULT_GENERIC_PRESET_ID,
  );
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const r = validateVoxelStructurePlacements(PARTIAL_BLOCK_SHOWCASE_STRUCTURE);
    if (!r.ok) {
      console.error(
        "[PreviewInspectionClient] PARTIAL_BLOCK_SHOWCASE_STRUCTURE invalid:",
        r.errors,
      );
    }
  }, []);

  const activePresetMeta = useMemo(() => {
    if (previewSource !== "preset_generic") return null;
    const preset = getGenericBuildingPreset(selectedGenericPresetId);
    const fallback = getGenericBuildingPreset(DEFAULT_GENERIC_PRESET_ID);
    return preset ?? fallback!;
  }, [previewSource, selectedGenericPresetId]);

  const blueprint = useMemo((): StructureBlueprint | null => {
    if (previewSource === "partial_showcase" || !activePresetMeta) {
      return null;
    }
    return structuredClone(activePresetMeta.blueprint) as StructureBlueprint;
  }, [previewSource, activePresetMeta]);

  const validation = useMemo(() => {
    if (!blueprint) {
      return { ok: false as const, errors: [] as string[], notes: [] as string[] };
    }
    return validateBlueprint(blueprint as GenericBuildingBlueprint);
  }, [blueprint]);

  const generatedStructure: VoxelStructure = useMemo(() => {
    if (
      previewSource === "partial_showcase" ||
      !validation.ok ||
      isBlueprintValidationResultV2(validation) ||
      !validation.resolved
    ) {
      return { blocks: [] };
    }
    return {
      blocks: generateStructureFromResolved(validation.resolved),
    };
  }, [previewSource, validation]);

  const structure: VoxelStructure = useMemo(() => {
    if (previewSource === "partial_showcase") {
      return PARTIAL_BLOCK_SHOWCASE_STRUCTURE;
    }
    return generatedStructure;
  }, [previewSource, generatedStructure]);

  const layerExtents = useMemo(
    () => computeLayerYExtents(structure.blocks),
    [structure.blocks],
  );

  const effectiveLayer = useMemo(() => {
    if (!layerExtents) return selectedLayer;
    return clampLayerY(selectedLayer, layerExtents);
  }, [selectedLayer, layerExtents]);

  const visibleStructure: VoxelStructure = useMemo(() => {
    if (structure.blocks.length === 0) {
      return { blocks: [] };
    }
    if (layerViewMode === "full") {
      return structure;
    }
    return {
      blocks: filterBlocksForLayerView(
        structure.blocks,
        layerViewMode,
        effectiveLayer,
      ),
    };
  }, [structure, layerViewMode, effectiveLayer]);

  const visibleCount = visibleStructure.blocks.length;
  const totalCount = structure.blocks.length;

  const fullStructureBreakdown = useMemo(() => {
    if (structure.blocks.length === 0) return null;
    return fullStructureBlockBreakdown(structure.blocks);
  }, [structure.blocks]);

  const handleLayerViewModeChange = (next: LayerViewMode) => {
    setLayerViewMode(next);
    if (next !== "full" && layerExtents) {
      setSelectedLayer(layerExtents.yMin);
    }
  };

  const handlePresetIdChange = (id: string) => {
    if (previewSource !== "preset_generic") return;
    if (!getGenericBuildingPreset(id)) return;
    setSelectedGenericPresetId(id);
    setLayerViewMode("full");
  };

  const handlePreviewSourceChange = (source: PreviewLabSource) => {
    setPreviewSource(source);
    setLayerViewMode("full");
  };

  const hasStructure = totalCount > 0;

  const panelTitle =
    previewSource === "partial_showcase"
      ? "Partial block showcase"
      : "Preset inspection";

  const panelDescription = useMemo(() => {
    if (previewSource === "partial_showcase") {
      return "Developer inspection: static slabs, panes, and posts using classic textures only — not preset generator output. Layer modes filter the canvas; breakdown reflects this showcase.";
    }
    return "Preset loads a hand-authored generic building (component pipeline). Layer modes filter the canvas only; the block breakdown below always reflects the full generated structure.";
  }, [previewSource]);

  const validationNotes =
    previewSource !== "partial_showcase" &&
    validation.ok &&
    validation.notes.length > 0
      ? validation.notes
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100 md:flex-row">
      <div className="relative min-h-[min(52vh,26rem)] flex-1 min-w-0 md:min-h-0">
        {hasStructure ? (
          <VoxelViewer
            className="h-full w-full"
            structure={visibleStructure}
            boundsStructure={structure}
            cameraResetNonce={cameraResetNonce}
          />
        ) : (
          <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Could not build this preset
            </p>
            <p className="max-w-sm text-xs text-zinc-500">
              Pick another preset from the inspection panel.
            </p>
          </div>
        )}
      </div>

      <StructureInspectionPanel
        title={panelTitle}
        panelDescription={panelDescription}
        validationNotes={validationNotes}
        previewSource={previewSource}
        onPreviewSourceChange={handlePreviewSourceChange}
        presetOptions={GENERIC_PRESET_OPTIONS}
        selectedPresetId={selectedGenericPresetId}
        onPresetIdChange={handlePresetIdChange}
        hasStructure={hasStructure}
        layerViewMode={layerViewMode}
        onLayerViewModeChange={handleLayerViewModeChange}
        layerExtents={layerExtents}
        selectedLayer={effectiveLayer}
        onSelectedLayerChange={setSelectedLayer}
        visibleCount={visibleCount}
        totalCount={totalCount}
        fullStructureBreakdown={fullStructureBreakdown}
        onRefitCamera={() => setCameraResetNonce((n) => n + 1)}
      />
    </div>
  );
}
