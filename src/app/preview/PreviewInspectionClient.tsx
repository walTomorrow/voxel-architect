"use client";

import { useEffect, useMemo, useState } from "react";
import type { StructureBlueprint } from "@/src/lib/blueprints/types";
import {
  DEFAULT_GENERIC_PRESET_ID,
  getGenericBuildingPreset,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import {
  DEFAULT_GENERIC_V2_PRESET_ID,
  getGenericBuildingPresetV2,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import {
  defaultPresetIdForSource,
  isPresetIdValidForSource,
  previewPresetOptionsForSource,
  type PreviewLabSource,
} from "@/src/lib/blueprints/previewPresetCatalog";
import { formatValidationFeedback } from "@/src/lib/blueprints/formatValidationFeedback";
import {
  validateBlueprint,
  type ValidateBlueprintResult,
} from "@/src/lib/blueprints/validateBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import {
  StructureInspectionPanel,
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

/**

 * Read-only inspection for `/preview` — generic v1/v2 presets or partial-block showcase.
 */
export function PreviewInspectionClient() {
  const [previewSource, setPreviewSource] =
    useState<PreviewLabSource>("preset_generic_v1");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
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

  const presetOptions: readonly StructureInspectionPresetOption[] = useMemo(
    () =>
      previewPresetOptionsForSource(previewSource).map((p) => ({
        id: p.id,
        label: p.label,
      })),
    [previewSource],
  );

  const blueprint = useMemo((): StructureBlueprint | null => {
    if (previewSource === "partial_showcase") return null;
    if (previewSource === "preset_generic_v1") {
      const preset =
        getGenericBuildingPreset(selectedPresetId) ??
        getGenericBuildingPreset(DEFAULT_GENERIC_PRESET_ID);
      return preset ? (structuredClone(preset.blueprint) as StructureBlueprint) : null;
    }
    const preset =
      getGenericBuildingPresetV2(selectedPresetId) ??
      getGenericBuildingPresetV2(DEFAULT_GENERIC_V2_PRESET_ID);
    return preset ? (structuredClone(preset.blueprint) as StructureBlueprint) : null;
  }, [previewSource, selectedPresetId]);

  const validation = useMemo((): ValidateBlueprintResult | null => {
    if (!blueprint) return null;
    return validateBlueprint(blueprint);
  }, [blueprint]);

  const validationFeedback = useMemo(() => {
    if (!validation) {
      return { errors: [] as string[], warnings: [] as string[], notes: [] as string[] };
    }
    return formatValidationFeedback(validation);
  }, [validation]);

  const { generatedBlocks, generationError } = useMemo(() => {
    if (previewSource === "partial_showcase" || !blueprint || !validation?.ok) {
      return { generatedBlocks: [] as const, generationError: undefined };
    }
    try {
      return {
        generatedBlocks: generateStructure(blueprint),
        generationError: undefined,
      };
    } catch (err) {
      return {
        generatedBlocks: [] as const,
        generationError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [previewSource, blueprint, validation]);

  const structure: VoxelStructure = useMemo(() => {
    if (previewSource === "partial_showcase") {
      return PARTIAL_BLOCK_SHOWCASE_STRUCTURE;
    }
    return { blocks: [...generatedBlocks] };
  }, [previewSource, generatedBlocks]);

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
    if (previewSource === "partial_showcase") return;
    if (!isPresetIdValidForSource(previewSource, id)) return;
    setSelectedPresetId(id);
    setLayerViewMode("full");
  };

  const handlePreviewSourceChange = (source: PreviewLabSource) => {
    setPreviewSource(source);
    setSelectedPresetId(defaultPresetIdForSource(source));
    setLayerViewMode("full");
  };

  const hasStructure = totalCount > 0;

  const sourceLabel =
    previewSource === "partial_showcase"
      ? "Partials"
      : previewSource === "preset_generic_v2"
        ? "Generic v2"
        : "Generic v1";

  const panelTitle =
    previewSource === "partial_showcase"
      ? "Partial block showcase"
      : `${sourceLabel} preset inspection`;

  const presetSchemaLabel =
    previewSource === "preset_generic_v2"
      ? "schemaVersion 2 · component-authored blueprint"
      : previewSource === "preset_generic_v1"
        ? "schemaVersion 1 · monolithic generic building"
        : undefined;

  const panelDescription = useMemo(() => {
    if (previewSource === "partial_showcase") {
      return "Developer inspection: static slabs, panes, and posts using classic textures only — not preset generator output. Layer modes filter the canvas; breakdown reflects this showcase.";
    }
    if (previewSource === "preset_generic_v2") {
      return "Hand-authored GenericBuildingBlueprint v2 (component pipeline). Validates, resolves, compiles, and generates voxels. Layer modes filter the canvas only; breakdown reflects the full generated structure.";
    }
    return "Hand-authored GenericBuildingBlueprint v1. Layer modes filter the canvas only; the block breakdown below always reflects the full generated structure.";
  }, [previewSource]);

  const validationNotes =
    previewSource !== "partial_showcase" &&
    validation?.ok &&
    validationFeedback.notes.length > 0
      ? validationFeedback.notes
      : undefined;

  const displayErrors = [
    ...validationFeedback.errors,
    ...(generationError ? [generationError] : []),
  ];

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
              Pick another preset from the inspection panel, or fix validation errors
              below.
            </p>
            {displayErrors.length > 0 ? (
              <ul className="mt-2 max-w-md space-y-1 text-left text-[11px] text-red-200/90">
                {displayErrors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      <StructureInspectionPanel
        title={panelTitle}
        panelDescription={panelDescription}
        validationNotes={validationNotes}
        validationWarnings={
          previewSource !== "partial_showcase" && validationFeedback.warnings.length > 0
            ? validationFeedback.warnings
            : undefined
        }
        validationErrors={
          previewSource !== "partial_showcase" && displayErrors.length > 0
            ? displayErrors
            : undefined
        }
        presetSchemaLabel={presetSchemaLabel}
        previewSource={previewSource}
        onPreviewSourceChange={handlePreviewSourceChange}
        presetOptions={presetOptions}
        selectedPresetId={selectedPresetId}
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
