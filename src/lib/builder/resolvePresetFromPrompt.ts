import { DEFAULT_GENERIC_V2_PRESET_ID } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";

export type V2PresetId =
  | "simple_cabin_v2"
  | "stone_workshop_v2"
  | "porch_house_v2";

const PRESET_IDS: readonly V2PresetId[] = [
  "simple_cabin_v2",
  "stone_workshop_v2",
  "porch_house_v2",
];

/**
 * Deterministic server mapping — not model output.
 */
export function resolvePresetFromPrompt(prompt: string): V2PresetId {
  const lower = prompt.toLowerCase();

  if (/\b(workshop|forge|smith|shed roof)\b/.test(lower)) {
    return "stone_workshop_v2";
  }
  if (/\b(porch|veranda|deck)\b/.test(lower)) {
    return "porch_house_v2";
  }
  if (/\b(cottage|cabin|rustic|cozy|small house|stone house)\b/.test(lower)) {
    return "simple_cabin_v2";
  }

  return DEFAULT_GENERIC_V2_PRESET_ID as V2PresetId;
}

export function isV2PresetId(id: string): id is V2PresetId {
  return (PRESET_IDS as readonly string[]).includes(id);
}
