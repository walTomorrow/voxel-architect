import type { ReferenceBuildIntent } from "@/src/lib/builder/reference/referenceBuildIntentTypes";

/** Generic landmark tower fallback — suitable for Hoover demo and unknown references. */
export const LANDMARK_TOWER_DEFAULT_INTENT: ReferenceBuildIntent = {
  source: "text",
  confidence: "medium",
  buildingFamily: "landmark_tower",
  styleTags: ["formal", "historic", "landmark", "campus"],
  colorPalette: {
    labels: ["warm_tan", "dark_gray"],
    summary: "warm tan walls with dark crown",
  },
  materialRoles: {
    wall: "sandstone",
    cap: "dark_cap",
    accent: "pale_accent",
    base: "sandstone",
    window: "glass",
  },
  silhouette: {
    verticality: "very_tall",
    footprint: "narrow",
    footprintShape: "square",
    base: "slightly_wider",
    top: "dark_cap",
  },
  facade: {
    windowPattern: "vertical_bands",
    windowTreatment: "open",
  },
  notableFeatures: ["tall shaft", "light stone walls", "dark crown", "vertical openings"],
  rationaleSummary: "Generic formal landmark tower with warm stone walls and dark cap.",
};
