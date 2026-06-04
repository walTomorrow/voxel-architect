import {
  DEFAULT_GENERIC_V2_PRESET_ID,
  getGenericBuildingPresetV2,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";

export function clonePresetBlueprintV2(presetId: string): GenericBuildingBlueprintV2 {
  const preset = getGenericBuildingPresetV2(presetId);
  const resolved = preset ?? getGenericBuildingPresetV2(DEFAULT_GENERIC_V2_PRESET_ID);
  if (!resolved) {
    throw new Error("No generic building v2 presets available.");
  }
  return structuredClone(resolved.blueprint) as GenericBuildingBlueprintV2;
}
