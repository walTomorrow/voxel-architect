import { LANDMARK_TOWER_DEFAULT_INTENT } from "@/src/lib/builder/reference/landmarkTowerDefaults";
import { isLandmarkTowerRequest } from "@/src/lib/builder/reference/isLandmarkTowerRequest";
import type { ReferenceBuildIntent } from "@/src/lib/builder/reference/referenceBuildIntentTypes";

export function inferReferenceBuildIntentFromText(
  text: string,
  options?: { hasImage?: boolean },
): ReferenceBuildIntent | null {
  if (!isLandmarkTowerRequest(text)) return null;

  const lower = text.toLowerCase();
  let intent: ReferenceBuildIntent = {
    ...LANDMARK_TOWER_DEFAULT_INTENT,
    source: options?.hasImage ? "text_and_image" : "text",
    styleTags: [...LANDMARK_TOWER_DEFAULT_INTENT.styleTags],
    notableFeatures: [...LANDMARK_TOWER_DEFAULT_INTENT.notableFeatures],
    colorPalette: {
      ...LANDMARK_TOWER_DEFAULT_INTENT.colorPalette,
      labels: [...LANDMARK_TOWER_DEFAULT_INTENT.colorPalette.labels],
    },
    materialRoles: { ...LANDMARK_TOWER_DEFAULT_INTENT.materialRoles },
    silhouette: { ...LANDMARK_TOWER_DEFAULT_INTENT.silhouette },
    facade: { ...LANDMARK_TOWER_DEFAULT_INTENT.facade },
    rationaleSummary: LANDMARK_TOWER_DEFAULT_INTENT.rationaleSummary,
  };

  if (/\bhoover\b|\bstanford\b/.test(lower)) {
    intent = {
      ...intent,
      styleTags: [...intent.styleTags, "campus", "stanford_inspiration"],
      notableFeatures: [...intent.notableFeatures, "campus landmark inspiration"],
      rationaleSummary:
        "Formal campus landmark tower inspired by the reference (approximate, not exact).",
    };
  }

  if (/\b(octagonal|round|circular)\b/.test(lower)) {
    intent = {
      ...intent,
      silhouette: {
        ...intent.silhouette,
        footprintShape: /\bround|circular\b/.test(lower) ? "circular_approx" : "octagonal",
      },
    };
  }

  if (/\bvery\s+tall\b/.test(lower)) {
    intent = { ...intent, silhouette: { ...intent.silhouette, verticality: "very_tall" } };
  } else if (/\btall\b/.test(lower)) {
    intent = { ...intent, silhouette: { ...intent.silhouette, verticality: "tall" } };
  }

  if (/\b(sandstone|warm tan|warm stone)\b/.test(lower)) {
    intent = {
      ...intent,
      materialRoles: { ...intent.materialRoles, wall: "sandstone", base: "sandstone" },
      colorPalette: {
        labels: ["warm_tan", "sandstone"],
        summary: "warm sandstone walls",
      },
    };
  }

  if (/\b(dark cap|dark crown|dark top|charcoal)\b/.test(lower)) {
    intent = {
      ...intent,
      materialRoles: { ...intent.materialRoles, cap: "dark_cap" },
      colorPalette: {
        ...intent.colorPalette,
        labels: [...intent.colorPalette.labels, "dark_gray"],
        summary: intent.colorPalette.summary ?? "dark crown",
      },
    };
  }

  if (/\bglass\s+pane\b/.test(lower)) {
    intent = { ...intent, facade: { ...intent.facade, windowTreatment: "glass_pane" } };
  } else if (/\bglass\s+block\b/.test(lower)) {
    intent = { ...intent, facade: { ...intent.facade, windowTreatment: "glass_block" } };
  } else if (/\bopen\s+windows?\b/.test(lower)) {
    intent = { ...intent, facade: { ...intent.facade, windowTreatment: "open" } };
  }

  return intent;
}
