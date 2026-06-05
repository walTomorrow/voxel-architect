import type { SemanticBuildSummaryForPlanner } from "@/src/lib/builder/semantic/getSemanticBuildSummaryForPlanner";
import type { RichBlueprintAffordancesForPlanner } from "@/src/lib/builder/semantic/richAffordances";

export type StyleIntentId =
  | "welcoming"
  | "rustic"
  | "sturdy"
  | "bright"
  | "medieval"
  | "refined";

export type StyleGuidanceFilterContext = {
  readonly summary: SemanticBuildSummaryForPlanner;
  readonly rich: RichBlueprintAffordancesForPlanner;
};

type GuidanceLine = {
  readonly text: string;
  readonly omitWhen?: (ctx: StyleGuidanceFilterContext) => boolean;
};

export type StyleIntentHint = {
  readonly id: StyleIntentId;
  readonly triggers: readonly RegExp[];
  readonly lines: readonly GuidanceLine[];
};

function hasPorch(ctx: StyleGuidanceFilterContext): boolean {
  return !ctx.summary.featureSummary.some((f) => f.startsWith("no porch"));
}

function hasChimney(ctx: StyleGuidanceFilterContext): boolean {
  return !ctx.summary.featureSummary.some((f) => f === "no chimney");
}

function porchCanWiden(ctx: StyleGuidanceFilterContext): boolean {
  return ctx.rich.porchRich.widen.available;
}

function porchCanAdd(ctx: StyleGuidanceFilterContext): boolean {
  return ctx.rich.porchRich.add.available;
}

function chimneyCanAdd(ctx: StyleGuidanceFilterContext): boolean {
  return ctx.rich.chimneyRich.add.available;
}

function nonCrowdedWindowFaces(ctx: StyleGuidanceFilterContext): string[] {
  return ctx.summary.windowsBySurface
    .filter((w) => w.maxSlots > 0 && !w.atCapacity && (!w.groupId || w.count < w.maxSlots))
    .map((w) => w.face);
}

function emptyWindowFaces(ctx: StyleGuidanceFilterContext): string[] {
  return ctx.summary.windowsBySurface
    .filter((w) => !w.groupId && w.maxSlots > 0)
    .map((w) => w.face);
}

function paletteIncludes(ctx: StyleGuidanceFilterContext, material: string): boolean {
  return ctx.summary.materialSummary.includes(material);
}

export const STYLE_INTENT_HINTS: readonly StyleIntentHint[] = [
  {
    id: "welcoming",
    triggers: [/\bwelcoming\b/i, /\bcozy entrance\b/i, /\bmore inviting\b/i, /\binviting\b/i],
    lines: [
      {
        text: "Add a front porch if absent — strong welcoming cue.",
        omitWhen: (ctx) => !porchCanAdd(ctx),
      },
      {
        text: "Widen porch to full_facade if porch is door_only.",
        omitWhen: (ctx) => !porchCanWiden(ctx),
      },
      {
        text: "Warm palette: oak_planks on walls/door/accent.",
      },
      {
        text: "Moderate side/back windows only if faces have capacity — windows are not the only solution.",
        omitWhen: (ctx) =>
          nonCrowdedWindowFaces(ctx).filter((f) => f !== "front").length === 0,
      },
      {
        text: "Do not increase front window count when frontWindowsAtCapacity.",
        omitWhen: (ctx) => !ctx.rich.frontWindowsAtCapacity,
      },
    ],
  },
  {
    id: "rustic",
    triggers: [/\brustic\b/i, /\bcountry\b/i, /\bcottage-like\b/i, /\bmore rustic\b/i],
    lines: [
      {
        text: "Shift palette toward cobblestone walls and oak_planks accents; slate_tiles or dark roof helps.",
        omitWhen: (ctx) =>
          paletteIncludes(ctx, "cobblestone") && paletteIncludes(ctx, "slate_tiles"),
      },
      {
        text: "Add chimney if absent — strong rustic affordance.",
        omitWhen: (ctx) => !chimneyCanAdd(ctx),
      },
      {
        text: "Add or widen porch if absent or narrow.",
        omitWhen: (ctx) => !porchCanAdd(ctx) && !porchCanWiden(ctx),
      },
      {
        text: "Avoid adding more front windows; prefer chimney, palette, or porch over front glass.",
        omitWhen: (ctx) => emptyWindowFaces(ctx).includes("front"),
      },
    ],
  },
  {
    id: "sturdy",
    triggers: [/\bsturd(y|ier)\b/i, /\bstocky\b/i, /\bheavy\b/i, /\butilitarian\b/i],
    lines: [
      {
        text: "Stone-heavy palette: cobblestone or limestone_bricks walls.",
        omitWhen: (ctx) =>
          paletteIncludes(ctx, "cobblestone") || paletteIncludes(ctx, "limestone_bricks"),
      },
      {
        text: "Add chimney if absent.",
        omitWhen: (ctx) => !chimneyCanAdd(ctx),
      },
      {
        text: "Avoid large window increases — keep a solid, less glass-heavy look.",
      },
      {
        text: "Do not change room width/depth/height unless the user explicitly asked for size or proportions.",
      },
    ],
  },
  {
    id: "bright",
    triggers: [/\bbright(er)?\b/i, /\blight(er)?\b/i, /\bmore open\b/i],
    lines: [
      {
        text: "Prefer lighter walls first (limestone_bricks, limestone accent) before adding windows.",
        omitWhen: (ctx) => paletteIncludes(ctx, "limestone_bricks"),
      },
      {
        text: "Set window material to glass in palette if not already.",
        omitWhen: (ctx) => paletteIncludes(ctx, "glass"),
      },
      {
        text: "Add windows only on non-crowded faces with capacity (not every face).",
        omitWhen: (ctx) => nonCrowdedWindowFaces(ctx).length === 0,
      },
      {
        text: "Use side/back faces when front is at capacity.",
        omitWhen: (ctx) => !ctx.rich.frontWindowsAtCapacity,
      },
      {
        text: "Do not remove porch, chimney, or window groups for a bright request.",
      },
    ],
  },
  {
    id: "medieval",
    triggers: [/\bmedieval\b/i, /\bcastle\b/i, /\bold[- ]world\b/i, /\bmore medieval\b/i],
    lines: [
      {
        text: "Stone walls (cobblestone) and slate_tiles roof.",
        omitWhen: (ctx) =>
          paletteIncludes(ctx, "cobblestone") && paletteIncludes(ctx, "slate_tiles"),
      },
      {
        text: "Add chimney if absent.",
        omitWhen: (ctx) => !chimneyCanAdd(ctx),
      },
      {
        text: "Keep window counts moderate — smaller/moderate groups, not maxed façades.",
      },
      {
        text: "Avoid bright/refined-only palette (limestone-heavy without stone contrast).",
        omitWhen: (ctx) => !ctx.summary.styleDescriptors.includes("refined"),
      },
      {
        text: "Avoid full_facade porch unless user mentions grand entrance.",
      },
    ],
  },
  {
    id: "refined",
    triggers: [/\brefined\b/i, /\belegant\b/i, /\bformal\b/i, /\bclean(er)?\b/i, /\bmore refined\b/i],
    lines: [
      {
        text: "Limestone_bricks or pale limestone walls; slate or pale roof tones.",
        omitWhen: (ctx) => paletteIncludes(ctx, "limestone_bricks"),
      },
      {
        text: "Prefer symmetric, moderate front windows — do not max out every face.",
      },
      {
        text: "Avoid rustic cobblestone-heavy palette unless mixing styles intentionally.",
        omitWhen: (ctx) => !paletteIncludes(ctx, "cobblestone"),
      },
      {
        text: "Do not add rugged chimney + porch + many windows in one plan — pick 1–2 refined tweaks.",
      },
    ],
  },
];

const MAX_LINES_PER_INTENT = 6;

function isWindowTreatmentBrightRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(window|windows|glass)\b/.test(lower) &&
    /\b(bright|brighter|lighter|light)\b/.test(lower) &&
    !/\b(entire|whole)\s+(building|house|workshop)\b/.test(lower) &&
    !/\bmore\s+(welcoming|rustic|medieval|refined|sturdy)\b/.test(lower)
  );
}

export function detectStyleIntents(userPrompt: string): readonly StyleIntentId[] {
  const text = userPrompt.trim();
  if (text.length === 0) return [];
  const skipBright = isWindowTreatmentBrightRequest(text);
  const found: StyleIntentId[] = [];
  for (const hint of STYLE_INTENT_HINTS) {
    if (skipBright && hint.id === "bright") continue;
    if (hint.triggers.some((re) => re.test(text))) {
      found.push(hint.id);
    }
  }
  return found;
}

export function filterStyleGuidanceForPlanner(
  intents: readonly StyleIntentId[],
  ctx: StyleGuidanceFilterContext,
): Partial<Record<StyleIntentId, readonly string[]>> {
  const out: Partial<Record<StyleIntentId, string[]>> = {};
  for (const id of intents) {
    const hint = STYLE_INTENT_HINTS.find((h) => h.id === id);
    if (!hint) continue;
    const lines = hint.lines
      .filter((line) => !(line.omitWhen?.(ctx) ?? false))
      .map((line) => line.text)
      .slice(0, MAX_LINES_PER_INTENT);
    if (lines.length > 0) out[id] = lines;
  }
  return out;
}

/** Minimal gap hints (0–2 lines) — not a full deficit engine. */
export function buildStyleGapHints(
  intents: readonly StyleIntentId[],
  summary: SemanticBuildSummaryForPlanner,
): readonly string[] {
  const hints: string[] = [];
  const tags = new Set(summary.styleDescriptors);

  if (intents.includes("rustic") && tags.has("refined") && !tags.has("rustic")) {
    hints.push("Palette reads refined; rustic request may need warmer/stone materials.");
  }
  if (intents.includes("refined") && tags.has("rustic") && !tags.has("refined")) {
    hints.push("Palette reads rustic; refined request may need cleaner/paler materials.");
  }
  if (intents.includes("bright") && tags.has("dark") && !tags.has("bright")) {
    hints.push("Palette is dark-heavy; brighten walls before adding many windows.");
  }
  if (intents.includes("medieval") && tags.has("bright") && !tags.has("medieval")) {
    hints.push("Palette is bright; medieval cue may need stone + darker roof.");
  }

  return hints.slice(0, 2);
}

export function renderAestheticRestraintForStylePrompt(
  intents: readonly StyleIntentId[],
): string {
  if (intents.length === 0) return "";
  return [
    "Aesthetic restraint (style edit):",
    "- Prefer 1–3 tasteful operations that match the requested style.",
    "- Do not remove porch, chimney, or window groups unless the user explicitly asked.",
    "- Do not max out window counts on every face; add windows only where affordances show capacity.",
    "- Do not add duplicate porch or chimney.",
    "- Do not change room width/depth/height unless the user explicitly asked for size or proportions.",
    "- Style guidance below is advisory; skip lines that contradict affordances or already-present summary cues.",
    "- Every operation must be allowed by affordances and the allowed-operation schema.",
  ].join("\n");
}

export function renderStyleIntentGuidanceForPlanner(
  intents: readonly StyleIntentId[],
  ctx?: StyleGuidanceFilterContext,
): string {
  if (intents.length === 0) return "";

  const filtered: Partial<Record<StyleIntentId, readonly string[]>> = ctx
    ? filterStyleGuidanceForPlanner(intents, ctx)
    : Object.fromEntries(
        intents.map((id) => {
          const hint = STYLE_INTENT_HINTS.find((h) => h.id === id);
          return [id, hint?.lines.map((l) => l.text).slice(0, MAX_LINES_PER_INTENT) ?? []];
        }),
      );

  const gapHints = ctx ? buildStyleGapHints(intents, ctx.summary) : [];

  const lines: string[] = ["Style intent guidance (filtered for this build):"];
  for (const id of intents) {
    const guidanceLines = filtered[id];
    if (!guidanceLines || guidanceLines.length === 0) continue;
    lines.push(`- ${id}:`);
    for (const g of guidanceLines) {
      lines.push(`  - ${g}`);
    }
  }
  if (gapHints.length > 0) {
    lines.push("- style gaps:");
    for (const h of gapHints) {
      lines.push(`  - ${h}`);
    }
  }
  if (lines.length === 1) return "";
  return lines.join("\n");
}
