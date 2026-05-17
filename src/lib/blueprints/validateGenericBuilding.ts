import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type {
  GenericBuildingBlueprint,
  GenericWindowHeightBand,
  ResolvedGenericBuilding,
  ResolvedStructure,
} from "./types";

export interface BlueprintValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly notes: readonly string[];
  readonly resolved?: ResolvedStructure;
}

function isClassicKey(k: string): k is keyof typeof CLASSIC_BLOCK_PACK {
  return Object.prototype.hasOwnProperty.call(CLASSIC_BLOCK_PACK, k);
}

function resolveMaterial(key: string, slot: string): BlockTypeId {
  if (!isClassicKey(key)) {
    throw new Error(
      `Unknown classic material key "${key}" for slot "${slot}". Must match a block in CLASSIC_BLOCK_PACK.`,
    );
  }
  return blockTypeId("classic", key);
}

function estimateGenericBlocks(r: ResolvedGenericBuilding): number {
  const { width: W, depth: D, bodyLayers: H, roofLayers: R, overhang: O } =
    r.grid;
  const T = r.body.wallThickness;
  const foundation = W * D;
  const shellApprox = 2 * (W + D) * H * Math.max(1, T);
  const interiorFloors = r.body.hollowInterior
    ? Math.max(0, W - 2 * T) * Math.max(0, D - 2 * T)
    : 0;
  const roofApprox = R * (W + 2 * O) * (D + 2 * O);
  const chimney = r.features.chimney.enabled ? (H + R + 4) * 4 : 0;
  const step = r.features.frontStep.enabled ? 6 : 0;
  return foundation + shellApprox + interiorFloors + roofApprox + chimney + step + 64;
}

function maxEntranceWidth(
  side: ResolvedGenericBuilding["openings"]["entrance"]["side"],
  W: number,
  D: number,
  T: number,
): number {
  const span =
    side === "front" || side === "back" ? W : D;
  return Math.max(1, span - 2 * T - 2);
}

export function validateGenericBuildingBlueprint(
  blueprint: GenericBuildingBlueprint,
): BlueprintValidationResult {
  const errors: string[] = [];
  const notes: string[] = [];

  if (blueprint.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1.');
  }

  const W = blueprint.body.width;
  const D = blueprint.body.depth;
  const bodyLayers = blueprint.body.height;
  const T = blueprint.body.wallThickness;

  if (!Number.isInteger(W) || W < 5 || W > 17) {
    errors.push("body.width must be an integer from 5 to 17.");
  }
  if (!Number.isInteger(D) || D < 5 || D > 13) {
    errors.push("body.depth must be an integer from 5 to 13.");
  }
  if (!Number.isInteger(bodyLayers) || bodyLayers < 4 || bodyLayers > 9) {
    errors.push("body.height must be an integer from 4 to 9 (wall layers above foundation).");
  }
  if (!Number.isInteger(T) || T < 1 || T > 2) {
    errors.push("body.wallThickness must be 1 or 2.");
  }

  if (blueprint.body.hollowInterior) {
    if (W < 2 * T + 2 || D < 2 * T + 2) {
      errors.push(
        "hollowInterior requires footprint large enough for an inner void.",
      );
    }
  }

  const ent = blueprint.openings.entrance;
  if (!Number.isInteger(ent.width) || ent.width < 1 || ent.width > 3) {
    errors.push("openings.entrance.width must be an integer from 1 to 3.");
  }
  if (!Number.isInteger(ent.height) || ent.height < 2 || ent.height > 4) {
    errors.push("openings.entrance.height must be an integer from 2 to 4.");
  }
  if (
    Number.isInteger(W) &&
    Number.isInteger(D) &&
    Number.isInteger(T) &&
    Number.isInteger(ent.width) &&
    ent.width > maxEntranceWidth(ent.side, W, D, T)
  ) {
    errors.push(
      `openings.entrance.width (${ent.width}) too wide for footprint and wallThickness.`,
    );
  }
  if (Number.isInteger(bodyLayers) && ent.height > bodyLayers) {
    errors.push("openings.entrance.height cannot exceed body.height.");
  }
  if (Number.isInteger(ent.height) && ent.height > 2) {
    notes.push(
      "openings.entrance.height > 2 is a tall (big) doorway; height 2 matches standard Minecraft door clearance above the threshold.",
    );
  }

  const win = blueprint.openings.windows;
  if (!Number.isInteger(win.count) || win.count < 0 || win.count > 12) {
    errors.push("openings.windows.count must be an integer from 0 to 12.");
  }
  if (win.mode === "none" && win.count > 0) {
    notes.push("windows.mode is none; window count ignored.");
  }

  let roofLayers = 0;
  const roofKind = blueprint.roof.kind;
  if (roofKind === "none") {
    roofLayers = 0;
  } else if (roofKind === "pitched_gable") {
    roofLayers = blueprint.roof.layers ?? 2;
    roofLayers = Math.max(1, Math.min(3, Math.floor(roofLayers)));
  } else if (roofKind === "shed") {
    roofLayers = blueprint.roof.layers ?? 1;
    roofLayers = Math.max(1, Math.min(3, Math.floor(roofLayers)));
  }

  let overhang = blueprint.roof.overhang ?? 0;
  if (overhang < 0) overhang = 0;
  if (overhang > 1) {
    notes.push(`Roof overhang clamped from ${blueprint.roof.overhang} to 1.`);
    overhang = 1;
  }

  const chimneyEnabled = blueprint.features.chimney?.enabled ?? false;
  const frontStepEnabled = blueprint.features.frontStep?.enabled ?? false;
  const chimneySide = blueprint.features.chimney?.side ?? "right";

  let materialsResolved: ResolvedGenericBuilding["materials"];
  try {
    materialsResolved = {
      wall: resolveMaterial(blueprint.materials.wall, "wall"),
      floor: resolveMaterial(blueprint.materials.floor, "floor"),
      roof: resolveMaterial(blueprint.materials.roof, "roof"),
      window: resolveMaterial(blueprint.materials.window, "window"),
      door: resolveMaterial(blueprint.materials.door, "door"),
      accent: resolveMaterial(blueprint.materials.accent, "accent"),
    };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length > 0) {
    return { ok: false, errors, notes };
  }

  const heightBand: GenericWindowHeightBand =
    blueprint.openings.windows.heightBand ?? "auto";

  const resolvedDraft: ResolvedGenericBuilding = {
    structureType: "generic_building",
    metadata: blueprint.metadata,
    materials: materialsResolved!,
    body: {
      width: W,
      depth: D,
      height: bodyLayers,
      wallThickness: T,
      hollowInterior: blueprint.body.hollowInterior,
    },
    roof: {
      kind: roofKind,
      layers: roofLayers,
      overhang,
    },
    openings: {
      entrance: ent,
      windows: {
        mode: win.mode,
        count: win.mode === "none" ? 0 : win.count,
        heightBand,
      },
    },
    features: {
      chimney: { enabled: chimneyEnabled, side: chimneySide },
      frontStep: { enabled: frontStepEnabled },
    },
    constraints: blueprint.constraints,
    grid: {
      width: W,
      depth: D,
      bodyLayers,
      roofLayers,
      overhang,
    },
  };

  let estimate = estimateGenericBlocks(resolvedDraft);
  let roofLayersEff = roofLayers;
  while (estimate > blueprint.constraints.maxBlockCount && roofLayersEff > 0) {
    roofLayersEff -= 1;
    notes.push(
      `Reduced roof layers to ${roofLayersEff} to respect maxBlockCount (${blueprint.constraints.maxBlockCount}).`,
    );
    const r2: ResolvedGenericBuilding = {
      ...resolvedDraft,
      roof: { ...resolvedDraft.roof, layers: roofLayersEff },
      grid: { ...resolvedDraft.grid, roofLayers: roofLayersEff },
    };
    estimate = estimateGenericBlocks(r2);
  }

  if (estimate > blueprint.constraints.maxBlockCount) {
    errors.push(
      `Estimated block count (~${estimate}) exceeds constraints.maxBlockCount (${blueprint.constraints.maxBlockCount}).`,
    );
    return { ok: false, errors, notes };
  }

  const resolved: ResolvedGenericBuilding = {
    ...resolvedDraft,
    roof: { ...resolvedDraft.roof, layers: roofLayersEff },
    grid: { ...resolvedDraft.grid, roofLayers: roofLayersEff },
  };

  return { ok: true, errors: [], notes, resolved };
}
