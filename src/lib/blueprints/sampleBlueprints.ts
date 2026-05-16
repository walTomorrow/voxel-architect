import type { BuildingStyleId } from "@/src/lib/generation/styles/buildingStyles";
import type { MedievalTowerBlueprint } from "./types";

/** Stable id + UI label + frozen authoring snapshot (always `structuredClone` before mutating in UI). */
export interface MedievalTowerPreset {
  readonly id: string;
  readonly label: string;
  /** Reusable style vocabulary (see `BUILDING_STYLES`; not part of blueprint schema). */
  readonly styleId: BuildingStyleId;
  readonly blueprint: MedievalTowerBlueprint;
}

/**
 * Default inspectable medieval tower for demos and `/visualizer`.
 * Same object as the `northwatch` entry in `MEDIEVAL_TOWER_PRESETS` (clone before edit).
 */
export const SAMPLE_MEDIEVAL_TOWER_BLUEPRINT: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Northwatch Spire (sample)",
    description:
      "Deterministic medieval tower from blueprint parameters — no AI involved.",
    notes:
      "Default lab preset; balanced scale and stepped roof with crenellations. Duplicate in sampleBlueprints.ts to fork.",
  },
  dimensions: {
    width: 9,
    length: 9,
    height: 24,
  },
  materials: {
    wall: "cobblestone",
    floor: "limestone_bricks",
    roof: "slate_tiles",
    window: "glass",
    door: "oak_planks",
    accent: "limestone",
  },
  massing: {
    footprint: "square",
    verticalEmphasis: "medium",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: {
    floorCount: 6,
    includeInteriorFloors: true,
  },
  openings: {
    entranceSide: "front",
    entranceStyle: "arched",
    entranceWidth: 3,
    entranceHeight: 4,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 2,
  },
  roof: {
    style: "stepped_pyramid",
    height: 4,
    overhang: 1,
  },
  features: {
    crenellations: true,
    cornerPillars: true,
  },
  constraints: {
    maxBlockCount: 120_000,
    allowFloatingBlocks: false,
    enforceSymmetry: true,
    requireGroundedStructure: true,
  },
};

const TALL_WATCHTOWER_BLUEPRINT = {
  structureType: "medieval_tower",
  metadata: {
    name: "Tall Watchtower",
    description:
      "Narrow footprint and high vertical budget — stresses silhouette, stepped cap, and crown alignment.",
    notes:
      "Odd 9×9 footprint so a 3-wide entrance stays bilaterally balanced (even widths cannot center an odd door span). T=1 thin shell.",
  },
  dimensions: { width: 9, length: 9, height: 48 },
  materials: {
    wall: "cobblestone",
    floor: "limestone_bricks",
    roof: "slate_tiles",
    window: "glass",
    door: "oak_planks",
    accent: "mudstone",
  },
  massing: {
    footprint: "square",
    verticalEmphasis: "tall",
    symmetry: "bilateral",
    wallThickness: 1,
    hollowInterior: true,
  },
  levels: { floorCount: 22, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "simple",
    entranceWidth: 3,
    entranceHeight: 12,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 2,
  },
  roof: { style: "stepped_pyramid", height: 6, overhang: 1 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    maxBlockCount: 220_000,
    allowFloatingBlocks: false,
    enforceSymmetry: true,
    requireGroundedStructure: true,
  },
} as const satisfies MedievalTowerBlueprint;

const FORTIFIED_GATE_TOWER_BLUEPRINT = {
  structureType: "medieval_tower",
  metadata: {
    name: "Fortified Gate Tower",
    description:
      "Wide footprint, thick walls, and a broad entrance — gatehouse-like mass without a dedicated generator.",
    notes: "Flat roof variant tests flat cap path; symmetric windows on all body bands.",
  },
  dimensions: { width: 13, length: 13, height: 28 },
  materials: {
    wall: "mossy_cobblestone",
    floor: "limestone_bricks",
    roof: "slate_tiles",
    window: "glass",
    door: "oak_planks",
    accent: "limestone",
  },
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
    entranceWidth: 5,
    entranceHeight: 8,
    windowsStyle: "small",
    windowsPlacement: "symmetric",
    windowsFloors: "all",
    windowsCountPerSide: 2,
  },
  roof: { style: "flat", height: 1, overhang: 0 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    maxBlockCount: 280_000,
    allowFloatingBlocks: false,
    enforceSymmetry: true,
    requireGroundedStructure: true,
  },
} as const satisfies MedievalTowerBlueprint;

const GOTHIC_STONE_TOWER_BLUEPRINT = {
  structureType: "medieval_tower",
  metadata: {
    name: "Gothic Stone Tower",
    description:
      "Pale limestone massing with tall emphasis, arched windows, and a stepped slate crown.",
    notes:
      "Odd 11×11 footprint pairs with 3-wide entrance (even width cannot split façade evenly around an odd portal). Arched windows + stepped crown.",
  },
  dimensions: { width: 11, length: 11, height: 32 },
  materials: {
    wall: "limestone_bricks",
    floor: "limestone_bricks",
    roof: "slate_tiles",
    window: "glass",
    door: "oak_planks",
    accent: "limestone",
  },
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
    entranceStyle: "arched",
    entranceWidth: 3,
    entranceHeight: 6,
    windowsStyle: "arched",
    windowsPlacement: "symmetric",
    windowsFloors: "upper",
    windowsCountPerSide: 2,
  },
  roof: { style: "stepped_pyramid", height: 6, overhang: 1 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    maxBlockCount: 200_000,
    allowFloatingBlocks: false,
    enforceSymmetry: true,
    requireGroundedStructure: true,
  },
} as const satisfies MedievalTowerBlueprint;

const COMPACT_GUARD_TOWER_BLUEPRINT = {
  structureType: "medieval_tower",
  metadata: {
    name: "Compact Guard Tower",
    description:
      "Minimum practical footprint — border post with a narrow door and light windows.",
    notes: "Validator edge: hollow void on 5×5 with T=1; entrance width capped at 1 for span.",
  },
  dimensions: { width: 5, length: 5, height: 14 },
  materials: {
    wall: "cobblestone",
    floor: "gravel",
    roof: "slate",
    window: "glass",
    door: "oak_planks",
    accent: "andesite",
  },
  massing: {
    footprint: "square",
    verticalEmphasis: "low",
    symmetry: "bilateral",
    wallThickness: 1,
    hollowInterior: true,
  },
  levels: { floorCount: 6, includeInteriorFloors: false },
  openings: {
    entranceSide: "front",
    entranceStyle: "simple",
    entranceWidth: 1,
    entranceHeight: 3,
    windowsStyle: "small",
    windowsPlacement: "front_only",
    windowsFloors: "upper",
    windowsCountPerSide: 1,
  },
  roof: { style: "stepped_pyramid", height: 2, overhang: 0 },
  features: { crenellations: true, cornerPillars: false },
  constraints: {
    maxBlockCount: 50_000,
    allowFloatingBlocks: false,
    enforceSymmetry: true,
    requireGroundedStructure: true,
  },
} as const satisfies MedievalTowerBlueprint;

const DARK_WIZARD_TOWER_BLUEPRINT = {
  structureType: "medieval_tower",
  metadata: {
    name: "Dark Wizard Tower",
    description:
      "Obsidian shell and dense arched windows — moody palette using only classic-pack keys.",
    notes: "Higher window count per side; stepped cap + crenellations for crown regression checks.",
  },
  dimensions: { width: 9, length: 9, height: 40 },
  materials: {
    wall: "obsidian",
    floor: "schist",
    roof: "slate",
    window: "glass",
    door: "oak_planks",
    accent: "schist",
  },
  massing: {
    footprint: "square",
    verticalEmphasis: "tall",
    symmetry: "bilateral",
    wallThickness: 2,
    hollowInterior: true,
  },
  levels: { floorCount: 15, includeInteriorFloors: true },
  openings: {
    entranceSide: "front",
    entranceStyle: "arched",
    entranceWidth: 3,
    entranceHeight: 10,
    windowsStyle: "arched",
    windowsPlacement: "symmetric",
    windowsFloors: "all",
    windowsCountPerSide: 4,
  },
  roof: { style: "stepped_pyramid", height: 5, overhang: 1 },
  features: { crenellations: true, cornerPillars: true },
  constraints: {
    maxBlockCount: 200_000,
    allowFloatingBlocks: false,
    enforceSymmetry: true,
    requireGroundedStructure: true,
  },
} as const satisfies MedievalTowerBlueprint;

/** Curated hand-authored towers for the developer lab (order = selector order). */
export const MEDIEVAL_TOWER_PRESETS: readonly MedievalTowerPreset[] = [
  {
    id: "northwatch",
    label: "Northwatch Spire (default)",
    styleId: "rustic_stone_watchtower",
    blueprint: SAMPLE_MEDIEVAL_TOWER_BLUEPRINT,
  },
  {
    id: "tall_watchtower",
    label: "Tall Watchtower",
    styleId: "tall_military_watchtower",
    blueprint: TALL_WATCHTOWER_BLUEPRINT,
  },
  {
    id: "fortified_gate",
    label: "Fortified Gate Tower",
    styleId: "fortified_gatehouse",
    blueprint: FORTIFIED_GATE_TOWER_BLUEPRINT,
  },
  {
    id: "gothic_stone",
    label: "Gothic Stone Tower",
    styleId: "gothic_stone",
    blueprint: GOTHIC_STONE_TOWER_BLUEPRINT,
  },
  {
    id: "compact_guard",
    label: "Compact Guard Tower",
    styleId: "compact_guard_post",
    blueprint: COMPACT_GUARD_TOWER_BLUEPRINT,
  },
  {
    id: "dark_wizard",
    label: "Dark Wizard Tower",
    styleId: "dark_wizard",
    blueprint: DARK_WIZARD_TOWER_BLUEPRINT,
  },
];

export const DEFAULT_MEDIEVAL_PRESET_ID = "northwatch" as const;

export function getMedievalTowerPreset(
  id: string,
): MedievalTowerPreset | undefined {
  return MEDIEVAL_TOWER_PRESETS.find((p) => p.id === id);
}
