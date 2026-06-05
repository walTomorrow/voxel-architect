export type StyleIntentId =
  | "welcoming"
  | "rustic"
  | "sturdy"
  | "bright"
  | "medieval"
  | "refined";

export type StyleIntentHint = {
  readonly id: StyleIntentId;
  readonly triggers: readonly RegExp[];
  readonly guidance: readonly string[];
};

export const STYLE_INTENT_HINTS: readonly StyleIntentHint[] = [
  {
    id: "welcoming",
    triggers: [/\bwelcoming\b/i, /\bcozy entrance\b/i, /\bmore inviting\b/i],
    guidance: [
      "Prefer: add porch (if absent), widen porch (door_only→full_facade), warm palette (oak_planks walls/door).",
      "If front windows at capacity, add side/back window_group instead of increasing front count.",
    ],
  },
  {
    id: "rustic",
    triggers: [/\brustic\b/i, /\bcountry\b/i, /\bcottage-like\b/i],
    guidance: [
      "Prefer: cobblestone or oak_planks palette, chimney if absent, pitched roof.",
      "Avoid overly refined limestone-only palette unless user asks for contrast.",
    ],
  },
  {
    id: "sturdy",
    triggers: [/\bsturd(y|ier)\b/i, /\bstocky\b/i, /\bheavy\b/i, /\butilitarian\b/i],
    guidance: [
      "Prefer: stone-heavy walls (cobblestone, limestone_bricks), chimney, compact/wide proportions via room patch only if asked.",
      "Do not shrink windows drastically unless requested.",
    ],
  },
  {
    id: "bright",
    triggers: [/\bbright(er)?\b/i, /\blight(er)?\b/i, /\bmore open\b/i],
    guidance: [
      "Prefer: glass window material, lighter walls (limestone_bricks), add/increase windows on surfaces with capacity.",
      "Use side windows when front is at capacity.",
    ],
  },
  {
    id: "medieval",
    triggers: [/\bmedieval\b/i, /\bcastle\b/i, /\bold[- ]world\b/i],
    guidance: [
      "Prefer: stone walls, slate_tiles roof, chimney, moderate window counts.",
      "Avoid full_facade porch unless user mentions grand entrance.",
    ],
  },
  {
    id: "refined",
    triggers: [/\brefined\b/i, /\belegant\b/i, /\bformal\b/i, /\bclean(er)?\b/i],
    guidance: [
      "Prefer: limestone_bricks walls, symmetric front windows, slate or pale roof tones.",
      "Avoid rustic cobblestone-heavy palette unless mixed intentionally.",
    ],
  },
];

export function detectStyleIntents(userPrompt: string): readonly StyleIntentId[] {
  const text = userPrompt.trim();
  if (text.length === 0) return [];
  const found: StyleIntentId[] = [];
  for (const hint of STYLE_INTENT_HINTS) {
    if (hint.triggers.some((re) => re.test(text))) {
      found.push(hint.id);
    }
  }
  return found;
}

export function renderStyleIntentGuidanceForPlanner(
  intents: readonly StyleIntentId[],
): string {
  if (intents.length === 0) return "";
  const lines: string[] = ["Style intent guidance (use affordances above):"];
  for (const id of intents) {
    const hint = STYLE_INTENT_HINTS.find((h) => h.id === id);
    if (!hint) continue;
    lines.push(`- ${id}:`);
    for (const g of hint.guidance) {
      lines.push(`  - ${g}`);
    }
  }
  return lines.join("\n");
}
