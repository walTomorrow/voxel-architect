import { describe, expect, test } from "vitest";

import {
  BUILDING_FAMILY_IDS,
  BUILDING_FAMILIES,
  getAllBuildingFamilies,
  getBuildingFamily,
} from "@/src/lib/generation/families/buildingFamilies";

describe("building family catalog", () => {
  test("BUILDING_FAMILIES includes only medieval_tower", () => {
    expect(Object.keys(BUILDING_FAMILIES).sort()).toEqual(
      [...BUILDING_FAMILY_IDS].sort(),
    );
    expect(BUILDING_FAMILY_IDS).toHaveLength(1);
  });

  test("getBuildingFamily returns definition for shipped tower family", () => {
    expect(getBuildingFamily("medieval_tower")?.status).toBe("shipped");
    expect(getBuildingFamily("blacksmith_workshop")).toBeUndefined();
    expect(getBuildingFamily("cottage")).toBeUndefined();
  });

  test("getAllBuildingFamilies returns the single shipped family", () => {
    expect(getAllBuildingFamilies()).toHaveLength(1);
  });
});
