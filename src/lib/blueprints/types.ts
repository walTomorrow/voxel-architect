import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";

/** Authoring-time material slot: classic pack local id (e.g. `cobblestone`). */
export type ClassicMaterialKey = string;

export type StructureType = "medieval_tower";

export interface BlueprintMetadata {
  readonly name: string;
  readonly description?: string;
  readonly notes?: string;
}

export interface BlueprintDimensions {
  /** Footprint X extent in voxels (≥ 5). */
  readonly width: number;
  /** Footprint Z extent in voxels (≥ 5). Square footprint forces length = width. */
  readonly length: number;
  /** Nominal vertical budget in voxels: foundation + body + roof must fit (≥ 8). */
  readonly height: number;
}

export interface BlueprintMaterials {
  readonly wall: ClassicMaterialKey;
  readonly floor: ClassicMaterialKey;
  readonly roof: ClassicMaterialKey;
  readonly window: ClassicMaterialKey;
  readonly door: ClassicMaterialKey;
  readonly accent: ClassicMaterialKey;
}

export type FootprintShape = "square";
export type VerticalEmphasis = "low" | "medium" | "tall";
export type SymmetryMode = "none" | "bilateral" | "radial";

export interface BlueprintMassing {
  readonly footprint: FootprintShape;
  readonly verticalEmphasis: VerticalEmphasis;
  readonly symmetry: SymmetryMode;
  /** Shell thickness in voxels (≥ 1). */
  readonly wallThickness: number;
  readonly hollowInterior: boolean;
}

export interface BlueprintLevels {
  /** Number of above-ground wall stories (each 1 voxel tall for this generator). */
  readonly floorCount: number;
  readonly includeInteriorFloors: boolean;
}

export type EntranceSide = "front" | "back" | "left" | "right";
export type EntranceStyle = "simple" | "arched";
export type WindowStyle = "small" | "narrow" | "arched";
export type WindowPlacement = "none" | "front_only" | "symmetric";
export type WindowFloors = "none" | "upper" | "all";

export interface BlueprintOpenings {
  readonly entranceSide: EntranceSide;
  readonly entranceStyle: EntranceStyle;
  readonly entranceWidth: number;
  readonly entranceHeight: number;
  readonly windowsStyle: WindowStyle;
  readonly windowsPlacement: WindowPlacement;
  readonly windowsFloors: WindowFloors;
  /** Target openings per eligible wall edge (deterministic spacing). */
  readonly windowsCountPerSide: number;
}

export type RoofStyle = "flat" | "stepped_pyramid";

export interface BlueprintRoof {
  readonly style: RoofStyle;
  /** Roof vertical layers (flat uses 1 solid cap layer). */
  readonly height: number;
  /** Eave extension in voxels (0–2 recommended; larger values may be clamped). */
  readonly overhang: number;
}

export interface BlueprintFeatures {
  readonly crenellations: boolean;
  readonly cornerPillars: boolean;
}

export interface BlueprintConstraints {
  readonly maxBlockCount: number;
  readonly allowFloatingBlocks: boolean;
  readonly enforceSymmetry: boolean;
  readonly requireGroundedStructure: boolean;
}

/**
 * Authoring blueprint: semantic materials and high-level parameters.
 * Run through `validateBlueprint()` before `generateStructure()`.
 */
export interface MedievalTowerBlueprint {
  readonly structureType: "medieval_tower";
  readonly metadata: BlueprintMetadata;
  readonly dimensions: BlueprintDimensions;
  readonly materials: BlueprintMaterials;
  readonly massing: BlueprintMassing;
  readonly levels: BlueprintLevels;
  readonly openings: BlueprintOpenings;
  readonly roof: BlueprintRoof;
  readonly features: BlueprintFeatures;
  readonly constraints: BlueprintConstraints;
}

export type StructureBlueprint = MedievalTowerBlueprint;

/** Fully validated / normalized input for procedural generators (registry ids). */
export interface ResolvedMedievalTower {
  readonly structureType: "medieval_tower";
  readonly metadata: BlueprintMetadata;
  readonly materials: {
    readonly wall: BlockTypeId;
    readonly floor: BlockTypeId;
    readonly roof: BlockTypeId;
    readonly window: BlockTypeId;
    readonly door: BlockTypeId;
    readonly accent: BlockTypeId;
  };
  readonly massing: BlueprintMassing;
  readonly levels: BlueprintLevels;
  readonly openings: BlueprintOpenings;
  readonly roof: BlueprintRoof;
  readonly features: BlueprintFeatures;
  readonly constraints: BlueprintConstraints;
  /** Integer grid after validation (square footprint: width === depth). */
  readonly grid: {
    readonly width: number;
    readonly depth: number;
    readonly bodyLayers: number;
    readonly roofLayers: number;
    readonly overhang: number;
  };
}

export type ResolvedStructure = ResolvedMedievalTower;
