import type { BlacksmithWorkshopBlueprint } from "./types";

export interface BlacksmithWorkshopPreset {
  readonly id: string;
  readonly label: string;
  readonly blueprint: BlacksmithWorkshopBlueprint;
}

const RUSTIC_VILLAGE_FORGE_BLUEPRINT = {
  structureType: "blacksmith_workshop",
  metadata: {
    name: "Rustic Village Forge",
    description:
      "Wide stone-and-plank village smithy with chimney, rear forge hearth, and front workbench.",
    notes:
      "Non-square 11×7 footprint; pitched gable roof; pane windows when glass is used.",
  },
  dimensions: { width: 11, depth: 7, height: 6 },
  materials: {
    wall: "cobblestone",
    floor: "limestone_bricks",
    roof: "slate_tiles",
    window: "glass",
    door: "oak_planks",
    accent: "mudstone",
  },
  massing: { wallThickness: 2, hollowInterior: true },
  roof: { style: "pitched_gable", height: 2, overhang: 1 },
  openings: {
    entranceSide: "front",
    entranceWidth: 3,
    entranceHeight: 3,
    windowsStyle: "small",
    windowsPlacement: "front_and_sides",
    windowsCount: 2,
  },
  features: {
    chimney: { enabled: true, side: "right" },
    forge: { enabled: true },
    workbench: { enabled: true },
    storage: { enabled: true },
  },
  constraints: {
    maxBlockCount: 80_000,
    allowFloatingBlocks: false,
    requireGroundedStructure: true,
  },
} as const satisfies BlacksmithWorkshopBlueprint;

const DARK_IRONWORKS_BLUEPRINT = {
  structureType: "blacksmith_workshop",
  metadata: {
    name: "Dark Ironworks",
    description:
      "Compact obsidian-and-schist smithy with shed roof and dense accent chimney.",
    notes: "9×8 rectangular mass; forge uses accent material as heat placeholder (no furnace texture).",
  },
  dimensions: { width: 9, depth: 8, height: 7 },
  materials: {
    wall: "obsidian",
    floor: "schist",
    roof: "slate",
    window: "glass",
    door: "oak_planks",
    accent: "schist",
  },
  massing: { wallThickness: 1, hollowInterior: true },
  roof: { style: "shed", height: 2, overhang: 0 },
  openings: {
    entranceSide: "front",
    entranceWidth: 3,
    entranceHeight: 3,
    windowsStyle: "small",
    windowsPlacement: "front_only",
    windowsCount: 2,
  },
  features: {
    chimney: { enabled: true, side: "left" },
    forge: { enabled: true },
    workbench: { enabled: true },
    storage: { enabled: false },
  },
  constraints: {
    maxBlockCount: 60_000,
    allowFloatingBlocks: false,
    requireGroundedStructure: true,
  },
} as const satisfies BlacksmithWorkshopBlueprint;

export const BLACKSMITH_PRESETS: readonly BlacksmithWorkshopPreset[] = [
  {
    id: "rustic_village_forge",
    label: "Rustic Village Forge",
    blueprint: RUSTIC_VILLAGE_FORGE_BLUEPRINT,
  },
  {
    id: "dark_ironworks",
    label: "Dark Ironworks",
    blueprint: DARK_IRONWORKS_BLUEPRINT,
  },
];

export const DEFAULT_BLACKSMITH_PRESET_ID = "rustic_village_forge" as const;

export function getBlacksmithPreset(
  id: string,
): BlacksmithWorkshopPreset | undefined {
  return BLACKSMITH_PRESETS.find((p) => p.id === id);
}
