import type { LandmarkTowerBlueprint } from "@/src/lib/blueprints/types/landmarkTower";
import { mapColorPaletteFromText } from "@/src/lib/builder/reference/mapColorPaletteIntent";
import type { TowerBlueprintOperation } from "@/src/lib/builder/landmarkTower/towerBlueprintOperations";

export type TowerRefinementPlan = {
  readonly operations: readonly TowerBlueprintOperation[];
  readonly planLabel: string;
  readonly mappingSummary?: readonly string[];
};

export function mapTowerRefinementPrompt(
  prompt: string,
  blueprint: LandmarkTowerBlueprint,
): TowerRefinementPlan | null {
  const text = prompt.toLowerCase().trim();
  if (text.length === 0) return null;

  const ops: TowerBlueprintOperation[] = [];
  const labels: string[] = [];
  let mappingSummary: string[] | undefined;

  if (/\b(taller|higher|raise)\b/.test(text) && !/\bshorter\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { shaftHeight: Math.min(24, blueprint.tower.shaftHeight + 2) },
    });
    labels.push("taller shaft");
  }
  if (/\b(shorter|lower)\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { shaftHeight: Math.max(12, blueprint.tower.shaftHeight - 2) },
    });
    labels.push("shorter shaft");
  }

  if (/\b(wider|broader)\s+base\b/.test(text) || /\bbase\s+wider\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { basePad: Math.min(2, blueprint.tower.basePad + 1) },
    });
    labels.push("wider base");
  }
  if (/\b(narrower|smaller)\s+base\b/.test(text) || /\bbase\s+narrower\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { basePad: Math.max(0, blueprint.tower.basePad - 1) },
    });
    labels.push("narrower base");
  }

  if (
    /\b(warmer|sandstone|light(?:er)?\s+stone|tan)\b/.test(text) &&
    /\b(wall|walls|stone)\b/.test(text)
  ) {
    const m = mapColorPaletteFromText(text);
    ops.push({ op: "setTowerMaterials", patch: { wall: m.materials.wall, base: m.materials.base } });
    mappingSummary = [...m.mappingSummary];
    labels.push("warmer walls");
  }

  if (
    /\b(dark(?:er)?\s+(?:cap|crown|top)|(?:cap|crown|top)\s+dark(?:er)?|charcoal|dark gr[ae]y)\b/.test(
      text,
    )
  ) {
    const m = mapColorPaletteFromText(text);
    ops.push({ op: "setTowerMaterials", patch: { cap: m.materials.cap } });
    mappingSummary = mappingSummary ?? [...m.mappingSummary];
    labels.push("darker cap");
  }

  if (/\b(match(?:ing)?\s+(?:the\s+)?colors?|color palette|palette|warm tan.*dark)\b/.test(text)) {
    const m = mapColorPaletteFromText(text);
    ops.push({ op: "setTowerMaterials", patch: m.materials });
    mappingSummary = [...m.mappingSummary];
    labels.push("palette mapping");
  }

  if (/\b(more prominent|taller|larger)\s+(?:top|crown|cap)\b/.test(text) || /\bcrown\s+(?:taller|higher)\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { crownHeight: Math.min(5, blueprint.tower.crownHeight + 1) },
    });
    labels.push("prominent crown");
  }

  if (/\b(more|extra|additional)\s+(?:vertical\s+)?windows?\b/.test(text) || /\badd\s+windows?\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { windowRows: Math.min(8, blueprint.tower.windowRows + 1) },
    });
    labels.push("more window rows");
  }
  if (/\b(fewer|less)\s+windows?\b/.test(text)) {
    ops.push({
      op: "updateTowerParams",
      patch: { windowRows: Math.max(1, blueprint.tower.windowRows - 1) },
    });
    labels.push("fewer window rows");
  }

  if (/\bglass\s+pane\b/.test(text)) {
    ops.push({ op: "updateTowerParams", patch: { windowTreatment: "glass_pane" } });
    labels.push("glass pane windows");
  } else if (/\bglass\s+block\b/.test(text)) {
    ops.push({ op: "updateTowerParams", patch: { windowTreatment: "glass_block" } });
    labels.push("glass block windows");
  } else if (/\bopen\s+windows?\b/.test(text)) {
    ops.push({ op: "updateTowerParams", patch: { windowTreatment: "open" } });
    labels.push("open windows");
  }

  if (/\b(round|rounder|circular)\b/.test(text)) {
    ops.push({ op: "updateTowerParams", patch: { footprintShape: "circular_approx" } });
    labels.push("rounder footprint");
  } else if (/\boctagonal\b/.test(text)) {
    ops.push({ op: "updateTowerParams", patch: { footprintShape: "octagonal" } });
    labels.push("octagonal footprint");
  } else if (/\bsquare\b/.test(text) && /\bfootprint\b/.test(text)) {
    ops.push({ op: "updateTowerParams", patch: { footprintShape: "square" } });
    labels.push("square footprint");
  }

  if (ops.length === 0) return null;

  return {
    operations: ops,
    planLabel: labels.join(", "),
    mappingSummary,
  };
}
