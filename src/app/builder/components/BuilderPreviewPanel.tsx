"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
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
import type { VoxelStructure } from "@/src/lib/voxel/types";
import {
  validationIssueReactKey,
  type BuilderValidationIssueView,
} from "@/src/lib/builder/builderToolTypes";

type Props = {
  readonly presetId: string;
  readonly generatedStructure: VoxelStructure | null;
  readonly validationWarnings?: readonly BuilderValidationIssueView[];
  readonly previewGenerationNonce?: number;
};

type PreviewViewportProps = {
  readonly hasStructure: boolean;
  readonly displayStructure: VoxelStructure | null;
  readonly visibleStructure: VoxelStructure;
  readonly cameraResetNonce: number;
  readonly error: string | null;
  readonly layerViewMode: LayerViewMode;
  readonly onLayerViewModeChange: (mode: LayerViewMode) => void;
  readonly layerExtents: { readonly yMin: number; readonly yMax: number } | null;
  readonly effectiveLayer: number;
  readonly onSelectedLayerChange: (y: number) => void;
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly onRefitCamera: () => void;
  readonly showExpand?: boolean;
  readonly onExpand?: () => void;
  readonly previewBadge: string;
};

function PreviewViewport({
  hasStructure,
  displayStructure,
  visibleStructure,
  error,
  layerViewMode,
  onLayerViewModeChange,
  layerExtents,
  effectiveLayer,
  onSelectedLayerChange,
  visibleCount,
  totalCount,
  onRefitCamera,
  cameraResetNonce,
  showExpand,
  onExpand,
  previewBadge,
}: PreviewViewportProps) {
  return (
    <div className="relative min-h-0 flex-1">
      {hasStructure && displayStructure ? (
        <VoxelViewer
          className="absolute inset-0 h-full w-full"
          structure={visibleStructure}
          boundsStructure={displayStructure}
          cameraResetNonce={cameraResetNonce}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-zinc-500">
          {error ?? "Preview unavailable"}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2">
        {showExpand && onExpand ? (
          <button
            type="button"
            className="pointer-events-auto rounded-lg border border-zinc-600/80 bg-zinc-950/90 px-2.5 py-1 text-[10px] font-medium text-zinc-200 shadow-lg backdrop-blur-sm transition hover:border-zinc-500 hover:bg-zinc-900"
            onClick={onExpand}
            aria-label="Expand building preview"
          >
            Expand
          </button>
        ) : (
          <span />
        )}
        <span className="rounded-full border border-zinc-600/50 bg-zinc-950/85 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400 backdrop-blur-sm">
          {previewBadge}
        </span>
      </div>

      {hasStructure ? (
        <div className="absolute inset-x-3 bottom-3 z-10">
          <BuilderPreviewLayerBar
            hasStructure={hasStructure}
            layerViewMode={layerViewMode}
            onLayerViewModeChange={onLayerViewModeChange}
            layerExtents={layerExtents}
            selectedLayer={effectiveLayer}
            onSelectedLayerChange={onSelectedLayerChange}
            visibleCount={visibleCount}
            totalCount={totalCount}
            onRefitCamera={onRefitCamera}
          />
        </div>
      ) : null}
    </div>
  );
}

export function BuilderPreviewPanel({
  presetId,
  generatedStructure,
  validationWarnings = [],
  previewGenerationNonce = 0,
}: Props) {
  const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const closeExpanded = useCallback(() => setIsExpanded(false), []);

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isExpanded, closeExpanded]);

  const previewBadge =
    generatedStructure != null && generatedStructure.blocks.length > 0
      ? "Generated preview"
      : "Default preset";

  const generated = useMemo(() => {
    if (
      generatedStructure != null &&
      generatedStructure.blocks.length > 0
    ) {
      return { displayStructure: generatedStructure, error: null };
    }
    try {
      const blueprint = clonePresetBlueprintV2(presetId);
      const validation = validateBlueprint(blueprint);
      if (!validation.ok) {
        const err =
          "errors" in validation && validation.errors[0]
            ? typeof validation.errors[0] === "string"
              ? validation.errors[0]
              : validation.errors[0].message
            : "Blueprint validation failed";
        return {
          displayStructure: null,
          error: err,
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
  }, [presetId, generatedStructure]);

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

  const refitCamera = useCallback(() => setCameraResetNonce((n) => n + 1), []);

  const effectiveCameraNonce = cameraResetNonce + previewGenerationNonce;

  const viewportProps: PreviewViewportProps = {
    hasStructure,
    displayStructure: generated.displayStructure,
    visibleStructure,
    cameraResetNonce: effectiveCameraNonce,
    error: generated.error,
    layerViewMode,
    onLayerViewModeChange: setLayerViewMode,
    layerExtents,
    effectiveLayer,
    onSelectedLayerChange: setSelectedLayer,
    visibleCount: visibleStructure.blocks.length,
    totalCount,
    onRefitCamera: refitCamera,
    previewBadge,
  };

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-zinc-950">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <PreviewViewport
            {...viewportProps}
            showExpand={hasStructure}
            onExpand={() => setIsExpanded(true)}
          />
        </div>

        {validationWarnings.length > 0 ? (
          <div className="shrink-0 border-t border-amber-900/40 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200/90">
            {validationWarnings.map((issue, index) => (
              <p key={validationIssueReactKey(issue, index)}>{issue.message}</p>
            ))}
          </div>
        ) : null}

        <BuilderPreviewBreakdown
          breakdown={fullStructureBreakdown}
          totalCount={totalCount}
        />
      </div>

      {isExpanded ? (
        <div
          className="fixed inset-0 z-50 bg-black/75 p-2 backdrop-blur-[2px] sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Building preview expanded"
          onClick={closeExpanded}
        >
          <div
            className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/90 px-4 py-2.5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Building preview</h3>
                <p className="text-[11px] text-zinc-500">
                  Click outside, Close, or Esc to exit
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
                onClick={closeExpanded}
              >
                Close
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <VoxelViewer
                className="absolute inset-0 h-full w-full"
                structure={visibleStructure}
                boundsStructure={generated.displayStructure!}
                cameraResetNonce={effectiveCameraNonce}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end p-3">
                <span className="rounded-full border border-zinc-600/50 bg-zinc-950/85 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400 backdrop-blur-sm">
                  {previewBadge}
                </span>
              </div>
              <div className="absolute inset-x-4 bottom-4 z-10">
                <BuilderPreviewLayerBar
                  hasStructure={hasStructure}
                  layerViewMode={layerViewMode}
                  onLayerViewModeChange={setLayerViewMode}
                  layerExtents={layerExtents}
                  selectedLayer={effectiveLayer}
                  onSelectedLayerChange={setSelectedLayer}
                  visibleCount={visibleStructure.blocks.length}
                  totalCount={totalCount}
                  onRefitCamera={refitCamera}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
