import type { LandmarkTowerBlueprint } from "@/src/lib/blueprints/types/landmarkTower";

export const DEFAULT_LANDMARK_TOWER_PRESET_ID = "landmark_tower_default" as const;

export type LandmarkTowerPresetId = typeof DEFAULT_LANDMARK_TOWER_PRESET_ID;

export interface LandmarkTowerPreset {
  readonly id: LandmarkTowerPresetId;
  readonly label: string;
  readonly blueprint: LandmarkTowerBlueprint;
}

export const LANDMARK_TOWER_DEFAULT: LandmarkTowerBlueprint = {
  structureType: "landmark_tower",
  schemaVersion: 1,
  metadata: {
    name: "Landmark tower (default)",
    description:
      "Formal campus landmark tower: warm stone shaft, dark crown, vertical window bands.",
  },
  materials: {
    wall: "limestone_bricks",
    cap: "slate_tiles",
    accent: "limestone",
    base: "limestone_bricks",
    window: "glass",
  },
  constraints: {
    maxBlockCount: 80_000,
    allowFloatingBlocks: false,
    enforceSymmetry: false,
    requireGroundedStructure: true,
  },
  tower: {
    footprintWidth: 5,
    footprintDepth: 5,
    footprintShape: "square",
    shaftHeight: 20,
    basePad: 1,
    baseHeight: 2,
    crownHeight: 3,
    crownStyle: "dark_cap",
    windowRows: 4,
    windowsPerRow: 1,
    windowTreatment: "open",
    entrance: true,
  },
};

export const LANDMARK_TOWER_PRESETS: readonly LandmarkTowerPreset[] = [
  {
    id: DEFAULT_LANDMARK_TOWER_PRESET_ID,
    label: "Landmark tower (default)",
    blueprint: LANDMARK_TOWER_DEFAULT,
  },
];

export function getLandmarkTowerPreset(id: string): LandmarkTowerPreset | undefined {
  return LANDMARK_TOWER_PRESETS.find((p) => p.id === id);
}

export function cloneLandmarkTowerBlueprint(
  blueprint: LandmarkTowerBlueprint = LANDMARK_TOWER_DEFAULT,
): LandmarkTowerBlueprint {
  return structuredClone(blueprint);
}
