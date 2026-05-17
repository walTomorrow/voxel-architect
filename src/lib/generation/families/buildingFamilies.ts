/**
 * Product-supported building families (generator grammars).
 * Styles live in `buildingStyles.ts`; presets are curated blueprint snapshots.
 */

export const BUILDING_FAMILY_IDS = ["medieval_tower", "generic_building"] as const;

export type BuildingFamilyId = (typeof BUILDING_FAMILY_IDS)[number];

export type BuildingFamilyStatus = "shipped" | "planned";

export interface BuildingFamilyDefinition {
  readonly familyId: BuildingFamilyId;
  readonly displayName: string;
  readonly description: string;
  readonly status: BuildingFamilyStatus;
}

export const BUILDING_FAMILIES: Record<
  BuildingFamilyId,
  BuildingFamilyDefinition
> = {
  medieval_tower: {
    familyId: "medieval_tower",
    displayName: "Medieval tower",
    description:
      "Vertical shell tower with roof crown, crenellations, and symmetric window columns.",
    status: "shipped",
  },
  generic_building: {
    familyId: "generic_building",
    displayName: "Generic building",
    description:
      "Low-rise rectangular building assembled from reusable exterior components.",
    status: "shipped",
  },
};

const ALL_FAMILIES = Object.values(BUILDING_FAMILIES);

export function getBuildingFamily(
  familyId: string,
): BuildingFamilyDefinition | undefined {
  if (!Object.prototype.hasOwnProperty.call(BUILDING_FAMILIES, familyId)) {
    return undefined;
  }
  return BUILDING_FAMILIES[familyId as BuildingFamilyId];
}

export function getAllBuildingFamilies(): readonly BuildingFamilyDefinition[] {
  return ALL_FAMILIES;
}
