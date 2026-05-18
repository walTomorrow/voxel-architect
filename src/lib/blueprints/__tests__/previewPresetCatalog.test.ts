import { describe, expect, it } from "vitest";
import {
  PREVIEW_PRESET_OPTIONS_V1,
  PREVIEW_PRESET_OPTIONS_V2,
  defaultPresetIdForSource,
  isPresetIdValidForSource,
  previewPresetOptionsForSource,
} from "@/src/lib/blueprints/previewPresetCatalog";

describe("previewPresetCatalog", () => {
  it("lists all v1 and v2 generic presets for preview", () => {
    expect(PREVIEW_PRESET_OPTIONS_V1.length).toBeGreaterThan(0);
    expect(PREVIEW_PRESET_OPTIONS_V2).toHaveLength(3);
    expect(PREVIEW_PRESET_OPTIONS_V2.map((p) => p.id)).toEqual([
      "simple_cabin_v2",
      "stone_workshop_v2",
      "porch_house_v2",
    ]);
    for (const opt of PREVIEW_PRESET_OPTIONS_V2) {
      expect(opt.label).toMatch(/\(v2\)/i);
      expect(opt.schemaVersion).toBe(2);
    }
  });

  it("maps preview sources to preset option lists", () => {
    expect(previewPresetOptionsForSource("preset_generic_v1").length).toBe(
      PREVIEW_PRESET_OPTIONS_V1.length,
    );
    expect(previewPresetOptionsForSource("preset_generic_v2")).toEqual(
      PREVIEW_PRESET_OPTIONS_V2,
    );
    expect(previewPresetOptionsForSource("partial_showcase")).toEqual([]);
  });

  it("validates preset ids per source group", () => {
    expect(
      isPresetIdValidForSource("preset_generic_v1", "simple_rustic_cabin"),
    ).toBe(true);
    expect(
      isPresetIdValidForSource("preset_generic_v1", "simple_cabin_v2"),
    ).toBe(false);
    expect(
      isPresetIdValidForSource("preset_generic_v2", "porch_house_v2"),
    ).toBe(true);
    expect(defaultPresetIdForSource("preset_generic_v2")).toBe("simple_cabin_v2");
  });
});
