import type { ClassicMaterialKey } from "@/src/lib/blueprints/types";
import type { LandmarkTowerMaterials } from "@/src/lib/blueprints/types/landmarkTower";
import type {
  ColorLabel,
  MaterialRoleHint,
  ReferenceBuildIntent,
} from "@/src/lib/builder/reference/referenceBuildIntentTypes";

export type MaterialRoleMapping = {
  readonly materials: LandmarkTowerMaterials;
  readonly mappingSummary: readonly string[];
};

const WALL_BY_HINT: Readonly<Partial<Record<MaterialRoleHint | ColorLabel, ClassicMaterialKey>>> = {
  sandstone: "limestone_bricks",
  warm_stone: "limestone_bricks",
  light_stone: "limestone_bricks",
  warm_tan: "limestone_bricks",
  pale_stone: "limestone",
  cream: "limestone",
  gray_stone: "cobblestone",
  gray: "cobblestone",
  brick: "mud_bricks",
};

const CAP_BY_HINT: Readonly<Partial<Record<MaterialRoleHint | ColorLabel, ClassicMaterialKey>>> = {
  dark_cap: "slate_tiles",
  dark_stone: "slate_tiles",
  charcoal: "slate_tiles",
  dark_gray: "slate_tiles",
  black: "andesite",
  red_tile: "slate_tiles",
};

const ACCENT_BY_HINT: Readonly<Partial<Record<MaterialRoleHint | ColorLabel, ClassicMaterialKey>>> = {
  pale_accent: "limestone",
  pale_stone: "limestone",
  cream: "limestone",
  white: "limestone",
};

const DEFAULTS: LandmarkTowerMaterials = {
  wall: "limestone_bricks",
  cap: "slate_tiles",
  accent: "limestone",
  base: "limestone_bricks",
  window: "glass",
};

function pickMaterial(
  table: Readonly<Partial<Record<MaterialRoleHint | ColorLabel, ClassicMaterialKey>>>,
  hints: readonly (MaterialRoleHint | ColorLabel)[],
  fallback: ClassicMaterialKey,
): ClassicMaterialKey {
  for (const h of hints) {
    if (h === "unknown") continue;
    const m = table[h];
    if (m) return m;
  }
  return fallback;
}

function labelPhrase(material: ClassicMaterialKey, role: string, cues: string[]): string | null {
  if (cues.length === 0) return null;
  return `${cues.join("/")} → ${material} for ${role}`;
}

function parseTextColorCues(text: string): {
  wall: MaterialRoleHint[];
  cap: MaterialRoleHint[];
  labels: ColorLabel[];
} {
  const lower = text.toLowerCase();
  const wall: MaterialRoleHint[] = [];
  const cap: MaterialRoleHint[] = [];
  const labels: ColorLabel[] = [];

  if (/\b(sandstone|warm tan|warmer tan|warm stone)\b/.test(lower)) {
    wall.push("sandstone", "warm_stone");
    labels.push("warm_tan", "sandstone");
  }
  if (/\b(lighter walls?|light stone|pale stone|cream)\b/.test(lower)) {
    wall.push("light_stone", "pale_accent");
    labels.push("light_stone", "pale_stone");
  }
  if (/\b(gray stone|grey stone|cobblestone)\b/.test(lower)) {
    wall.push("gray_stone");
    labels.push("gray");
  }
  if (
    /\b(dark(?:er)?\s+(?:cap|crown|top)|(?:cap|crown|top)\s+dark(?:er)?|charcoal|dark gr[ae]y)\b/.test(
      lower,
    )
  ) {
    cap.push("dark_cap", "dark_stone");
    labels.push("charcoal", "dark_gray");
  }
  if (/\b(match(?:ing)?\s+(?:the\s+)?colors?|color palette|palette)\b/.test(lower)) {
    labels.push("warm_tan", "dark_gray");
  }

  return { wall, cap, labels };
}

export function mapColorPaletteIntent(
  intent: ReferenceBuildIntent,
  userText?: string,
): MaterialRoleMapping {
  const textCues = userText ? parseTextColorCues(userText) : { wall: [], cap: [], labels: [] };

  const wallHints = [
    intent.materialRoles.wall,
    ...textCues.wall,
    ...intent.colorPalette.labels,
  ];
  const capHints = [
    intent.materialRoles.cap,
    ...textCues.cap,
    ...intent.colorPalette.labels.filter((l) =>
      ["charcoal", "dark_gray", "black"].includes(l),
    ),
  ];
  const accentHints = [intent.materialRoles.accent, ...intent.colorPalette.labels];
  const baseHints = [intent.materialRoles.base, intent.materialRoles.wall, ...wallHints];
  const windowHints = [intent.materialRoles.window];

  const wall = pickMaterial(WALL_BY_HINT, wallHints, DEFAULTS.wall);
  const cap = pickMaterial(CAP_BY_HINT, capHints, DEFAULTS.cap);
  const accent = pickMaterial(ACCENT_BY_HINT, accentHints, DEFAULTS.accent);
  const base = pickMaterial(WALL_BY_HINT, baseHints, wall);
  const window = intent.materialRoles.window === "glass" ? "glass" : DEFAULTS.window;

  const mappingSummary: string[] = [];
  const wallCue = textCues.wall[0] ?? intent.materialRoles.wall;
  const capCue = textCues.cap[0] ?? intent.materialRoles.cap;
  const wallLine = labelPhrase(wall, "walls", wallCue !== "unknown" ? [wallCue] : ["warm stone"]);
  const capLine = labelPhrase(cap, "crown", capCue !== "unknown" ? [capCue] : ["dark cap"]);
  const accentLine = labelPhrase(accent, "accents", ["pale stone"]);
  if (wallLine) mappingSummary.push(wallLine);
  if (capLine) mappingSummary.push(capLine);
  if (accentLine && accent !== wall) mappingSummary.push(accentLine);

  return {
    materials: { wall, cap, accent, base, window },
    mappingSummary,
  };
}

export function mapColorPaletteFromText(text: string): MaterialRoleMapping {
  return mapColorPaletteIntent(
    {
      source: "text",
      confidence: "medium",
      buildingFamily: "landmark_tower",
      styleTags: [],
      colorPalette: { labels: parseTextColorCues(text).labels },
      materialRoles: {
        wall: "unknown",
        cap: "unknown",
        accent: "unknown",
        base: "unknown",
        window: "glass",
      },
      silhouette: {
        verticality: "tall",
        footprint: "narrow",
        footprintShape: "unknown",
        base: "slightly_wider",
        top: "dark_cap",
      },
      facade: { windowPattern: "unknown", windowTreatment: "unknown" },
      notableFeatures: [],
      rationaleSummary: "Palette from refinement text.",
    },
    text,
  );
}
