import { describe, expect, test } from "vitest";

import {
  BUILDING_FAMILY_IDS,
  BUILDING_FAMILIES,
  getAllBuildingFamilies,
  getBuildingFamily,
} from "@/src/lib/generation/families/buildingFamilies";

describe("building family catalog", () => {
  test("BUILDING_FAMILIES includes medieval_tower and blacksmith_workshop", () => {
    expect(Object.keys(BUILDING_FAMILIES).sort()).toEqual(
      [...BUILDING_FAMILY_IDS].sort(),
    );
    expect(BUILDING_FAMILY_IDS).toHaveLength(2);
  });

  test("getBuildingFamily returns definitions for shipped families", () => {
    expect(getBuildingFamily("medieval_tower")?.status).toBe("shipped");
    expect(getBuildingFamily("blacksmith_workshop")?.status).toBe("shipped");
    expect(getBuildingFamily("cottage")).toBeUndefined();
  });

  test("getAllBuildingFamilies returns both families", () => {
    expect(getAllBuildingFamilies()).toHaveLength(2);
  });
});
