import type { ClassicMaterialKey } from "@/src/lib/blueprints/types";
import type { BlueprintMetadata, BlueprintConstraints } from "@/src/lib/blueprints/types";

export type TowerFootprintShape = "square" | "octagonal" | "circular_approx";
export type TowerCrownStyle = "flat_cap" | "dark_cap" | "stepped" | "inset";
export type TowerWindowTreatment = "glass_block" | "glass_pane" | "open";

export type LandmarkTowerMaterials = {
  readonly wall: ClassicMaterialKey;
  readonly cap: ClassicMaterialKey;
  readonly accent: ClassicMaterialKey;
  readonly base: ClassicMaterialKey;
  readonly window: ClassicMaterialKey;
};

export type LandmarkTowerParams = {
  readonly footprintWidth: number;
  readonly footprintDepth: number;
  readonly footprintShape: TowerFootprintShape;
  readonly shaftHeight: number;
  readonly basePad: number;
  readonly baseHeight: number;
  readonly crownHeight: number;
  readonly crownStyle: TowerCrownStyle;
  readonly windowRows: number;
  readonly windowsPerRow: number;
  readonly windowTreatment: TowerWindowTreatment;
  readonly entrance: boolean;
};

export interface LandmarkTowerBlueprint {
  readonly structureType: "landmark_tower";
  readonly schemaVersion: 1;
  readonly metadata: BlueprintMetadata;
  readonly materials: LandmarkTowerMaterials;
  readonly constraints: BlueprintConstraints;
  readonly tower: LandmarkTowerParams;
}

export function isLandmarkTowerBlueprint(
  blueprint: { readonly structureType?: string },
): blueprint is LandmarkTowerBlueprint {
  return blueprint.structureType === "landmark_tower";
}
