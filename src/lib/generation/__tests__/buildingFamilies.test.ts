import { describe, expect, test } from "vitest";

import {
  BUILDING_FAMILY_IDS,
  BUILDING_FAMILIES,
  getAllBuildingFamilies,
  getBuildingFamily,
} from "@/src/lib/generation/families/buildingFamilies";

describe("building family catalog", () => {
  test("BUILDING_FAMILIES includes generic_building only", () => {
    expect(Object.keys(BUILDING_FAMILIES).sort()).toEqual(
      [...BUILDING_FAMILY_IDS].sort(),
    );
    expect(BUILDING_FAMILY_IDS).toEqual(["generic_building"]);
  });

  test("getBuildingFamily returns definition for shipped family", () => {
    expect(getBuildingFamily("generic_building")?.status).toBe("shipped");
    expect(getBuildingFamily("medieval_tower")).toBeUndefined();
    expect(getBuildingFamily("blacksmith_workshop")).toBeUndefined();
    expect(getBuildingFamily("cottage")).toBeUndefined();
  });

  test("getAllBuildingFamilies returns the shipped family", () => {
    expect(getAllBuildingFamilies()).toHaveLength(1);
  });
});
