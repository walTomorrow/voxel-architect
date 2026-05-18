"use client";

import { useMemo } from "react";
import {
  buildComponentTree,
  blueprintToDebugJson,
  cloneV2PresetBlueprint,
  summarizeComponentPlanV2,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";
import { CONCEPT_PRESET_ID } from "@/src/app/generic-lab-concepts/conceptWorkbenchModel";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { getGenericBuildingPresetV2 } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type { VoxelStructure } from "@/src/lib/voxel/types";

export function useConceptSample() {
  const preset = getGenericBuildingPresetV2(CONCEPT_PRESET_ID);
  const presetLabel = preset?.label ?? CONCEPT_PRESET_ID;

  const blueprint = useMemo(
    () => cloneV2PresetBlueprint(CONCEPT_PRESET_ID),
    [],
  ) as GenericBuildingBlueprintV2Draft;

  const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);
  const v2 = isBlueprintValidationResultV2(validation) ? validation : null;

  const structure: VoxelStructure = useMemo(() => {
    if (!v2?.ok) return { blocks: [] };
    try {
      return { blocks: generateStructure(blueprint) };
    } catch {
      return { blocks: [] };
    }
  }, [blueprint, v2]);

  const planSummary = useMemo(() => {
    if (!v2?.ok || !v2.normalized) return null;
    try {
      return summarizeComponentPlanV2(v2.normalized);
    } catch {
      return null;
    }
  }, [v2]);

  const tree = useMemo(() => buildComponentTree(blueprint), [blueprint]);

  const allIssues = useMemo(
    () =>
      v2 ? [...v2.errors, ...v2.warnings, ...v2.notes] : [],
    [v2],
  );

  const authoringJson = useMemo(() => blueprintToDebugJson(blueprint), [blueprint]);
  const normalizedJson = useMemo(() => {
    if (!v2?.ok || !v2.normalized) return null;
    return blueprintToDebugJson(v2.normalized);
  }, [v2]);

  const blockCount = structure.blocks.length;

  return {
    blueprint,
    v2,
    structure,
    planSummary,
    tree,
    allIssues,
    authoringJson,
    normalizedJson,
    blockCount,
    presetLabel,
  };
}

export type ConceptSample = ReturnType<typeof useConceptSample>;
