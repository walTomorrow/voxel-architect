import type { MedievalTowerBlueprint } from "@/src/lib/blueprints/types";

/** Test fixture: stable id + label + authoring blueprint (not a curated preset). */
export interface EdgeCaseBlueprintFixture {
  readonly id: string;
  readonly label: string;
  readonly blueprint: MedievalTowerBlueprint;
}

const BASE_MATERIALS = {
  wall: "cobblestone",
  floor: "limestone_bricks",
  roof: "slate_tiles",
  window: "glass",
  door: "oak_planks",
  accent: "limestone",
} as const satisfies MedievalTowerBlueprint["materials"];

const BASE_CONSTRAINTS = {
  allowFloatingBlocks: false,
  enforceSymmetry: true,
  requireGroundedStructure: true,
} as const;

/**
 * Tight dimensions.height forces validator to clamp body layers so foundation +
 * body + roof fits (see validateBlueprint height slack).
 */
const HEIGHT_BUDGET_BODY_CLAMP: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Edge: height body clamp",
    description:
      "Minimal height budget (8) with tall emphasis and multi-layer stepped roof — validator clamps body layers.",
    notes: "entranceHeight capped at final bodyLayers after clamp.",
  },
  dimensions: { width: 9, length: 9, height: 8 },
  materials: { ...BASE_MATERIALS },
  massing: {
    footprint: "square",
    verticalEmphasis: "tall",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: { floorCount: 12, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "simple",
    entranceWidth: 3,
    entranceHeight: 3,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 1,
  },
  roof: { style: "stepped_pyramid", height: 4, overhang: 0 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    ...BASE_CONSTRAINTS,
    maxBlockCount: 80_000,
  },
} as const satisfies MedievalTowerBlueprint;

/** entranceWidth at max(1, W − 2T − 2) for an 11×11 shell with T=2. */
const WIDE_ENTRANCE_MAX: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Edge: widest legal door",
    description:
      "11×11 footprint with wallThickness 2 and entranceWidth 5 (= max formula).",
    notes: "Curated gothic_stone is 11×11 but uses a narrower door.",
  },
  dimensions: { width: 11, length: 11, height: 28 },
  materials: { ...BASE_MATERIALS },
  massing: {
    footprint: "square",
    verticalEmphasis: "medium",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: { floorCount: 8, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "arched",
    entranceWidth: 5,
    entranceHeight: 6,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 2,
  },
  roof: { style: "stepped_pyramid", height: 3, overhang: 1 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    ...BASE_CONSTRAINTS,
    maxBlockCount: 200_000,
  },
} as const satisfies MedievalTowerBlueprint;

/** Authoring overhang > 2 is clamped to 2 with a validator note. */
const AUTHORING_OVERHANG_CLAMP: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Edge: overhang clamp",
    description: "roof.overhang 5 in authoring; validator clamps to 2.",
  },
  dimensions: { width: 7, length: 7, height: 22 },
  materials: { ...BASE_MATERIALS },
  massing: {
    footprint: "square",
    verticalEmphasis: "medium",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: { floorCount: 6, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "simple",
    entranceWidth: 1,
    entranceHeight: 4,
    windowsStyle: "narrow",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 1,
  },
  roof: { style: "stepped_pyramid", height: 3, overhang: 5 },
  features: { crenellations: false, cornerPillars: true },
  constraints: {
    ...BASE_CONSTRAINTS,
    maxBlockCount: 100_000,
  },
} as const satisfies MedievalTowerBlueprint;

/** Thick shell (T=3) on 9×9 leaves a 3×3 interior void. */
const THICK_SHELL_NARROW_VOID: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Edge: thick walls 9×9",
    description: "wallThickness 3 on minimum-class wide-enough hollow footprint.",
    notes: "Distinct from curated presets (northwatch T=2; fortified 13×13).",
  },
  dimensions: { width: 9, length: 9, height: 26 },
  materials: { ...BASE_MATERIALS },
  massing: {
    footprint: "square",
    verticalEmphasis: "medium",
    symmetry: "bilateral",
    wallThickness: 3,
    hollowInterior: true,
  },
  levels: { floorCount: 10, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "arched",
    entranceWidth: 1,
    entranceHeight: 5,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 1,
  },
  roof: { style: "stepped_pyramid", height: 4, overhang: 1 },
  features: { crenellations: true, cornerPillars: false },
  constraints: {
    ...BASE_CONSTRAINTS,
    maxBlockCount: 150_000,
  },
} as const satisfies MedievalTowerBlueprint;

/** Many windows per side on a wider footprint — not the same params as dark_wizard. */
const WINDOW_DENSITY_WIDE: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Edge: window density",
    description:
      "13×13 symmetric tower with windows on all floors and high windowsCountPerSide.",
  },
  dimensions: { width: 13, length: 13, height: 32 },
  materials: { ...BASE_MATERIALS },
  massing: {
    footprint: "square",
    verticalEmphasis: "medium",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: { floorCount: 10, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "arched",
    entranceWidth: 3,
    entranceHeight: 6,
    windowsStyle: "arched",
    windowsPlacement: "symmetric",
    windowsFloors: "all",
    windowsCountPerSide: 6,
  },
  roof: { style: "stepped_pyramid", height: 4, overhang: 1 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    ...BASE_CONSTRAINTS,
    maxBlockCount: 350_000,
  },
} as const satisfies MedievalTowerBlueprint;

/**
 * Validator tightens maxBlockCount by reducing roof layers when estimate is high.
 * maxBlockCount chosen so one or more reductions occur but validation still passes.
 */
const TIGHT_MAX_BLOCK_COUNT_ROOF_TRIM: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Edge: tight maxBlockCount",
    description:
      "Large stepped roof author height with a maxBlockCount that forces validator roof-layer reduction.",
  },
  dimensions: { width: 9, length: 9, height: 36 },
  materials: { ...BASE_MATERIALS },
  massing: {
    footprint: "square",
    verticalEmphasis: "tall",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: { floorCount: 18, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "arched",
    entranceWidth: 3,
    entranceHeight: 10,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 2,
  },
  roof: { style: "stepped_pyramid", height: 10, overhang: 2 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    ...BASE_CONSTRAINTS,
    maxBlockCount: 18_000,
  },
} as const satisfies MedievalTowerBlueprint;

export const EDGE_CASE_BLUEPRINT_FIXTURES: readonly EdgeCaseBlueprintFixture[] =
  [
    {
      id: "height_budget_body_clamp",
      label: "Height budget / body-layer clamp",
      blueprint: HEIGHT_BUDGET_BODY_CLAMP,
    },
    {
      id: "wide_entrance_max",
      label: "Widest legal entrance (11×11, T=2)",
      blueprint: WIDE_ENTRANCE_MAX,
    },
    {
      id: "authoring_overhang_clamp",
      label: "Authoring roof overhang clamp",
      blueprint: AUTHORING_OVERHANG_CLAMP,
    },
    {
      id: "thick_shell_narrow_void",
      label: "Thick shell, narrow interior void",
      blueprint: THICK_SHELL_NARROW_VOID,
    },
    {
      id: "window_density_wide",
      label: "High window density (wide footprint)",
      blueprint: WINDOW_DENSITY_WIDE,
    },
    {
      id: "tight_max_block_count_roof_trim",
      label: "Tight maxBlockCount (roof trim in validator)",
      blueprint: TIGHT_MAX_BLOCK_COUNT_ROOF_TRIM,
    },
  ];
