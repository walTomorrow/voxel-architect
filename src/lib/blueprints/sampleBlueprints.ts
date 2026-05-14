import type { MedievalTowerBlueprint } from "./types";

/**
 * Default inspectable medieval tower for demos and `/visualizer`.
 * Uses classic-pack material keys (resolved in `validateBlueprint`).
 */
export const SAMPLE_MEDIEVAL_TOWER_BLUEPRINT: MedievalTowerBlueprint = {
  structureType: "medieval_tower",
  metadata: {
    name: "Northwatch Spire (sample)",
    description:
      "Deterministic medieval tower from blueprint parameters — no AI involved.",
    notes: "Edit `sampleBlueprints.ts` or duplicate this object to experiment.",
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
