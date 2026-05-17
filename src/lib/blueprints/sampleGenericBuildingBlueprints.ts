import type { GenericBuildingBlueprint } from "./types";

export interface GenericBuildingPreset {
  readonly id: string;
  readonly label: string;
  readonly blueprint: GenericBuildingBlueprint;
}

export const DEFAULT_GENERIC_PRESET_ID = "simple_rustic_cabin" as const;

const SIMPLE_RUSTIC_CABIN: GenericBuildingBlueprint = {
  structureType: "generic_building",
  schemaVersion: 1,
  metadata: {
    name: "Simple rustic cabin",
    description:
      "Component-pipeline low-rise cabin with gable roof, chimney, and front step.",
  },
  body: {
    width: 9,
    depth: 7,
    height: 5,
    wallThickness: 1,
    hollowInterior: true,
  },
  roof: {
    kind: "pitched_gable",
    layers: 2,
    overhang: 0,
  },
  openings: {
    entrance: { side: "front", width: 2, height: 2 },
    windows: { mode: "front_only", count: 2, heightBand: "auto" },
  },
  features: {
    chimney: { enabled: true, side: "right" },
    frontStep: { enabled: true },
  },
  materials: {
    wall: "cobblestone",
    floor: "oak_planks",
    roof: "oak_planks",
    window: "glass",
    door: "oak_planks",
    accent: "limestone",
  },
  constraints: {
    maxBlockCount: 80_000,
    allowFloatingBlocks: false,
    enforceSymmetry: false,
    requireGroundedStructure: true,
  },
};

const SHED_ROOF_WORKSHOP: GenericBuildingBlueprint = {
  structureType: "generic_building",
  schemaVersion: 1,
  metadata: {
    name: "Shed-roof workshop",
    description: "Wide shallow workshop with shed roof and side windows.",
  },
  body: {
    width: 11,
    depth: 9,
    height: 4,
    wallThickness: 1,
    hollowInterior: true,
  },
  roof: {
    kind: "shed",
    layers: 2,
    overhang: 1,
  },
  openings: {
    entrance: { side: "front", width: 3, height: 2 },
    windows: { mode: "front_and_sides", count: 4, heightBand: "mid" },
  },
  features: {
    chimney: { enabled: false, side: "right" },
    frontStep: { enabled: false },
  },
  materials: {
    wall: "limestone_bricks",
    floor: "cobblestone",
    roof: "slate_tiles",
    window: "glass",
    door: "oak_planks",
    accent: "limestone_bricks",
  },
  constraints: {
    maxBlockCount: 80_000,
    allowFloatingBlocks: false,
    enforceSymmetry: false,
    requireGroundedStructure: true,
  },
};

export const GENERIC_BUILDING_PRESETS: readonly GenericBuildingPreset[] = [
  {
    id: "simple_rustic_cabin",
    label: "Simple rustic cabin",
    blueprint: SIMPLE_RUSTIC_CABIN,
  },
  {
    id: "shed_roof_workshop",
    label: "Shed-roof workshop",
    blueprint: SHED_ROOF_WORKSHOP,
  },
];

export function getGenericBuildingPreset(
  id: string,
): GenericBuildingPreset | undefined {
  return GENERIC_BUILDING_PRESETS.find((p) => p.id === id);
}
