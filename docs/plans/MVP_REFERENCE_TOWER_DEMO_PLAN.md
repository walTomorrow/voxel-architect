# PLAN: MVP Reference Tower Demo

**Branch:** `feature/mvp-reference-tower-demo`  
**Status:** Planning only — no implementation until review.  
**Time budget:** ~2 hours to demoable video.  
**Goal:** Ship **generic landmark-tower capability** — `ReferenceBuildIntent` → `LandmarkTowerBlueprint` → deterministic generation → tower refinements — with Hoover Tower as the **demo example**, not a hidden one-off renderer.

**Core pipeline (all paths):**

```
extract or infer ReferenceBuildIntent
  → mapColorPaletteIntent (material roles)
  → mapReferenceBuildIntentToTowerBlueprint
  → validateLandmarkTowerBlueprint
  → generateLandmarkTower (deterministic)
  → refine via tower operations
```

Hoover Tower images/phrases are **triggers and a demo script**, not a separate code path.

---

## 1. Current capabilities relevant to the demo

### Builder chat: text and image attachments

| Area | File / function | Current behavior |
|------|-----------------|------------------|
| API route | `src/app/api/builder/chat/route.ts` — `POST` | Parses body via `parseBuilderChatRequestBody` (`validateChatRequest.ts`). Routes: refinement → generation → stream chat → sync vision chat. |
| Image validation | `validateChatRequest.ts` | One image per turn: `user_reference`, PNG/JPEG/WebP, max 4 MB. |
| Client upload | `BuilderPromptInput.tsx`, `BuilderClient.tsx` | Base64 in POST; image-only default text: `"Please interpret this reference image for building intent."` |
| Tool orchestration | `runBuilderChatTurn.ts` | Post-tool narration via `callWorkersAiChat(augmented, attachment)`. |

**Image + generation:** `shouldRunGenerationTool` requires build verbs; tool uses **text only** — images do not affect preset or blueprint today.

### Vision / Workers AI

| Area | File / function | Current behavior |
|------|-----------------|------------------|
| Chat vision | `callWorkersAiChat.ts` | `@cf/meta/llama-3.2-11b-vision-instruct`; `body.image` data URL; sync when image present. |
| JSON planner | `callWorkersAiJsonPlanner.ts` | Text-only; no image field. |
| Material style tags | `materialStyleDescriptors.ts` | Maps classic keys → style tags (`limestone_bricks` → pale/formal; `slate_tiles` → dark/roof-like). Reusable for color-label → material mapping. |

**Gap:** No vision → structured intent → blueprint pipeline. No tower `structureType`. No color palette intent layer for landmark towers.

### Generation and v2 limits (why we need `landmark_tower`)

| Area | Current state | Tower demo impact |
|------|---------------|-------------------|
| `resolvePresetFromPrompt.ts` | `"tower"` → `simple_cabin_v2` | Must add landmark tower routing |
| `GenericBuildingBlueprintV2` | Single room, `wallHeight` **4–9** | **Not acceptable as primary tower path** |
| `generateStructure.ts` | v2 compile/emit only for `generic_building` | Needs `landmark_tower` branch |
| Materials | Palette slots on v2; classic keys in validator | Tower uses role-based `wall` / `cap` / `accent` / `window` / `base` |

### Refinement today

- v2: `window_det`, deterministic mapper, semantic LLM planner — all target `generic_building`.
- Tower refinements need a **parallel deterministic tower operation path** (`setTowerMaterials`, `updateTowerParams`).
- Existing `setMaterialPalette` patterns in `mapRefinementPromptToOperations.ts` inform tower material refine phrasing but do not apply to tower schema directly.

### Deployment

Cloudflare Workers + OpenNext; Workers AI env vars. Gate: `tsc`, `test:generator`, `build`.

---

## 2. Demo target and definition of success

### Capability target (generic)

The branch adds **landmark tower generation and refinement** for any reference that reads as a tall formal tower — campus bell tower, sandstone landmark, round/octagonal tower silhouette, etc.

**Hoover Tower** is the scripted demo example (upload + “build something like this”), not a bespoke renderer.

### Visual target (approximate)

- Tall narrow vertical silhouette (**shaft ~18–24 blocks**; **total ~23–30** with base + crown)
- Slightly wider base / plinth
- Light tan / sandstone-like walls (mapped from palette intent)
- Darker top / cap / crown
- Repeating vertical window rows or narrow openings
- Optional **rounded/octagonal** footprint (corner-cut square)
- Formal / historic / campus cues

### Demo success criteria

1. User uploads reference image(s) and asks to build something like them **or** names a landmark/campus tower.
2. System runs the **generic pipeline**: intent → palette mapping → `LandmarkTowerBlueprint` → validate → generate.
3. Render is a **recognizable landmark tower**, not a cabin or 9-block v2 room.
4. Assistant says **approximate landmark tower inspired by the reference** — never exact reconstruction or Hoover-specific claims unless user named it as inspiration.
5. User can refine **height, color palette / materials, cap, windows, base, footprint shape**.
6. Assistant reports **concise material mapping** when colors/palette are requested (no exact color matching).
7. All changes stay in validate → generate; no LLM voxel placement.

### Non-success (acceptable)

- Exact Hoover proportions, window spacing, or color fidelity
- Perfect circular geometry
- Interiors, multi-building scenes

---

## 3. Reference understanding (`ReferenceBuildIntent`)

### Schema (revised)

```ts
type ColorLabel =
  | "warm_tan" | "sandstone" | "pale_stone" | "light_stone" | "cream"
  | "gray" | "charcoal" | "dark_gray" | "black" | "brown" | "red_tile"
  | "white" | "unknown";

type MaterialRoleHint =
  | "light_stone" | "sandstone" | "warm_stone" | "gray_stone" | "dark_stone"
  | "brick" | "wood" | "dark_cap" | "pale_accent" | "glass" | "unknown";

type ReferenceBuildIntent = {
  source: "text" | "image" | "text_and_image";
  confidence: "low" | "medium" | "high";
  buildingFamily: "landmark_tower" | "generic_building" | "unknown";

  styleTags: string[]; // e.g. formal, historic, campus, landmark

  /** Constrained color language — not hex, not exact match */
  colorPalette: {
    labels: ColorLabel[];
    summary?: string; // "warm tan walls, dark gray crown"
  };

  /** Semantic material cues per blueprint role */
  materialRoles: {
    wall: MaterialRoleHint;
    cap: MaterialRoleHint;
    accent: MaterialRoleHint;
    base: MaterialRoleHint;
    window: MaterialRoleHint;
  };

  silhouette: {
    verticality: "low" | "medium" | "tall" | "very_tall";
    footprint: "narrow" | "medium" | "wide";
    footprintShape: "square" | "octagonal" | "circular_approx" | "unknown";
    base: "same_width" | "slightly_wider" | "much_wider";
    top: "flat" | "dark_cap" | "stepped_crown" | "roofed_crown";
  };

  facade: {
    windowPattern: "few" | "regular_rows" | "vertical_bands" | "narrow_openings" | "unknown";
    windowTreatment: "glass_block" | "glass_pane" | "open" | "unknown";
  };

  notableFeatures: string[];
  rationaleSummary: string;
};
```

**Rules:** Model outputs this schema only — never voxels, never full blueprint JSON, never coordinates.

### Extraction options

| Option | Description | Pros | Cons | Risk | Time |
|--------|-------------|------|------|------|------|
| **A** | Text-only keyword inference | Fast; deterministic | Weak image story | Low | 15–30 min |
| **B** | Vision → `ReferenceBuildIntent` JSON | Strong reference narrative | Model variance | Medium | 45–60 min |
| **C** | Vision chat → parse description | Reuses chat | Fragile | High | 40–50 min |
| **D** | Hybrid: infer from text; vision if image + build; else `LANDMARK_TOWER_DEFAULT_INTENT` | Best balance | More branches | Low–medium | 50–70 min |

### Recommendation: **Option D**

```
User message + optional image
  → isLandmarkTowerRequest(text)?  // tower / landmark / campus / hoover / build-like-this + image
  → if image + build verbs:
        try extractReferenceBuildIntent(image, text)   // vision JSON
     else:
        inferReferenceBuildIntentFromText(text)        // keyword + color phrases
  → on failure / low confidence:
        LANDMARK_TOWER_DEFAULT_INTENT                  // generic landmark default, NOT hoover-only renderer
  → mapColorPaletteIntent(intent) → MaterialRoleMapping
  → mapReferenceBuildIntentToTowerBlueprint(intent, mapping)
  → validate → generate
```

**Files:** `reference/referenceBuildIntentTypes.ts`, `inferReferenceBuildIntentFromText.ts`, `extractReferenceBuildIntent.ts`, `mapColorPaletteIntent.ts`.

### Fallback intent (demo reliability only)

`LANDMARK_TOWER_DEFAULT_INTENT` is a **generic landmark tower default** — suitable for Hoover demo, campus towers, or unknown references. It is **not** a separate generation path:

```ts
const LANDMARK_TOWER_DEFAULT_INTENT: ReferenceBuildIntent = {
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
```

Hoover-specific tags may appear in `notableFeatures` / user text when the user names Hoover; the **mapper and emitter stay generic**.

---

## 4. Color palette / material mapping (REQUIRED)

### `ColorPaletteIntent` and mapping step

**New types:**

```ts
type TowerMaterialRole = "wall" | "cap" | "accent" | "base" | "window";

type MaterialRoleMapping = {
  readonly wall: ClassicMaterialKey;
  readonly cap: ClassicMaterialKey;
  readonly accent: ClassicMaterialKey;
  readonly base: ClassicMaterialKey;
  readonly window: ClassicMaterialKey;
  /** Human-readable mapping for assistant summary */
  readonly mappingSummary: readonly string[];
};
```

**New file:** `src/lib/builder/reference/mapColorPaletteIntent.ts`

**Inputs (any combination):**

- `ReferenceBuildIntent.colorPalette.labels`
- `ReferenceBuildIntent.materialRoles`
- User text phrases: `"match the colors"`, `"sandstone"`, `"warmer tan walls"`, `"dark gray top"`, `"use this color palette"`
- Optional vision-extracted color labels from image step

**Process (deterministic — no LLM for mapping):**

1. Merge role hints + color labels + regex text cues into normalized `ColorPaletteIntent`.
2. Map each **role** to nearest **classic material key** via a fixed lookup table.
3. Produce `mappingSummary` lines for tool result / assistant.

**Example mapping table (starter):**

| Color / role hint | Role | Classic material |
|-------------------|------|------------------|
| `warm_tan`, `sandstone`, `light_stone`, `warm_stone` | wall | `limestone_bricks` (fallback `limestone`) |
| `pale_stone`, `cream` | accent / base | `limestone` |
| `gray`, `gray_stone` | wall | `cobblestone` |
| `charcoal`, `dark_gray`, `dark_cap`, `black` | cap | `slate_tiles` (fallback `andesite`) |
| `dark_gray` (lighter) | cap | `andesite` |
| `red_tile` | cap | `slate_tiles` |
| `glass`, window role | window | `glass` |
| default base | base | same as wall or `limestone` |

**Example assistant / tool summary (required format):**

> I mapped warm sandstone to `limestone_bricks` for the walls, dark charcoal to `slate_tiles` for the crown, and pale stone to `limestone` for accents. This is an approximate palette, not an exact color match.

**Wording rules:**

- ✅ “mapped warm sandstone to limestone_bricks”
- ✅ “approximate palette inspired by the reference”
- ❌ “exact color match”, “matched the image colors precisely”, “sampled pixels”

**Integration:**

- Called from `mapReferenceBuildIntentToTowerBlueprint` on **generate**.
- Called from `mapTowerRefinementPrompt` on **refine** when palette/color phrases detected.
- `formatToolResultForModel.ts` includes `MATERIAL_MAPPING:` lines when present.

**Reuse:** Extend patterns from `materialStyleDescriptors.ts` and `mapRefinementPromptToOperations.ts` (`buildExplicitMaterialPalettePatch`) — adapted for tower roles.

---

## 5. `LandmarkTowerBlueprint` strategy

### Why not generic v2

| Issue | v2 generic | `landmark_tower` |
|-------|------------|------------------|
| Max height | `wallHeight` ≤ **9** | `shaftHeight` **12–24** (demo default **20**) |
| Total height | ~12 with roof | **23–30** (base + shaft + crown) |
| Base vs shaft | Single box | `basePad`, `baseHeight` |
| Footprint shape | Rectangle only | `square` / `octagonal` / `circular_approx` |
| Crown | gable/shed roof | `crownHeight`, `crownStyle` |

**Do not** ship a 9-block generic v2 room as the primary demo path. An emergency v2 preset is **explicitly deprioritized** below taller emitter + palette mapping.

### Recommended: `landmark_tower` structureType (Option B)

```ts
type TowerFootprintShape = "square" | "octagonal" | "circular_approx";
type TowerCrownStyle = "flat_cap" | "dark_cap" | "stepped" | "inset";

interface LandmarkTowerBlueprint {
  readonly structureType: "landmark_tower";
  readonly schemaVersion: 1;
  readonly metadata: { name: string; description?: string };

  readonly materials: {
    readonly wall: ClassicMaterialKey;
    readonly cap: ClassicMaterialKey;
    readonly accent: ClassicMaterialKey;
    readonly base: ClassicMaterialKey;
    readonly window: ClassicMaterialKey;
  };

  readonly constraints: {
    readonly maxBlockCount: number; // default 80_000
    readonly requireGroundedStructure: true;
  };

  readonly tower: {
    readonly footprintWidth: number;    // shaft 3–9
    readonly footprintDepth: number;    // shaft 3–9
    readonly footprintShape: TowerFootprintShape;

    readonly shaftHeight: number;       // 12–24 demo-worthy; default 20
    readonly basePad: number;           // 0–2 per side
    readonly baseHeight: number;        // 1–3

    readonly crownHeight: number;       // 1–5
    readonly crownStyle: TowerCrownStyle;

    readonly windowRows: number;         // 1–8 per face
    readonly windowsPerRow: number;      // 1–3
    readonly windowTreatment: "glass_block" | "glass_pane" | "open";

    readonly entrance: boolean;
  };
}
```

**Demo defaults (from `LANDMARK_TOWER_DEFAULT_INTENT` via mapper):**

| Field | Default |
|-------|---------|
| `footprintWidth/Depth` | 5 |
| `footprintShape` | `square` |
| `shaftHeight` | 20 |
| `basePad` | 1 |
| `baseHeight` | 2 |
| `crownHeight` | 3 |
| `crownStyle` | `dark_cap` |
| `windowRows` | 4 |
| **Approx total height** | 2 + 20 + 3 = **25** |

**Sample blueprint ID:** `landmark_tower_default` (generic name — not `hoover_tower_default`).

**Integration:**

- `validateBlueprint.ts`, `generateStructure.ts`, `builderToolTypes.ts` (`ActiveBuilderBlueprint` union)
- `generateBuildingPreview.ts` — landmark tower path when `buildingFamily === landmark_tower`

**No Hoover-only renderer.** One `generateLandmarkTower.ts` serves all intents.

---

## 6. Intent-to-blueprint mapping

**File:** `mapReferenceBuildIntentToTowerBlueprint.ts`  
**Depends on:** `mapColorPaletteIntent.ts`

| Intent field | Blueprint field |
|--------------|-----------------|
| `buildingFamily: landmark_tower` | proceed |
| `buildingFamily: unknown` + tower request context | proceed with defaults |
| `buildingFamily: generic_building` | do not use tower path |
| `verticality: very_tall` | `shaftHeight: 22–24` |
| `verticality: tall` | `shaftHeight: 18–20` |
| `verticality: medium` | `shaftHeight: 14–16` |
| `footprint: narrow` | 5×5 |
| `footprint: medium` | 6×6 |
| `footprintShape: octagonal` / `circular_approx` | set shape; emitter cuts corners |
| `footprintShape: unknown` | `square` |
| `base: slightly_wider` | `basePad: 1`, `baseHeight: 2` |
| `base: much_wider` | `basePad: 2`, `baseHeight: 2` |
| `top: dark_cap` | `crownStyle: dark_cap`, `crownHeight: 3` |
| `top: stepped_crown` | `crownStyle: stepped`, `crownHeight: 4` |
| `facade.windowPattern: vertical_bands` | `windowRows: 4–5` |
| `facade.windowPattern: few` | `windowRows: 2` |
| `facade.windowTreatment` | map directly; default `open` |
| `materialRoles` + `colorPalette` | via `mapColorPaletteIntent` → `materials.*` |

All values clamped in `validateLandmarkTowerBlueprint`.

---

## 7. Footprint shape rendering

**In `generateLandmarkTower.ts`:**

| Shape | MVP algorithm |
|-------|----------------|
| `square` | Fill full `width × depth` per Y layer |
| `octagonal` | Start from square; **cut corners** where both offsets from center exceed threshold (keep cells with `\|dx\| + \|dz\| ≤ radius` or mask outer corners) |
| `circular_approx` | Same corner-cut as octagonal, or slightly more aggressive corner removal for rounder read |

No perfect circles — honest “approximate rounded tower outline.”

**Refinement:** `"make it rounder"` / `"octagonal footprint"` → `updateTowerParams.footprintShape`.

---

## 8. Builder routing and UX

### Generation triggers

`isLandmarkTowerRequest(text)` — routes to generic landmark pipeline:

| Pattern | Notes |
|---------|-------|
| `landmark tower`, `campus tower`, `bell tower`, `clock tower` | Generic |
| `hoover tower`, `stanford tower`, `stanford hoover` | Demo example (same path) |
| `tall stone tower`, `sandstone tower`, `round tower` | Generic |
| `build something like this` + image + build verb | Intent extraction |
| `match the colors`, `use this palette` + tower context | Palette mapping emphasis |

**Not** a separate Hoover branch — one `generateLandmarkTowerPreview` (or extended `generateBuildingPreview`) for all.

### Assistant wording (required)

- ✅ “I made an **approximate landmark tower inspired by** your reference.”
- ✅ “This is **not an exact reconstruction**.”
- ✅ Include material mapping summary when palette was inferred.
- ✅ Hoover may be named as **inspiration** if user mentioned it.
- ❌ “Accurate Hoover Tower reconstruction”
- ❌ “I measured the image” / “exact color match” / “reproduced Hoover Tower precisely”

**Files:** `builderSystemPrompt.ts`, tower `assistantSummary`, `formatToolResultForModel.ts`.

---

## 9. Tower refinements

Deterministic `mapTowerRefinementPrompt.ts` + `applyTowerBlueprintOperations.ts`. Branch when `structureType === "landmark_tower"`.

| User phrase | Operation |
|-------------|-----------|
| taller / shorter | `shaftHeight ±2` (clamp 12–24) |
| wider/narrower base | `basePad ±1` |
| warmer / sandstone / lighter walls | `mapColorPaletteIntent` → `setTowerMaterials.wall` |
| darker cap / crown / top | `setTowerMaterials.cap` |
| warmer tan walls and dark gray top | multi-role palette mapping |
| match the colors / use this palette | re-run palette mapper from text (+ image labels if cached on turn) |
| more prominent top | `crownHeight +1` |
| more vertical windows | `windowRows +1` |
| fewer windows | `windowRows -1` |
| glass block / glass pane / open windows | `windowTreatment` |
| rounder / octagonal / circular tower | `footprintShape` |
| wider tower (whole) | `footprintWidth/Depth ±1` |

```ts
type TowerBlueprintOperation =
  | { op: "setTowerMaterials"; patch: Partial<LandmarkTowerMaterials>; mappingSummary?: string[] }
  | { op: "updateTowerParams"; patch: Partial<LandmarkTowerParams> };
```

**Do not** route tower refinements through v2 `window_det` or generic LLM planner.

---

## 10. Generator / rendering

**File:** `src/lib/generation/generators/generateLandmarkTower.ts`

1. **Footprint mask** per `footprintShape` for each Y layer.
2. **Base plinth:** `baseHeight` layers, expanded by `basePad`, using `materials.base`.
3. **Shaft:** `shaftHeight` layers, `materials.wall`, hollow or solid shell (MVP: solid shell + window cutouts).
4. **Windows:** `windowRows × windowsPerRow` per face, vertical bands, `windowTreatment` fill.
5. **Crown:** `crownHeight` + `crownStyle` using `materials.cap`; optional inset for `dark_cap`.
6. **Entrance:** optional 2×2 front opening at base.
7. **Grounding:** `placementUtils.ts` merge + filter.

**Height budget:** shaft 18–24 + base 2–3 + crown 3–5 → **total ~23–30** blocks.

---

## 11. Tests

~15–18 focused tests. Mock vision extraction.

| Test file | Cases |
|-----------|-------|
| `landmarkTower/validateLandmarkTower.test.ts` | Defaults; shaft 12–24; shape enum |
| `landmarkTower/generateLandmarkTower.test.ts` | Blocks emitted; total height ≥ 20; crown present |
| `landmarkTower/footprintShape.test.ts` | octagonal/circular_approx < square block count at same W×D |
| `reference/mapColorPaletteIntent.test.ts` | sandstone→limestone_bricks; dark gray cap→slate_tiles; mappingSummary |
| `reference/inferReferenceBuildIntentFromText.test.ts` | tower keywords; color phrases |
| `reference/mapReferenceBuildIntent.test.ts` | very_tall→shaft 20+; shapes; materials |
| `reference/extractReferenceBuildIntent.test.ts` | mocked vision; failure→`LANDMARK_TOWER_DEFAULT_INTENT` |
| `reference/resolveTowerGeneration.test.ts` | landmark + Hoover phrases → same tower path |
| `landmarkTower/towerRefinement.test.ts` | taller; palette; cap; windows; footprint shape |
| `generateBuildingPreview.test.ts` | end-to-end generate ok |

**Must not regress:** existing 372 generator tests.

---

## 12. Implementation options

| Option | Summary | Verdict |
|--------|---------|---------|
| **1** | Text-only + generic v2 tall preset | ❌ Deprioritized — 9-block cap |
| **2** | `landmark_tower` + `ReferenceBuildIntent` + palette mapping | ✅ **Recommended** |
| **3** | Full image-to-blueprint | ❌ Too risky |
| **4** | Hardcoded Hoover demo mode | ❌ Violates generic capability goal |

---

## 13. Staged implementation plan (revised priority)

**If time runs out: do not cut taller tower emitter or color palette mapping.** Cut live vision extraction first, then optional footprint-shape polish.

### Priority A — `LandmarkTowerBlueprint` + taller deterministic emitter (REQUIRED)

| Item | Detail |
|------|--------|
| Files | `types/landmarkTower.ts`, `sampleLandmarkTowerBlueprints.ts`, `validateLandmarkTower.ts`, `generateLandmarkTower.ts`, `generateStructure.ts`, `validateBlueprint.ts`, `builderToolTypes.ts` |
| Time | 50–65 min |
| Checkpoint | `landmark_tower_default` renders ~25-block tower with crown + windows |

### Priority B — Text routing for tower / landmark / Hoover prompts (REQUIRED)

| Item | Detail |
|------|--------|
| Files | `isLandmarkTowerRequest.ts`, `inferReferenceBuildIntentFromText.ts`, `generateBuildingPreview.ts`, `runBuilderChatTurn.ts` |
| Time | 20–30 min |
| Checkpoint | “Build a landmark campus tower” and “Stanford Hoover Tower” use same pipeline |

### Priority C — Color palette / material mapping (REQUIRED)

| Item | Detail |
|------|--------|
| Files | `mapColorPaletteIntent.ts`, wire into intent mapper + refine mapper, `mappingSummary` in tool results |
| Time | 30–40 min |
| Checkpoint | “Warmer sandstone walls and dark gray cap” updates materials + summary text |

### Priority D — Reference intent extraction / fallback (IMPORTANT; trimmable)

| Item | Detail |
|------|--------|
| Files | `extractReferenceBuildIntent.ts`, `referenceIntentSchema.ts`, vision JSON call |
| Time | 35–45 min |
| Fallback | `inferReferenceBuildIntentFromText` + `LANDMARK_TOWER_DEFAULT_INTENT` only |
| Cut first if needed | Live vision call — keep text inference + default intent |

### Priority E — Tower refinements (REQUIRED for demo)

| Item | Detail |
|------|--------|
| Files | `mapTowerRefinementPrompt.ts`, `applyTowerBlueprintOperations.ts`, `planAndRefineBuildingPreview` branch |
| Time | 35–45 min |
| Checkpoint | taller, palette, cap, windows, footprint shape |

### Priority F — Demo wording + tests + build (REQUIRED)

| Item | Detail |
|------|--------|
| Files | `builderSystemPrompt.ts`, `formatToolResultForModel.ts`, tests §11 |
| Time | 30–40 min |

### Cut order if time runs out

1. **Cut D** (live vision) — text inference + default intent still demoable with uploaded image discussed in chat.
2. **Cut** octagonal/circular polish — ship `square` only temporarily (keep schema field).
3. **Never cut A, C, E** — taller emitter and palette mapping are demo-critical.
4. **Never ship** Hoover-only renderer or generic v2 9-block primary path.

---

## 14. Definition of done

- [ ] Generic pipeline: `ReferenceBuildIntent` → palette mapping → `LandmarkTowerBlueprint` → validate → generate.
- [ ] Tower shaft **~18–24** blocks; total height **~23–30**.
- [ ] `footprintShape` supported (`square` minimum; octagonal/circular_approx via corner cut).
- [ ] Color/palette requests map to classic materials with concise `mappingSummary`.
- [ ] Hoover Tower works as **demo example** only — same code as any landmark tower.
- [ ] Refinements: height, palette, cap, windows, base, footprint shape.
- [ ] Assistant: “approximate landmark tower inspired by the reference” — not exact reconstruction.
- [ ] No LLM voxel placement.
- [ ] `tsc`, `test:generator`, `build` pass.

---

## 15. Non-goals

- Arbitrary image-to-building for any architecture
- Exact color matching or pixel sampling
- Accurate Hoover Tower replica
- Perfect circular geometry
- Generic v2 9-block room as primary tower
- Hidden Hoover-only renderer
- Interiors, multi-building scenes, persistence, auth, export, raw voxel editing
- LLM full blueprint JSON (except bounded `ReferenceBuildIntent`)
- Reintroducing retired `medieval_tower` wholesale

---

## 16. Final recommendation

### Recommended path

**Option 2:** Generic `landmark_tower` capability with `ReferenceBuildIntent` → `mapColorPaletteIntent` → `LandmarkTowerBlueprint` → deterministic emitter → tower refinements. Option D vision extraction when time allows; **`LANDMARK_TOWER_DEFAULT_INTENT` as fallback only**.

### First implementation step

1. `LandmarkTowerBlueprint` type + `landmark_tower_default` sample (`shaftHeight: 20`, crown, windows).
2. `validateLandmarkTowerBlueprint` + `generateLandmarkTower` (tall shaft, base pad, crown, footprint mask hook).
3. Wire `generateStructure` — verify visible ~25-block tower in `/builder` **before** routing or vision work.

### Required for video demo

| Priority | Required? |
|----------|-----------|
| A — Taller emitter + blueprint | **Yes** |
| B — Text routing | **Yes** |
| C — Color palette mapping | **Yes** |
| D — Vision extraction | Nice-to-have (text + default OK) |
| E — Refinements | **Yes** |
| F — Wording + tests | **Yes** |

### Risks and fallbacks

| Risk | Mitigation |
|------|------------|
| Vision JSON fails | `inferReferenceBuildIntentFromText` + `LANDMARK_TOWER_DEFAULT_INTENT` |
| Emitter too short/wide | Tune defaults in mapper constants, not Hoover hardcode |
| Palette phrases missed | Add 8–10 regex rules; pre-script demo prompts |
| Block count high | Clamp footprint and shaft; respect `maxBlockCount` |
| Octagonal read weak | Demo with `square`; mention rounded refinement as follow-up |

### How this meets the MVP demo

1. **Generic capability** — any landmark tower reference uses one pipeline; Hoover is the showpiece.
2. **Taller than v2** — dedicated shaft height delivers campus-tower silhouette.
3. **Color architect** — palette intent maps to materials with honest approximate wording.
4. **Rounded tower story** — footprint shape field + corner-cut emitter.
5. **Safe pipeline** — validate → deterministic generate → deterministic refine.
6. **Pragmatic fallback** — default intent keeps demo reliable without a one-off renderer.

---

**Next step after review:** Implement **Priority A** on `feature/mvp-reference-tower-demo`; confirm `landmark_tower_default` renders before Priorities B–C.
