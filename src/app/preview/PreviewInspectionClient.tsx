"use client";

import { useEffect, useMemo, useState } from "react";
import type { StructureBlueprint } from "@/src/lib/blueprints/types";
import {
  DEFAULT_MEDIEVAL_PRESET_ID,
  MEDIEVAL_TOWER_PRESETS,
  getMedievalTowerPreset,
} from "@/src/lib/blueprints/sampleBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
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

const TOWER_PRESET_OPTIONS: readonly StructureInspectionPresetOption[] =
  MEDIEVAL_TOWER_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
  }));

/**
 * Read-only inspection for `/preview` — tower presets or static partial-block
 * showcase; no blueprint editing.
 */
export function PreviewInspectionClient() {
  const [previewSource, setPreviewSource] =
    useState<PreviewLabSource>("preset_towers");
  const [selectedTowerPresetId, setSelectedTowerPresetId] = useState<string>(
    DEFAULT_MEDIEVAL_PRESET_ID,
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
    if (previewSource !== "preset_towers") return null;
    const preset = getMedievalTowerPreset(selectedTowerPresetId);
    const fallback = getMedievalTowerPreset(DEFAULT_MEDIEVAL_PRESET_ID);
    return preset ?? fallback!;
  }, [previewSource, selectedTowerPresetId]);

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
    return validateBlueprint(blueprint);
  }, [blueprint]);

  const generatedStructure: VoxelStructure = useMemo(() => {
    if (previewSource === "partial_showcase" || !validation.ok || !validation.resolved) {
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

  useEffect(() => {
    if (!layerExtents) return;
    setSelectedLayer((y) => clampLayerY(y, layerExtents));
  }, [structure.blocks, layerExtents]);

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
        selectedLayer,
      ),
    };
  }, [structure, layerViewMode, selectedLayer]);

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
    if (previewSource !== "preset_towers") return;
    if (!getMedievalTowerPreset(id)) return;
    setSelectedTowerPresetId(id);
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
    return undefined;
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
        presetOptions={TOWER_PRESET_OPTIONS}
        selectedPresetId={selectedTowerPresetId}
        onPresetIdChange={handlePresetIdChange}
        hasStructure={hasStructure}
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
  );
}