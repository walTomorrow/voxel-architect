/**
 * Product-supported building families (generator grammars).
 * Presets are curated blueprint snapshots in `sampleGenericBuildingBlueprints.ts`.
 */

export const BUILDING_FAMILY_IDS = ["generic_building"] as const;

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
