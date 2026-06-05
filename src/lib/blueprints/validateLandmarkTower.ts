import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import type {
  LandmarkBlueprintValidationResult,
  ValidationIssue,
} from "@/src/lib/blueprints/types/validationResult";
import type {
  LandmarkTowerBlueprint,
  TowerCrownStyle,
  TowerFootprintShape,
  TowerWindowTreatment,
} from "@/src/lib/blueprints/types/landmarkTower";

const FOOTPRINT_SHAPES: readonly TowerFootprintShape[] = [
  "square",
  "octagonal",
  "circular_approx",
];
const CROWN_STYLES: readonly TowerCrownStyle[] = [
  "flat_cap",
  "dark_cap",
  "stepped",
  "inset",
];
const WINDOW_TREATMENTS: readonly TowerWindowTreatment[] = [
  "glass_block",
  "glass_pane",
  "open",
];

const TOWER_MATERIAL_SLOTS = ["wall", "cap", "accent", "base", "window"] as const;

function isClassicKey(k: string): k is keyof typeof CLASSIC_BLOCK_PACK {
  return Object.prototype.hasOwnProperty.call(CLASSIC_BLOCK_PACK, k);
}

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function validateLandmarkTowerBlueprint(
  input: LandmarkTowerBlueprint,
): LandmarkBlueprintValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const notes: ValidationIssue[] = [];

  if (input.structureType !== "landmark_tower") {
    errors.push({
      severity: "error",
      code: "invalid_structure_type",
      message: `Expected structureType landmark_tower, got ${String(input.structureType)}.`,
      path: "/structureType",
    });
    return { ok: false, errors, warnings, notes };
  }

  if (input.schemaVersion !== 1) {
    errors.push({
      severity: "error",
      code: "invalid_schema_version",
      message: `Landmark tower schemaVersion must be 1.`,
      path: "/schemaVersion",
    });
  }

  for (const slot of TOWER_MATERIAL_SLOTS) {
    const key = input.materials[slot];
    if (typeof key !== "string" || !isClassicKey(key)) {
      errors.push({
        severity: "error",
        code: "invalid_material_key",
        message: `Unknown classic material key "${String(key)}" for tower material "${slot}".`,
        path: `/materials/${slot}`,
      });
    }
  }

  const t = input.tower;
  const footprintWidth = clampInt(t.footprintWidth, 3, 9);
  const footprintDepth = clampInt(t.footprintDepth, 3, 9);
  const shaftHeight = clampInt(t.shaftHeight, 12, 24);
  const basePad = clampInt(t.basePad, 0, 2);
  const baseHeight = clampInt(t.baseHeight, 1, 3);
  const crownHeight = clampInt(t.crownHeight, 1, 5);
  const windowRows = clampInt(t.windowRows, 1, 8);
  const windowsPerRow = clampInt(t.windowsPerRow, 1, 3);

  if (!FOOTPRINT_SHAPES.includes(t.footprintShape)) {
    errors.push({
      severity: "error",
      code: "invalid_footprint_shape",
      message: `Invalid footprintShape: ${String(t.footprintShape)}.`,
      path: "/tower/footprintShape",
    });
  }
  if (!CROWN_STYLES.includes(t.crownStyle)) {
    errors.push({
      severity: "error",
      code: "invalid_crown_style",
      message: `Invalid crownStyle: ${String(t.crownStyle)}.`,
      path: "/tower/crownStyle",
    });
  }
  if (!WINDOW_TREATMENTS.includes(t.windowTreatment)) {
    errors.push({
      severity: "error",
      code: "invalid_window_treatment",
      message: `Invalid windowTreatment: ${String(t.windowTreatment)}.`,
      path: "/tower/windowTreatment",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, notes };
  }

  const normalized: LandmarkTowerBlueprint = {
    ...input,
    tower: {
      ...t,
      footprintWidth,
      footprintDepth,
      shaftHeight,
      basePad,
      baseHeight,
      crownHeight,
      windowRows,
      windowsPerRow,
      footprintShape: FOOTPRINT_SHAPES.includes(t.footprintShape)
        ? t.footprintShape
        : "square",
      crownStyle: CROWN_STYLES.includes(t.crownStyle) ? t.crownStyle : "dark_cap",
      windowTreatment: WINDOW_TREATMENTS.includes(t.windowTreatment)
        ? t.windowTreatment
        : "open",
    },
  };

  const totalHeight = normalized.tower.baseHeight + normalized.tower.shaftHeight + normalized.tower.crownHeight;
  if (totalHeight < 20) {
    warnings.push({
      severity: "warning",
      code: "tower_short",
      message: `Tower total height ${totalHeight} is below demo target (~23–30).`,
      path: "/tower",
    });
  }

  return { ok: true, errors: [], warnings, notes, normalized };
}
