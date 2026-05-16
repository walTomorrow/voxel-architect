import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type {
  BlacksmithWorkshopBlueprint,
  ResolvedBlacksmithWorkshop,
} from "./types";
import type { BlueprintValidationResult } from "./validateBlueprint";

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

function estimateBlacksmithBlocks(r: ResolvedBlacksmithWorkshop): number {
  const { width: W, depth: D, bodyLayers: H, roofLayers: R } = r.grid;
  const T = r.massing.wallThickness;
  const foundation = W * D;
  const shellApprox = 2 * (W + D) * H * Math.max(1, T);
  let roofApprox = 0;
  for (let layer = 0; layer < R; layer++) {
    const inset =
      r.roof.style === "shed" ? Math.floor(layer / 2) : layer;
    const rw = Math.max(1, W - 2 * inset);
    const rd = Math.max(1, D - 2 * inset);
    roofApprox += rw * rd;
  }
  const interior = r.massing.hollowInterior
    ? Math.max(0, W - 2 * T) * Math.max(0, D - 2 * T)
    : 0;
  const detail = 40 + (r.features.chimney.enabled ? H + R + 8 : 0);
  return foundation + shellApprox + roofApprox + interior + detail;
}

export function validateBlacksmithWorkshopBlueprint(
  bp: BlacksmithWorkshopBlueprint,
): BlueprintValidationResult {
  const errors: string[] = [];
  const notes: string[] = [];

  const { dimensions: dim, massing, openings, roof, constraints } = bp;

  let W = dim.width;
  let D = dim.depth;
  const Hbud = dim.height;

  if (!Number.isInteger(W) || W < 7 || W > 15) {
    errors.push("dimensions.width must be an integer from 7 to 15.");
  }
  if (!Number.isInteger(D) || D < 5 || D > 11) {
    errors.push("dimensions.depth must be an integer from 5 to 11.");
  }
  if (!Number.isInteger(Hbud) || Hbud < 4 || Hbud > 8) {
    errors.push("dimensions.height must be an integer from 4 to 8.");
  }

  const T = massing.wallThickness;
  if (!Number.isInteger(T) || T < 1 || T > 2) {
    errors.push("massing.wallThickness must be 1 or 2.");
  }

  if (massing.hollowInterior && W >= 2 * T + 3 && D >= 2 * T + 3) {
    /* ok — room for forge/workbench zones */
  } else if (massing.hollowInterior) {
    errors.push(
      "hollowInterior requires footprint large enough for inner void (width ≥ 2·wallThickness + 3, depth ≥ 2·wallThickness + 3).",
    );
  }

  if (roof.style !== "pitched_gable" && roof.style !== "shed") {
    errors.push('roof.style must be "pitched_gable" or "shed".');
  }

  let roofLayersEff = Math.max(1, Math.min(3, roof.height));
  if (roof.height > 3) {
    notes.push(`Roof height clamped from ${roof.height} to ${roofLayersEff}.`);
  }

  const foundationLayers = 1;
  let bodyLayers = Hbud - foundationLayers - roofLayersEff;
  if (bodyLayers < 2) {
    if (roofLayersEff > 1) {
      roofLayersEff -= 1;
      notes.push(`Reduced roof layers to ${roofLayersEff} to fit body within height ${Hbud}.`);
      bodyLayers = Hbud - foundationLayers - roofLayersEff;
    }
  }
  if (bodyLayers < 2) {
    errors.push(
      `height ${Hbud} too small for foundation + body (≥2) + roof (${roofLayersEff}).`,
    );
  }

  let overhang = Math.max(0, Math.min(1, roof.overhang));
  if (roof.overhang > 1) {
    notes.push(`Roof overhang clamped from ${roof.overhang} to 1.`);
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
      `openings.entranceWidth (${openings.entranceWidth}) too wide for footprint (max ${maxDoorW}).`,
    );
  }
  if (openings.entranceHeight > bodyLayers) {
    errors.push("openings.entranceHeight cannot exceed body wall layers.");
  }

  if (!Number.isInteger(openings.windowsCount) || openings.windowsCount < 0) {
    errors.push("openings.windowsCount must be a non-negative integer.");
  }
  if (openings.windowsPlacement === "none" && openings.windowsCount > 0) {
    notes.push("windowsCount ignored when windowsPlacement is none.");
  }

  if (bp.features.forge.enabled && !massing.hollowInterior) {
    errors.push("features.forge requires massing.hollowInterior.");
  }

  let materialsResolved: ResolvedBlacksmithWorkshop["materials"];
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

  const resolvedDraft: ResolvedBlacksmithWorkshop = {
    structureType: "blacksmith_workshop",
    metadata: bp.metadata,
    materials: materialsResolved!,
    massing,
    roof: { ...roof, height: roofLayersEff },
    openings,
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

  let estimate = estimateBlacksmithBlocks(resolvedDraft);
  while (estimate > constraints.maxBlockCount && roofLayersEff > 1) {
    roofLayersEff -= 1;
    notes.push(
      `Reduced roof layers to ${roofLayersEff} to respect maxBlockCount (${constraints.maxBlockCount}).`,
    );
    const r2: ResolvedBlacksmithWorkshop = {
      ...resolvedDraft,
      grid: { ...resolvedDraft.grid, roofLayers: roofLayersEff },
    };
    estimate = estimateBlacksmithBlocks(r2);
  }
  if (estimate > constraints.maxBlockCount) {
    errors.push(
      `Estimated block count (~${estimate}) exceeds constraints.maxBlockCount (${constraints.maxBlockCount}).`,
    );
    return { ok: false, errors, notes };
  }

  const resolved: ResolvedBlacksmithWorkshop = {
    ...resolvedDraft,
    grid: { ...resolvedDraft.grid, roofLayers: roofLayersEff, overhang },
  };

  return { ok: true, errors: [], notes, resolved };
}
