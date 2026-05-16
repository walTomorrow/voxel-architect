import type { BlacksmithWorkshopBlueprint } from "@/src/lib/blueprints/types";

export interface BlacksmithEdgeCaseFixture {
  readonly id: string;
  readonly label: string;
  readonly blueprint: BlacksmithWorkshopBlueprint;
}

const BASE_MATERIALS = {
  wall: "cobblestone",
  floor: "limestone_bricks",
  roof: "slate_tiles",
  window: "glass",
  door: "oak_planks",
  accent: "limestone",
} as const;

const BASE_FEATURES = {
  chimney: { enabled: true, side: "right" as const },
  forge: { enabled: true },
  workbench: { enabled: true },
  storage: { enabled: true },
};

const MIN_FOOTPRINT: BlacksmithWorkshopBlueprint = {
  structureType: "blacksmith_workshop",
  metadata: {
    name: "Edge: min footprint",
    description: "7×5 minimum width/depth with T=1 hollow interior.",
  },
  dimensions: { width: 7, depth: 5, height: 5 },
  materials: { ...BASE_MATERIALS },
  massing: { wallThickness: 1, hollowInterior: true },
  roof: { style: "pitched_gable", height: 1, overhang: 0 },
  openings: {
    entranceSide: "front",
    entranceWidth: 1,
    entranceHeight: 2,
    windowsStyle: "small",
    windowsPlacement: "front_only",
    windowsCount: 1,
  },
  features: BASE_FEATURES,
  constraints: {
    maxBlockCount: 40_000,
    allowFloatingBlocks: false,
    requireGroundedStructure: true,
  },
} as const satisfies BlacksmithWorkshopBlueprint;

const NON_SQUARE_FOOTPRINT: BlacksmithWorkshopBlueprint = {
  structureType: "blacksmith_workshop",
  metadata: {
    name: "Edge: non-square footprint",
    description: "15×11 rectangular workshop within allowed ranges.",
  },
  dimensions: { width: 15, depth: 11, height: 8 },
  materials: { ...BASE_MATERIALS },
  massing: { wallThickness: 2, hollowInterior: true },
  roof: { style: "pitched_gable", height: 2, overhang: 1 },
  openings: {
    entranceSide: "front",
    entranceWidth: 3,
    entranceHeight: 4,
    windowsStyle: "small",
    windowsPlacement: "front_and_sides",
    windowsCount: 3,
  },
  features: BASE_FEATURES,
  constraints: {
    maxBlockCount: 200_000,
    allowFloatingBlocks: false,
    requireGroundedStructure: true,
  },
} as const satisfies BlacksmithWorkshopBlueprint;

const TIGHT_MAX_BLOCK_COUNT: BlacksmithWorkshopBlueprint = {
  structureType: "blacksmith_workshop",
  metadata: {
    name: "Edge: tight maxBlockCount",
    description: "Small mass with low budget — validator may reduce roof layers.",
  },
  dimensions: { width: 8, depth: 6, height: 5 },
  materials: { ...BASE_MATERIALS },
  massing: { wallThickness: 1, hollowInterior: true },
  roof: { style: "pitched_gable", height: 3, overhang: 0 },
  openings: {
    entranceSide: "front",
    entranceWidth: 2,
    entranceHeight: 2,
    windowsStyle: "small",
    windowsPlacement: "front_only",
    windowsCount: 1,
  },
  features: {
    chimney: { enabled: true, side: "left" },
    forge: { enabled: true },
    workbench: { enabled: false },
    storage: { enabled: false },
  },
  constraints: {
    maxBlockCount: 350,
    allowFloatingBlocks: false,
    requireGroundedStructure: true,
  },
} as const satisfies BlacksmithWorkshopBlueprint;

export const BLACKSMITH_EDGE_CASE_FIXTURES: readonly BlacksmithEdgeCaseFixture[] =
  [
    { id: "min_footprint", label: "Min footprint", blueprint: MIN_FOOTPRINT },
    {
      id: "non_square_footprint",
      label: "Non-square footprint",
      blueprint: NON_SQUARE_FOOTPRINT,
    },
    {
      id: "tight_max_block_count",
      label: "Tight maxBlockCount",
      blueprint: TIGHT_MAX_BLOCK_COUNT,
    },
  ];
