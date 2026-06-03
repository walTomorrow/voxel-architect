"use client";

import { useMemo, useState } from "react";
import { clonePresetBlueprint } from "@/src/app/generic-lab/genericLabUtils";
import { BuilderPreviewBreakdown } from "@/src/app/builder/components/BuilderPreviewBreakdown";
import { BuilderPreviewLayerBar } from "@/src/app/builder/components/BuilderPreviewLayerBar";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { fullStructureBlockBreakdown } from "@/src/lib/voxel/blockBreakdown";
import {
  type LayerViewMode,
  clampLayerY,
  computeLayerYExtents,
  filterBlocksForLayerView,
} from "@/src/lib/voxel/layerView";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";

type Props = {
  readonly presetId: string;
};

export function BuilderPreviewPanel({ presetId }: Props) {
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);

  const generated = useMemo(() => {
    try {
      const blueprint = clonePresetBlueprint(presetId);
      const validation = validateBlueprint(blueprint);
      if (!validation.ok) {
        return {
          displayStructure: null,
          error: validation.errors[0] ?? "Blueprint validation failed",
        };
      }
      const blocks = generateStructure(blueprint);
      return { displayStructure: { blocks }, error: null };
    } catch (e) {
      return {
        displayStructure: null,
        error: e instanceof Error ? e.message : "Generation failed",
      };
    }
  }, [presetId]);

  const hasStructure =
    generated.displayStructure != null && generated.displayStructure.blocks.length > 0;

  const layerExtents = useMemo(
    () =>
      hasStructure
        ? computeLayerYExtents(generated.displayStructure!.blocks)
        : null,
    [generated.displayStructure, hasStructure],
  );

  const effectiveLayer = useMemo(() => {
    if (!layerExtents) return selectedLayer;
    return clampLayerY(selectedLayer, layerExtents);
  }, [selectedLayer, layerExtents]);

  const visibleStructure = useMemo(() => {
    if (!hasStructure || !generated.displayStructure) return { blocks: [] };
    if (layerViewMode === "full") return generated.displayStructure;
    return {
      blocks: filterBlocksForLayerView(
        generated.displayStructure.blocks,
        layerViewMode,
        effectiveLayer,
      ),
    };
  }, [generated.displayStructure, hasStructure, layerViewMode, effectiveLayer]);

  const fullStructureBreakdown = useMemo(() => {
    if (!hasStructure || !generated.displayStructure) return null;
    return fullStructureBlockBreakdown(generated.displayStructure.blocks);
  }, [generated.displayStructure, hasStructure]);

  const totalCount = generated.displayStructure?.blocks.length ?? 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-zinc-950">
      <div className="relative min-h-0 flex-1">
        {hasStructure ? (
          <VoxelViewer
            className="absolute inset-0 h-full w-full"
            structure={visibleStructure}
            boundsStructure={generated.displayStructure!}
            cameraResetNonce={cameraResetNonce}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-zinc-500">
            {generated.error ?? "Preview unavailable"}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end p-2">
          <span className="rounded-full border border-amber-500/30 bg-zinc-950/85 px-2.5 py-0.5 text-[10px] font-medium text-amber-200/90 backdrop-blur-sm">
            Demo — AI not connected
          </span>
        </div>

        {hasStructure ? (
          <div className="absolute inset-x-3 bottom-3 z-10">
            <BuilderPreviewLayerBar
              hasStructure={hasStructure}
              layerViewMode={layerViewMode}
              onLayerViewModeChange={setLayerViewMode}
              layerExtents={layerExtents}
              selectedLayer={effectiveLayer}
              onSelectedLayerChange={setSelectedLayer}
              visibleCount={visibleStructure.blocks.length}
              totalCount={totalCount}
              onRefitCamera={() => setCameraResetNonce((n) => n + 1)}
            />
          </div>
        ) : null}
      </div>

      <BuilderPreviewBreakdown
        breakdown={fullStructureBreakdown}
        totalCount={totalCount}
      />
    </div>
  );
}
