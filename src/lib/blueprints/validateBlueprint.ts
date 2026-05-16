import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type {
  MedievalTowerBlueprint,
  StructureBlueprint,
  ResolvedMedievalTower,
  ResolvedStructure,
  BlueprintMassing,
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

function verticalEmphasisFactor(
  v: BlueprintMassing["verticalEmphasis"],
): number {
  switch (v) {
    case "low":
      return 0.85;
    case "medium":
      return 1;
    case "tall":
      return 1.15;
    default:
      return 1;
  }
}

/** Rough upper bound for tower voxel count (for maxBlockCount guard). */
function estimateTowerBlocks(r: ResolvedMedievalTower): number {
  const { width: W, depth: D, bodyLayers: H, roofLayers: R, overhang: O } =
    r.grid;
  const T = r.massing.wallThickness;
  const foundation = W * D;
  const shellApprox = 2 * (W + D) * H * Math.max(1, T);
  const interiorFloors = r.levels.includeInteriorFloors
    ? Math.max(0, W - 2 * T) * Math.max(0, D - 2 * T) * H
    : 0;
  let roofApprox = R * (2 * (W + D + 4 * O));
  if (r.roof.style === "stepped_pyramid" && R > 0) {
    const inset = R - 1;
    roofApprox +=
      Math.max(0, W - 2 * inset) * Math.max(0, D - 2 * inset);
  }
  const crenel = r.features.crenellations ? Math.ceil(6 * (W + D)) : 0;
  const facadeExtra = 4 * H + 8 * (W + D);
  return foundation + shellApprox + interiorFloors + roofApprox + crenel + facadeExtra;
}

function validateMedievalTowerBlueprint(
  blueprint: MedievalTowerBlueprint,
): BlueprintValidationResult {
  const errors: string[] = [];
  const notes: string[] = [];

  const bp = blueprint;
  const { dimensions: dim, massing, levels, openings, roof, constraints } = bp;

  let W = dim.width;
  let D = dim.length;
  const Hbud = dim.height;

  if (!Number.isInteger(W) || W < 5) errors.push("dimensions.width must be an integer ≥ 5.");
  if (!Number.isInteger(D) || D < 5) errors.push("dimensions.length must be an integer ≥ 5.");
  if (!Number.isInteger(Hbud) || Hbud < 8) {
    errors.push("dimensions.height must be an integer ≥ 8 (room for foundation, body, roof).");
  }

  const T = massing.wallThickness;
  if (!Number.isInteger(T) || T < 1) {
    errors.push("massing.wallThickness must be an integer ≥ 1.");
  }
  if (massing.hollowInterior && W >= 2 * T + 2 && D >= 2 * T + 2) {
    /* ok */
  } else if (massing.hollowInterior) {
    errors.push(
      "hollowInterior requires footprint large enough for inner void (width and length ≥ 2·wallThickness + 2).",
    );
  }

  if (!Number.isInteger(levels.floorCount) || levels.floorCount < 1) {
    errors.push("levels.floorCount must be an integer ≥ 1.");
  }

  if (massing.footprint === "square" && W !== D) {
    notes.push(`Footprint is square: length adjusted from ${D} to match width ${W}.`);
    D = W;
  }

  const roofLayers = roof.style === "flat" ? 1 : Math.max(1, roof.height);
  let roofLayersEff = roofLayers;
  const foundationLayers = 1;
  let bodyLayers = Math.floor(
    levels.floorCount * verticalEmphasisFactor(massing.verticalEmphasis),
  );
  bodyLayers = Math.max(1, Math.min(bodyLayers, levels.floorCount + 2));

  const minTotal = foundationLayers + bodyLayers + roofLayersEff;
  if (minTotal > Hbud) {
    const slack = minTotal - Hbud;
    bodyLayers = Math.max(1, bodyLayers - slack);
    notes.push(
      `Clamped body layers to ${bodyLayers} so foundation + body + roof (${roofLayersEff}) fits within height ${Hbud}.`,
    );
  }

  let overhang = Math.max(0, Math.min(2, roof.overhang));
  if (roof.overhang > 2) {
    notes.push(`Roof overhang clamped from ${roof.overhang} to 2 to limit unsupported eaves.`);
  }

  if (!Number.isInteger(openings.entranceWidth) || openings.entranceWidth < 1) {
    errors.push("openings.entranceWidth must be an integer ≥ 1.");
  }
  if (!Number.isInteger(openings.entranceHeight) || openings.entranceHeight < 2) {
    errors.push("openings.entranceHeight must be an integer ≥ 2.");
  }
  const maxDoorW = Math.max(1, W - 2 * T - 2);
  if (openings.entranceWidth > maxDoorW) {
    errors.push(
      `openings.entranceWidth (${openings.entranceWidth}) too wide for footprint and wallThickness (max ${maxDoorW}).`,
    );
  }
  if (openings.entranceHeight > bodyLayers) {
    errors.push("openings.entranceHeight cannot exceed body wall layers.");
  }

  if (!Number.isInteger(openings.windowsCountPerSide) || openings.windowsCountPerSide < 0) {
    errors.push("openings.windowsCountPerSide must be a non-negative integer.");
  }

  if (constraints.enforceSymmetry && openings.windowsPlacement === "front_only") {
    notes.push(
      "constraints.enforceSymmetry is true but windows are front_only; bilateral symmetry still applies to massing only.",
    );
  }

  if (massing.symmetry === "radial" && massing.footprint === "square") {
    notes.push("Radial symmetry on a square tower is treated as bilateral for openings.");
  }

  if (
    W === D &&
    Number.isInteger(openings.entranceWidth) &&
    openings.entranceWidth >= 1 &&
    openings.entranceWidth % 2 !== W % 2
  ) {
    notes.push(
      "Door width parity (odd/even) differs from footprint width parity; front façade composition may look less balanced (see docs/GENERATION_DESIGN_PRINCIPLES.md §7.2).",
    );
  }

  let materialsResolved: ResolvedMedievalTower["materials"];
  try {
    materialsResolved = {
      wall: resolveMaterial(bp.materials.wall, "wall"),
      floor: resolveMaterial(bp.materials.floor, "floor"),
      roof: resolveMaterial(bp.materials.roof, "roof"),
      window: resolveMaterial(bp.materials.window, "window"),
      door: resolveMaterial(bp.materials.door, "door"),
      accent: resolveMaterial(bp.materials.accent, "accent"),
    };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length > 0) {
    return { ok: false, errors, notes };
  }

  const resolvedDraft: ResolvedMedievalTower = {
    structureType: "medieval_tower",
    metadata: bp.metadata,
    materials: materialsResolved!,
    massing,
    levels,
    openings,
    roof: { ...roof, height: roof.style === "flat" ? 1 : roof.height },
    features: bp.features,
    constraints,
    grid: {
      width: W,
      depth: D,
      bodyLayers,
      roofLayers: roofLayersEff,
      overhang,
    },
  };

  let estimate = estimateTowerBlocks(resolvedDraft);
  while (estimate > constraints.maxBlockCount && roofLayersEff > 1) {
    roofLayersEff -= 1;
    notes.push(
      `Reduced roof layers to ${roofLayersEff} to respect maxBlockCount (${constraints.maxBlockCount}).`,
    );
    const r2: ResolvedMedievalTower = {
      ...resolvedDraft,
      grid: { ...resolvedDraft.grid, roofLayers: roofLayersEff },
    };
    estimate = estimateTowerBlocks(r2);
  }
  if (estimate > constraints.maxBlockCount) {
    errors.push(
      `Estimated block count (~${estimate}) exceeds constraints.maxBlockCount (${constraints.maxBlockCount}). Reduce footprint, body layers, or features.`,
    );
    return { ok: false, errors, notes };
  }

  const resolved: ResolvedMedievalTower = {
    ...resolvedDraft,
    grid: { ...resolvedDraft.grid, roofLayers: roofLayersEff, overhang },
  };

  return { ok: true, errors: [], notes, resolved };
}

export function validateBlueprint(
  blueprint: StructureBlueprint,
): BlueprintValidationResult {
  switch (blueprint.structureType) {
    case "medieval_tower":
      return validateMedievalTowerBlueprint(blueprint);
    default: {
      const unknown = blueprint as { structureType?: string };
      return {
        ok: false,
        errors: [`Unsupported structureType: ${unknown.structureType ?? "?"}`],
        notes: [],
      };
    }
  }
}
