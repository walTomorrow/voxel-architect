import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";

/** Authoring-time material slot: classic pack local id (e.g. `cobblestone`). */
export type ClassicMaterialKey = string;

export type StructureType = "generic_building";

export interface BlueprintMetadata {
  readonly name: string;
  readonly description?: string;
  readonly notes?: string;
}

export interface BlueprintMaterials {
  readonly wall: ClassicMaterialKey;
  readonly floor: ClassicMaterialKey;
  readonly roof: ClassicMaterialKey;
  readonly window: ClassicMaterialKey;
  readonly door: ClassicMaterialKey;
  readonly accent: ClassicMaterialKey;
}

export type EntranceSide = "front" | "back" | "left" | "right";

export interface BlueprintConstraints {
  readonly maxBlockCount: number;
  readonly allowFloatingBlocks: boolean;
  readonly enforceSymmetry: boolean;
  readonly requireGroundedStructure: boolean;
}

export type GenericRoofKind = "pitched_gable" | "shed" | "none";
export type GenericWindowMode =
  | "none"
  | "front_only"
  | "front_and_sides"
  | "all_sides";
export type GenericWindowHeightBand = "auto" | "mid" | "upper";

export interface GenericBuildingBody {
  readonly width: number;
  readonly depth: number;
  /** Wall layers above foundation (excludes roof). */
  readonly height: number;
  readonly wallThickness: number;
  readonly hollowInterior: boolean;
}

export interface GenericBuildingRoof {
  readonly kind: GenericRoofKind;
  readonly layers?: number;
  readonly overhang?: number;
}

export interface GenericBuildingEntrance {
  readonly side: EntranceSide;
  readonly width: number;
  readonly height: number;
}

export interface GenericBuildingWindows {
  readonly mode: GenericWindowMode;
  readonly count: number;
  readonly heightBand?: GenericWindowHeightBand;
}

export interface GenericBuildingOpenings {
  readonly entrance: GenericBuildingEntrance;
  readonly windows: GenericBuildingWindows;
}

export interface GenericBuildingChimney {
  readonly enabled: boolean;
  readonly side: "left" | "right";
}

export interface GenericBuildingFrontStep {
  readonly enabled: boolean;
}

export interface GenericBuildingFeatures {
  readonly chimney?: GenericBuildingChimney;
  readonly frontStep?: GenericBuildingFrontStep;
}

/**
 * Authoring blueprint for the component-based low-rise generator.
 * Run through `validateBlueprint()` before `generateStructure()`.
 */
export interface GenericBuildingBlueprint {
  readonly structureType: "generic_building";
  readonly schemaVersion: 1;
  readonly metadata: BlueprintMetadata;
  readonly body: GenericBuildingBody;
  readonly roof: GenericBuildingRoof;
  readonly openings: GenericBuildingOpenings;
  readonly features: GenericBuildingFeatures;
  readonly materials: BlueprintMaterials;
  readonly constraints: BlueprintConstraints;
}

/** Authoring input accepted by `validateBlueprint()`. */
export type StructureBlueprint = GenericBuildingBlueprint;

/** Fully validated / normalized input for procedural generators (registry ids). */
export type ResolvedStructure = ResolvedGenericBuilding;

export interface ResolvedGenericBuilding {
  readonly structureType: "generic_building";
  readonly metadata: BlueprintMetadata;
  readonly materials: {
    readonly wall: BlockTypeId;
    readonly floor: BlockTypeId;
    readonly roof: BlockTypeId;
    readonly window: BlockTypeId;
    readonly door: BlockTypeId;
    readonly accent: BlockTypeId;
  };
  readonly body: {
    readonly width: number;
    readonly depth: number;
    readonly height: number;
    readonly wallThickness: number;
    readonly hollowInterior: boolean;
  };
  readonly roof: {
    readonly kind: GenericRoofKind;
    readonly layers: number;
    readonly overhang: number;
  };
  readonly openings: {
    readonly entrance: GenericBuildingEntrance;
    readonly windows: GenericBuildingWindows;
  };
  readonly features: {
    readonly chimney: { readonly enabled: boolean; readonly side: "left" | "right" };
    readonly frontStep: { readonly enabled: boolean };
  };
  readonly constraints: BlueprintConstraints;
  readonly grid: {
    readonly width: number;
    readonly depth: number;
    readonly bodyLayers: number;
    readonly roofLayers: number;
    readonly overhang: number;
  };
}
