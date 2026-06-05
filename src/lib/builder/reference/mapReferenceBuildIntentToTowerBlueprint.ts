import { cloneLandmarkTowerBlueprint } from "@/src/lib/blueprints/sampleLandmarkTowerBlueprints";
import type { LandmarkTowerBlueprint } from "@/src/lib/blueprints/types/landmarkTower";
import {
  mapColorPaletteIntent,
  type MaterialRoleMapping,
} from "@/src/lib/builder/reference/mapColorPaletteIntent";
import type { ReferenceBuildIntent } from "@/src/lib/builder/reference/referenceBuildIntentTypes";

export type TowerBlueprintFromIntent = {
  readonly blueprint: LandmarkTowerBlueprint;
  readonly mapping: MaterialRoleMapping;
};

export function mapReferenceBuildIntentToTowerBlueprint(
  intent: ReferenceBuildIntent,
  userText?: string,
): TowerBlueprintFromIntent {
  const mapping = mapColorPaletteIntent(intent, userText);
  const bp = cloneLandmarkTowerBlueprint();
  const t = { ...bp.tower };

  switch (intent.silhouette.verticality) {
    case "very_tall":
      t.shaftHeight = 22;
      break;
    case "tall":
      t.shaftHeight = 20;
      break;
    case "medium":
      t.shaftHeight = 16;
      break;
    case "low":
      t.shaftHeight = 14;
      break;
  }

  if (intent.silhouette.footprint === "narrow") {
    t.footprintWidth = 5;
    t.footprintDepth = 5;
  } else if (intent.silhouette.footprint === "medium") {
    t.footprintWidth = 6;
    t.footprintDepth = 6;
  } else if (intent.silhouette.footprint === "wide") {
    t.footprintWidth = 7;
    t.footprintDepth = 7;
  }

  if (intent.silhouette.base === "slightly_wider") {
    t.basePad = 1;
    t.baseHeight = 2;
  } else if (intent.silhouette.base === "much_wider") {
    t.basePad = 2;
    t.baseHeight = 2;
  } else {
    t.basePad = 0;
    t.baseHeight = 2;
  }

  if (intent.silhouette.footprintShape === "octagonal") {
    t.footprintShape = "octagonal";
  } else if (intent.silhouette.footprintShape === "circular_approx") {
    t.footprintShape = "circular_approx";
  } else {
    t.footprintShape = "square";
  }

  if (intent.silhouette.top === "stepped_crown") {
    t.crownStyle = "stepped";
    t.crownHeight = 4;
  } else if (intent.silhouette.top === "dark_cap") {
    t.crownStyle = "dark_cap";
    t.crownHeight = 3;
  } else {
    t.crownStyle = "flat_cap";
    t.crownHeight = 2;
  }

  if (intent.facade.windowPattern === "vertical_bands" || intent.facade.windowPattern === "regular_rows") {
    t.windowRows = 4;
  } else if (intent.facade.windowPattern === "few") {
    t.windowRows = 2;
  } else if (intent.facade.windowPattern === "narrow_openings") {
    t.windowRows = 5;
    t.windowsPerRow = 1;
  }

  if (intent.facade.windowTreatment !== "unknown") {
    t.windowTreatment = intent.facade.windowTreatment;
  }

  const blueprint: LandmarkTowerBlueprint = {
    ...bp,
    metadata: {
      name: "Landmark tower",
      description: intent.rationaleSummary,
    },
    materials: mapping.materials,
    tower: t,
  };

  return { blueprint, mapping };
}
