import type {
  GenericBuildingBlueprintV2,
  RoomFace,
  RoomSurfaceRef,
  WindowGroupComponentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  findChimney,
  findFrontDoor,
  findMainRoof,
  findPorch,
  findRootRoom,
} from "@/src/lib/builder/blueprintComponentIndex";
import { getMaxWindowSlotsForSurface } from "@/src/lib/blueprints/windowFacadeCapacity";
import {
  aggregatePaletteStyleDescriptors,
  describePaletteMaterials,
} from "@/src/lib/builder/semantic/materialStyleDescriptors";

export type WindowSurfaceSummary = {
  readonly face: RoomFace;
  readonly surface: string;
  readonly groupId?: string;
  readonly count: number;
  readonly maxSlots: number;
  readonly atCapacity: boolean;
};

export type SemanticBuildSummaryForPlanner = {
  readonly buildingType: string;
  readonly proportions: readonly string[];
  readonly materialSummary: string;
  readonly styleDescriptors: readonly string[];
  readonly roofSummary: string;
  readonly featureSummary: readonly string[];
  readonly windowsBySurface: readonly WindowSurfaceSummary[];
  readonly missingFeatures: readonly string[];
  readonly constraints: readonly string[];
  readonly suggestedNextMoves: readonly string[];
};

const ROOM_FACES: readonly RoomFace[] = ["front", "back", "left", "right"];

const PRESET_BUILDING_TYPE: Readonly<Record<string, string>> = {
  stone_workshop_v2: "stone workshop",
  porch_house_v2: "porch house",
  simple_cabin_v2: "simple cabin",
};

function inferBuildingType(
  blueprint: GenericBuildingBlueprintV2,
  presetId?: string,
): string {
  if (presetId && PRESET_BUILDING_TYPE[presetId]) {
    return PRESET_BUILDING_TYPE[presetId];
  }
  const name = blueprint.metadata.name?.trim();
  if (name) return name.replace(/\s*\(v2\)\s*$/i, "").toLowerCase();
  return "generic building";
}

function inferProportions(
  width: number,
  depth: number,
  wallHeight: number,
): readonly string[] {
  const tags: string[] = [];
  const footprint = width * depth;
  if (footprint >= 90) tags.push("wide");
  else if (footprint <= 56) tags.push("compact");
  else tags.push("medium footprint");

  if (wallHeight <= 4) tags.push("low");
  else if (wallHeight >= 6) tags.push("tall");
  else tags.push("mid-height");

  if (width > depth + 2) tags.push("elongated front-back");
  else if (depth > width + 1) tags.push("deep");

  return tags;
}

function buildWindowSummaries(
  blueprint: GenericBuildingBlueprintV2,
  roomId: string,
): WindowSurfaceSummary[] {
  const bySurface = new Map<string, WindowGroupComponentV2>();
  for (const c of blueprint.components) {
    if (c.type === "window_group") {
      bySurface.set(c.attach.targetSurface, c);
    }
  }

  return ROOM_FACES.map((face) => {
    const surface = `${roomId}.${face}` as RoomSurfaceRef;
    const wg = bySurface.get(surface);
    const maxSlots = getMaxWindowSlotsForSurface(blueprint, surface);
    const count = wg?.count ?? 0;
    const atCapacity = wg != null ? count >= maxSlots : maxSlots <= 0;
    return {
      face,
      surface,
      groupId: wg?.id,
      count,
      maxSlots,
      atCapacity,
    };
  });
}

function buildFeatureSummary(blueprint: GenericBuildingBlueprintV2): string[] {
  const features: string[] = [];
  const porch = findPorch(blueprint);
  if (porch) {
    features.push(`porch (${porch.widthMode}, depth ${porch.depth})`);
  } else {
    features.push("no porch");
  }

  const chimney = findChimney(blueprint);
  features.push(chimney ? `chimney on ${chimney.attach.targetSurface}` : "no chimney");

  const door = findFrontDoor(blueprint);
  if (door) features.push(`front door (${door.width}×${door.height})`);

  if (blueprint.components.some((c) => c.type === "step")) {
    features.push("front step");
  }

  return features;
}

function buildMissingFeatures(blueprint: GenericBuildingBlueprintV2): string[] {
  const missing: string[] = [];
  if (!findPorch(blueprint)) missing.push("porch");
  if (!findChimney(blueprint)) missing.push("chimney");
  const room = findRootRoom(blueprint);
  if (!room) return missing;

  for (const face of ROOM_FACES) {
    const surface = `${room.id}.${face}` as RoomSurfaceRef;
    const hasGroup = blueprint.components.some(
      (c) => c.type === "window_group" && c.attach.targetSurface === surface,
    );
    if (!hasGroup && getMaxWindowSlotsForSurface(blueprint, surface) > 0) {
      missing.push(`${face} windows`);
    }
  }
  return missing;
}

function buildSuggestedNextMoves(
  blueprint: GenericBuildingBlueprintV2,
  windows: readonly WindowSurfaceSummary[],
  missing: readonly string[],
): string[] {
  const moves: string[] = [];
  if (missing.includes("chimney")) moves.push("add chimney");
  if (missing.includes("porch")) moves.push("add porch");

  for (const w of windows) {
    if (!w.groupId && w.maxSlots > 0) {
      moves.push(`add ${w.face} window_group`);
    } else if (w.groupId && !w.atCapacity) {
      moves.push(`increase ${w.face} window count (${w.groupId})`);
    }
  }

  const porch = findPorch(blueprint);
  if (porch?.widthMode === "door_only") {
    moves.push("widen porch to full_facade");
  }

  if (moves.length === 0) {
    moves.push("adjust material palette", "tweak roof layers or room proportions");
  }
  return moves.slice(0, 8);
}

function buildRoofSummary(blueprint: GenericBuildingBlueprintV2): string {
  const roof = findMainRoof(blueprint);
  if (!roof) return "no roof component";
  const parts = [
    roof.kind,
    roof.layers != null ? `${roof.layers} layers` : null,
    roof.orientation ? `orientation ${roof.orientation}` : null,
    roof.overhang != null ? `overhang ${roof.overhang}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export function getSemanticBuildSummaryForPlanner(
  blueprint: GenericBuildingBlueprintV2,
  options?: { presetId?: string },
): SemanticBuildSummaryForPlanner {
  const room = findRootRoom(blueprint);
  const roomId = room?.id ?? "main-room";
  const width = room?.width ?? 0;
  const depth = room?.depth ?? 0;
  const wallHeight = room?.wallHeight ?? 0;

  const styleDescriptors = aggregatePaletteStyleDescriptors(blueprint.materials);
  const windowsBySurface = buildWindowSummaries(blueprint, roomId);
  const missingFeatures = buildMissingFeatures(blueprint);

  return {
    buildingType: inferBuildingType(blueprint, options?.presetId),
    proportions: room
      ? inferProportions(width, depth, wallHeight)
      : ["unknown proportions"],
    materialSummary: describePaletteMaterials(blueprint.materials),
    styleDescriptors,
    roofSummary: buildRoofSummary(blueprint),
    featureSummary: buildFeatureSummary(blueprint),
    windowsBySurface,
    missingFeatures,
    constraints: [
      `room ${width}×${depth}, wallHeight ${wallHeight}`,
      `maxBlockCount ${blueprint.constraints.maxBlockCount}`,
    ],
    suggestedNextMoves: buildSuggestedNextMoves(
      blueprint,
      windowsBySurface,
      missingFeatures,
    ),
  };
}

export function renderSemanticBuildSummaryText(
  summary: SemanticBuildSummaryForPlanner,
): string {
  const lines: string[] = ["Semantic build summary:"];
  lines.push(`- building type: ${summary.buildingType}`);
  lines.push(`- proportions: ${summary.proportions.join(", ")}`);
  lines.push(`- materials: ${summary.materialSummary}`);
  if (summary.styleDescriptors.length > 0) {
    lines.push(`- style: ${summary.styleDescriptors.join(", ")}`);
  }
  lines.push(`- roof: ${summary.roofSummary}`);
  lines.push(`- features: ${summary.featureSummary.join("; ")}`);

  for (const w of summary.windowsBySurface) {
    const state = w.groupId
      ? `group ${w.groupId}, count ${w.count}/${w.maxSlots}${w.atCapacity ? " (at capacity)" : ""}`
      : w.maxSlots > 0
        ? `no group, can add (max ${w.maxSlots})`
        : "no capacity";
    lines.push(`- windows ${w.face}: ${state}`);
  }

  if (summary.missingFeatures.length > 0) {
    lines.push(`- missing: ${summary.missingFeatures.join(", ")}`);
  }
  lines.push(`- valid next moves: ${summary.suggestedNextMoves.join("; ")}`);
  return lines.join("\n");
}
