"use client";

import { useEffect, useMemo, useState } from "react";
import type { MedievalTowerBlueprint } from "@/src/lib/blueprints/types";
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

const PRESET_INSPECTION_OPTIONS = MEDIEVAL_TOWER_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
}));

/**
 * Read-only inspection for `/preview` — medieval presets or static partial-block
 * showcase; same layer tools as the visualizer lab, without blueprint editing.
 */
export function PreviewInspectionClient() {
  const [previewSource, setPreviewSource] =
    useState<PreviewLabSource>("preset_towers");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
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

  const blueprint = useMemo((): MedievalTowerBlueprint => {
    const preset = getMedievalTowerPreset(selectedPresetId);
    if (!preset) {
      const fallback = getMedievalTowerPreset(DEFAULT_MEDIEVAL_PRESET_ID);
      return structuredClone(
        fallback!.blueprint,
      ) as MedievalTowerBlueprint;
    }
    return structuredClone(preset.blueprint) as MedievalTowerBlueprint;
  }, [selectedPresetId]);

  const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);

  const generatedStructure: VoxelStructure = useMemo(() => {
    if (!validation.ok || !validation.resolved) {
      return { blocks: [] };
    }
    return {
      blocks: generateStructureFromResolved(validation.resolved),
    };
  }, [validation]);

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
    const preset = getMedievalTowerPreset(id);
    if (!preset) return;
    setSelectedPresetId(id);
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

  const panelDescription =
    previewSource === "partial_showcase"
      ? "Developer inspection: static slabs, panes, and posts using classic textures only — not medieval preset output. Layer modes filter the canvas; breakdown reflects this showcase."
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
        previewSource={previewSource}
        onPreviewSourceChange={handlePreviewSourceChange}
        presetOptions={PRESET_INSPECTION_OPTIONS}
        selectedPresetId={selectedPresetId}
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
