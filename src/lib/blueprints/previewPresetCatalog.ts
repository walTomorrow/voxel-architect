import {
  DEFAULT_GENERIC_PRESET_ID,
  GENERIC_BUILDING_PRESETS,
  getGenericBuildingPreset,
} from "./sampleGenericBuildingBlueprints";
import {
  DEFAULT_GENERIC_V2_PRESET_ID,
  GENERIC_BUILDING_V2_PRESETS,
  getGenericBuildingPresetV2,
} from "./sampleGenericBuildingBlueprintsV2";

export type PreviewLabSource =
  | "preset_generic_v1"
  | "preset_generic_v2"
  | "partial_showcase";

export type PreviewPresetOption = {
  readonly id: string;
  readonly label: string;
  readonly schemaVersion: 1 | 2 | null;
};

export const PREVIEW_PRESET_OPTIONS_V1: readonly PreviewPresetOption[] =
  GENERIC_BUILDING_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    schemaVersion: 1 as const,
  }));

export const PREVIEW_PRESET_OPTIONS_V2: readonly PreviewPresetOption[] =
  GENERIC_BUILDING_V2_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    schemaVersion: 2 as const,
  }));

export function previewPresetOptionsForSource(
  source: PreviewLabSource,
): readonly PreviewPresetOption[] {
  switch (source) {
    case "preset_generic_v1":
      return PREVIEW_PRESET_OPTIONS_V1;
    case "preset_generic_v2":
      return PREVIEW_PRESET_OPTIONS_V2;
    case "partial_showcase":
      return [];
  }
}

export function defaultPresetIdForSource(source: PreviewLabSource): string {
  switch (source) {
    case "preset_generic_v1":
      return DEFAULT_GENERIC_PRESET_ID;
    case "preset_generic_v2":
      return DEFAULT_GENERIC_V2_PRESET_ID;
    case "partial_showcase":
      return "";
  }
}

export function isPresetIdValidForSource(
  source: PreviewLabSource,
  presetId: string,
): boolean {
  switch (source) {
    case "preset_generic_v1":
      return getGenericBuildingPreset(presetId) !== undefined;
    case "preset_generic_v2":
      return getGenericBuildingPresetV2(presetId) !== undefined;
    case "partial_showcase":
      return false;
  }
}
