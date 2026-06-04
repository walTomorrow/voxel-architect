import { describe, expect, it } from "vitest";
import { generateBuildingPreview } from "@/src/lib/builder/generateBuildingPreview";
import { GENERIC_BUILDING_V2_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";

describe("generateBuildingPreview", () => {
  it("rejects modify_current with a clear message", () => {
    const result = generateBuildingPreview({
      prompt: "widen the porch",
      mode: "modify_current",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not available yet/i);
  });

  for (const preset of GENERIC_BUILDING_V2_PRESETS) {
    it(`generates blocks for preset ${preset.id} via cottage prompt`, () => {
      const prompt =
        preset.id === "stone_workshop_v2"
          ? "build a workshop"
          : preset.id === "porch_house_v2"
            ? "make a porch house"
            : "make a cottage";
      const result = generateBuildingPreview({
        prompt,
        mode: "create_from_prompt",
      });
      expect(result.ok).toBe(true);
      expect(result.presetId).toBe(preset.id);
      expect(result.blockCount).toBeGreaterThan(0);
      expect(result.blocks?.length).toBe(result.blockCount);
      expect(result.schemaVersion).toBe(2);
      expect(result.toolKind).toBe("generate");
    });
  }
});
