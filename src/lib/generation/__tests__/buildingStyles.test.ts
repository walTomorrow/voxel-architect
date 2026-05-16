import { describe, expect, test } from "vitest";

import { MEDIEVAL_TOWER_PRESETS } from "@/src/lib/blueprints/sampleBlueprints";
import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import {
  BUILDING_STYLE_IDS,
  BUILDING_STYLES,
  getAllBuildingStyles,
  getBuildingStyle,
  stylesForFamily,
} from "@/src/lib/generation/styles/buildingStyles";

function isClassicKey(k: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLASSIC_BLOCK_PACK, k);
}

describe("building style catalog", () => {
  test("BUILDING_STYLES has exactly the six approved style IDs", () => {
    expect(Object.keys(BUILDING_STYLES).sort()).toEqual(
      [...BUILDING_STYLE_IDS].sort(),
    );
    expect(BUILDING_STYLE_IDS).toHaveLength(6);
  });

  test("style IDs are unique", () => {
    const ids = getAllBuildingStyles().map((s) => s.styleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("getBuildingStyle returns a style for each approved ID", () => {
    for (const id of BUILDING_STYLE_IDS) {
      expect(getBuildingStyle(id)?.styleId).toBe(id);
    }
  });

  test("getBuildingStyle returns undefined for unknown ID", () => {
    expect(getBuildingStyle("not_a_real_style")).toBeUndefined();
    expect(getBuildingStyle("northwatch")).toBeUndefined();
  });

  test('stylesForFamily("medieval_tower") returns all six styles', () => {
    const styles = stylesForFamily("medieval_tower");
    expect(styles).toHaveLength(6);
    expect(styles.map((s) => s.styleId).sort()).toEqual(
      [...BUILDING_STYLE_IDS].sort(),
    );
  });

  test("each style includes medieval_tower in applicableFamilies", () => {
    for (const style of getAllBuildingStyles()) {
      expect(style.applicableFamilies).toContain("medieval_tower");
    }
  });

  test("each style defaultPalette key resolves in CLASSIC_BLOCK_PACK", () => {
    for (const style of getAllBuildingStyles()) {
      const palette = style.defaultPalette;
      for (const slot of [
        "wall",
        "floor",
        "roof",
        "window",
        "door",
        "accent",
      ] as const) {
        expect(
          isClassicKey(palette[slot]),
          `${style.styleId}.${slot}=${palette[slot]}`,
        ).toBe(true);
      }
    }
  });

  test("each curated preset has styleId referencing a defined style", () => {
    for (const preset of MEDIEVAL_TOWER_PRESETS) {
      expect(getBuildingStyle(preset.styleId)?.styleId).toBe(preset.styleId);
    }
  });
});
