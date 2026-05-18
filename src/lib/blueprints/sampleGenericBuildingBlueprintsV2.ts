import type { GenericBuildingBlueprintV2 } from "./types/genericBuildingV2";

export interface GenericBuildingPresetV2 {
  readonly id: string;
  readonly label: string;
  readonly blueprint: GenericBuildingBlueprintV2;
}

export const DEFAULT_GENERIC_V2_PRESET_ID = "simple_cabin_v2" as const;

const SIMPLE_CABIN_V2: GenericBuildingBlueprintV2 = {
  structureType: "generic_building",
  schemaVersion: 2,
  metadata: {
    name: "Simple cabin (v2)",
    description:
      "Component-authored cabin: gable roof, front door and windows, chimney, front step.",
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
  components: [
    {
      id: "main-room",
      type: "room",
      label: "Main room",
      role: "root",
      width: 9,
      depth: 7,
      wallHeight: 5,
      wallThickness: 1,
      hollowInterior: true,
    },
    {
      id: "main-roof",
      type: "roof",
      label: "Main roof",
      targetRoom: "main-room",
      kind: "pitched_gable",
      layers: 2,
      overhang: 0,
    },
    {
      id: "front-door",
      type: "door",
      label: "Front door",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      width: 2,
      height: 2,
    },
    {
      id: "front-windows",
      type: "window_group",
      label: "Front windows",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      count: 2,
      layout: "symmetric",
      heightBand: "auto",
    },
    {
      id: "chimney",
      type: "chimney",
      label: "Chimney",
      attach: {
        targetSurface: "main-room.right",
        placement: { horizontal: "center" },
      },
    },
    {
      id: "front-step",
      type: "step",
      label: "Front step",
      attach: { targetDoor: "front-door" },
    },
  ],
};

const STONE_WORKSHOP_V2: GenericBuildingBlueprintV2 = {
  structureType: "generic_building",
  schemaVersion: 2,
  metadata: {
    name: "Stone workshop (v2)",
    description: "Wide workshop with shed roof, large front door, and side window groups.",
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
  components: [
    {
      id: "main-room",
      type: "room",
      label: "Workshop",
      role: "root",
      width: 11,
      depth: 9,
      wallHeight: 4,
      wallThickness: 1,
      hollowInterior: true,
    },
    {
      id: "main-roof",
      type: "roof",
      label: "Shed roof",
      targetRoom: "main-room",
      kind: "shed",
      layers: 2,
      overhang: 1,
      orientation: "front_back",
    },
    {
      id: "front-door",
      type: "door",
      label: "Shop door",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      width: 3,
      height: 2,
    },
    {
      id: "front-windows",
      type: "window_group",
      label: "Front windows",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      count: 2,
      layout: "symmetric",
      heightBand: "mid",
    },
    {
      id: "left-windows",
      type: "window_group",
      label: "Left windows",
      attach: {
        targetSurface: "main-room.left",
        placement: { horizontal: "center" },
      },
      count: 2,
      layout: "even",
      heightBand: "mid",
    },
  ],
};

const PORCH_HOUSE_V2: GenericBuildingBlueprintV2 = {
  structureType: "generic_building",
  schemaVersion: 2,
  metadata: {
    name: "Porch house (v2)",
    description: "Gable house with full-width front porch, door-centered windows, and step.",
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
  components: [
    {
      id: "main-room",
      type: "room",
      label: "Main room",
      role: "root",
      width: 10,
      depth: 8,
      wallHeight: 5,
      wallThickness: 1,
      hollowInterior: true,
    },
    {
      id: "main-roof",
      type: "roof",
      label: "Main roof",
      targetRoom: "main-room",
      kind: "pitched_gable",
      layers: 2,
      overhang: 1,
    },
    {
      id: "front-door",
      type: "door",
      label: "Front door",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      width: 2,
      height: 2,
    },
    {
      id: "front-windows",
      type: "window_group",
      label: "Front windows",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      count: 2,
      layout: "symmetric",
      heightBand: "auto",
    },
    {
      id: "front-porch",
      type: "porch",
      label: "Front porch",
      attach: {
        targetSurface: "main-room.front",
        placement: { horizontal: "center" },
      },
      depth: 2,
      widthMode: "full_facade",
    },
    {
      id: "front-step",
      type: "step",
      label: "Front step",
      attach: { targetDoor: "front-door" },
    },
  ],
};

export const GENERIC_BUILDING_V2_PRESETS: readonly GenericBuildingPresetV2[] = [
  { id: "simple_cabin_v2", label: "Simple cabin (v2)", blueprint: SIMPLE_CABIN_V2 },
  {
    id: "stone_workshop_v2",
    label: "Stone workshop (v2)",
    blueprint: STONE_WORKSHOP_V2,
  },
  { id: "porch_house_v2", label: "Porch house (v2)", blueprint: PORCH_HOUSE_V2 },
];

export function getGenericBuildingPresetV2(
  id: string,
): GenericBuildingPresetV2 | undefined {
  return GENERIC_BUILDING_V2_PRESETS.find((p) => p.id === id);
}
