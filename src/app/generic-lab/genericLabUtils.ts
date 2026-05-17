import {
  DEFAULT_GENERIC_PRESET_ID,
  GENERIC_BUILDING_PRESETS,
  getGenericBuildingPreset,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import type { GenericBuildingBlueprint } from "@/src/lib/blueprints/types";
import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";

export const CLASSIC_MATERIAL_KEYS = Object.keys(CLASSIC_BLOCK_PACK).sort((a, b) =>
  a.localeCompare(b),
);

export const GENERIC_LAB_PRESET_OPTIONS = GENERIC_BUILDING_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
}));

export const MAX_BLOCK_COUNT_MIN = 1_000;
export const MAX_BLOCK_COUNT_MAX = 500_000;

export function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export function clonePresetBlueprint(presetId: string): GenericBuildingBlueprint {
  const preset = getGenericBuildingPreset(presetId);
  if (!preset) {
    const fallback = getGenericBuildingPreset(DEFAULT_GENERIC_PRESET_ID);
    if (!fallback) {
      throw new Error("No generic building presets available.");
    }
    return structuredClone(fallback.blueprint) as GenericBuildingBlueprint;
  }
  return structuredClone(preset.blueprint) as GenericBuildingBlueprint;
}

export function blueprintToDebugJson(blueprint: GenericBuildingBlueprint): string {
  return JSON.stringify(blueprint, null, 2);
}
