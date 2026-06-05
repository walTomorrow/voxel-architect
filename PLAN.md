# PLAN: Builder Semantic Affordances

**Branch:** `feature/builder-semantic-affordances`  
**Status:** Planning only — do not implement from this document until reviewed.  
**Prerequisite:** `feature/builder-tool-expansion` merged (component operations, planner JSON Mode, stabilization). See [`CHANGE.md`](CHANGE.md) for what shipped.

**Related docs:** [`docs/plans/GENERIC_BUILDING_V2.md`](docs/plans/GENERIC_BUILDING_V2.md), [`docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md), [`docs/plans/BUILDER_PLANNER_ROUTING_FIX.md`](docs/plans/BUILDER_PLANNER_ROUTING_FIX.md)

---

## 1. Current implementation summary

### End-to-end pipeline

```text
User message (+ optional image, currentBlueprint)
  → routing (generation | refinement tool | chat-only SSE/JSON)
  → refinement: plan operations (deterministic | LLM)
  → normalizePlannerOperations → validatePlannerOperations → materializePlannerOperations
  → applyBlueprintOperationsV2
  → validateBlueprint (v2)
  → generateStructure → resolve → compileGenericBuildingV2Plan → emitFromComponentPlanV2
  → preview updates only when toolResult.ok
  → assistant turn via Workers AI + formatToolResultForModel (anti-hallucination rules)
```

The LLM never edits `ComponentPlanV2`, voxel coordinates, or full `GenericBuildingBlueprintV2` JSON. It only proposes constrained operations; the server owns materialization and validation.

### Builder chat entry

| Layer | File / function | Role |
|--------|-----------------|------|
| HTTP | `src/app/api/builder/chat/route.ts` | Parses body via `parseBuilderChatRequestBody`; branches on `shouldUseRefinementJsonTurn` / `shouldUseGenerationJsonTurn` / stream |
| Refine JSON | `runBuilderRefinementChatTurn` in `src/lib/builder/runBuilderChatTurn.ts` | Calls `planAndRefineBuildingPreview`, then `formatToolResultForModel` + `callWorkersAiChat` |
| Generate JSON | `runBuilderGenerationChatTurn` | `generateBuildingPreview` (preset clone) |
| Chat-only | `streamWorkersAiChat` / `callWorkersAiChat` + `applyChatOnlyResponseSafety` | No tool; `guardNoToolChangeClaims` strips false “I updated…” claims |
| Standalone refine API | `src/app/api/builder/refine/route.ts` | Same `planAndRefineBuildingPreview` with explicit `plannerMode` |

### Generation vs refinement vs chat-only routing

| Gate | File | Behavior |
|------|------|----------|
| Generation | `shouldRunGenerationTool.ts`, `shouldStrongCreatePrompt` in `shouldRunRefinementTool.ts` | Strong create (“make me a workshop”) with blueprint present → generate, not refine |
| Refinement | `shouldRunRefinementTool.ts`, `looksLikeComponentEditRequest.ts` | Active blueprint + edit signals → refine JSON turn |
| Design feedback | `looksLikeDesignFeedback` | “What do you think?” → chat with `[Current build context]` via `augmentChatWithBuildContext.ts` |
| Chat stream | `shouldStreamBuilderChat` in `callWorkersAiChat.ts` | Image-only or non-tool paths |

Refinement planning is centralized in `planAndRefineBuildingPreview.ts` → `resolveRefinementPlan`.

### Planner mode routing (`auto` | `deterministic` | `llm`)

`resolveRefinementPlan` in `planAndRefineBuildingPreview.ts`:

1. **`llm`:** Always `planBlueprintOperationsWithLlm`.
2. **`deterministic`:** Always `mapRefinementPromptToOperations`; failure → `PLANNER_UNSUPPORTED`.
3. **`auto`:** `classifyRefinementPrompt` in `classifyRefinementPrompt.ts`:
   - `semantic` | `structural` → LLM first.
   - Else try `mapRefinementPromptToOperations`; on success → deterministic.
   - Else LLM with deterministic failure as fallback context.

**Important:** `mapRefinementPromptToOperations.ts` still maps broad phrases like `more windows` / `add windows` to **front** `findPrimaryFrontWindowGroup` updates (lines ~366–395), which can override side/back intent before the LLM runs.

### LLM planner invocation

| Step | File / function |
|------|----------------|
| User prompt assembly | `buildPlannerUserPrompt` in `buildPlannerPrompt.ts` |
| Workers AI call | `callWorkersAiJsonPlanner` / `fetchPlannerText` in `callWorkersAiJsonPlanner.ts` |
| JSON Mode | `buildWorkersAiPlannerResponseFormat()` in `plannerResponseSchema.ts` — `response_format: { type: "json_schema", json_schema: PLANNER_RESPONSE_JSON_SCHEMA }` |
| Parse | `parsePlannerJsonResponse` in `validatePlannerOperations.ts` |
| Validate + materialize | `validatePlannerJsonAndOperations` → `validatePlannerOperations` → `materializePlannerOperations` |
| Overbroad guard | `validateOverbroadPlannerPlan` + `detectDirectComponentRequest` for single-op direct component requests |
| Repair | `planBlueprintOperationsWithLlm.ts`: one repair fetch via `plannerRepair.ts` on repairable rejection codes; parse repair in `callWorkersAiJsonPlanner` |

Test override: `setLlmPlannerForTests` in `planBlueprintOperationsWithLlm.ts`.

### Planner response schema (emitted shape)

Top-level (`plannerResponseSchema.ts`):

- `{ status: "ok", operations: [...], rationaleSummary }` or `{ status: "unsupported", unsupportedReason }`.

Operations (`blueprintOperationsV2.ts`), per-op `oneOf` in JSON Schema:

| `op` | Planner-facing shape |
|------|----------------------|
| `setMaterialPalette` | `{ patch: { wall?, roof?, … } }` |
| `updateComponent` | `{ id, componentType, patch }` — patch typed per component |
| `addComponent` | **Intent only:** `{ componentType, targetSurface?, placement?, options? }` — no full `component` |
| `removeComponent` | `{ id }` |

`MAX_PLANNER_OPERATIONS` = 3 (`plannerTypes.ts`).

### Normalize / repair

- **`normalizePlannerOperation.ts`:** Coerces aliases (`componentId`, hoisted patch fields, wrapped op keys).
- **`plannerRepair.ts`:** Repair user prompt includes rejection code, detail, affordances text, bad snippet; repair uses same JSON Mode.
- Rejection codes: `plannerRejection.ts` (`INVALID_PLANNER_JSON`, `OVERBROAD_OPERATION_PLAN`, `JSON_MODE_FAILED`, `ADD_NOT_ALLOWED`, etc.).

### Validation before apply

`validatePlannerOperations.ts`:

- Rejects full `component` blob on `addComponent` before normalize.
- Per-op field allowlists; `canAddComponent` / `canRemoveComponent` from `componentOperationRegistry.ts`.
- Simulates batch state (materialize add intents into working blueprint for duplicate checks).
- Final `materializePlannerOperations.ts` converts intents → `AddComponentOperation` with full `GenericBuildingComponentV2`.

### Materialize add intents

`componentOperationRegistry.ts`:

- **`materializeAddComponent`:** porch / chimney / window_group defaults.
- **`inferWindowSurfaceFromPrompt`:** left/right/back/front from user text when `targetSurface` omitted.
- **`windowFacadeCapacity.ts`:** layout sanitize (`symmetric` / `even`), count clamp, singular “a window” → count 1.
- Porch: `door_only` + `aroundDoor` when front door exists; chimney: avoids front face default.

### Apply operations

`applyBlueprintOperationsV2.ts`:

- `structuredClone` blueprint; applies palette, add/remove, `updateComponent` patches (clamped).
- Window adds/updates run through `sanitizeWindowGroupComponent`.
- Returns `appliedLabels: string[]` (human-readable, not structured diffs).

### Blueprint validation and voxel generation

- **`validateBlueprint`** → `validateGenericBuildingV2.ts` for v2 (façade window capacity, layout, porch `aroundDoor`, etc.).
- On post-apply failure: `buildValidationFailureSuggestion.ts` + affordances in `planAndRefineBuildingPreview.ts`.
- **`generateStructure`** → `generateGenericBuildingV2` → `compileGenericBuildingV2Plan` → **`ComponentPlanV2`** (internal IR in `src/lib/generation/components/v2/types.ts`) → `emitFromComponentPlanV2`. Not exposed to planner or chat.

### Tool result and UI

- **`BuilderToolResult`** (`builderToolTypes.ts`): `ok`, `assistantSummary`, `appliedOperations`, `plannerPath`, `rejectionCode` / `rejectionDetail`, `blueprint`, `blocks`, `activityEvents`.
- **`formatToolResultForModel.ts`:** Injects `BUILDER_TOOL_STATUS`, `PREVIEW_UPDATED`, `OPERATIONS` (joined labels), `SUMMARY` for follow-up chat.
- **`BuilderClient.tsx`:** Applies `toolResult` to preview state only when `ok`; activity from `builderActivityFromTool.ts`.
- **`builderSystemPrompt.ts`:** Tool-result authority rules; chat-only must not claim edits.

### Anti-hallucination safeguards

| Mechanism | Location |
|-----------|----------|
| No tool → no change claims | `guardNoToolChangeClaims.ts`, `applyChatOnlyResponseSafety.ts` |
| Tool failure instructions | `formatToolResultForModel` failed branch |
| Planner must not output voxels / ComponentPlan / full blueprint | `buildPlannerPrompt.ts`, `buildAllowedOperationsSchema.ts` unsupported list |
| Preview only on `toolResult.ok` | `planAndRefineBuildingPreview`, `BuilderClient` |

### Planner context today

Injected in `buildPlannerUserPrompt` (in order):

1. **`summarizeBlueprintForPlanner`** + `renderBlueprintSummaryText` — per-component lines (dimensions, surfaces, counts); raw material keys; no style semantics.
2. **`getBlueprintAffordancesForPlanner`** + `renderAffordancesText` — booleans per face, trial-validated `canIncreaseCount`, `frontWindowsAtCapacity`, removable ids; **no `because` reasons** on denials.
3. **`buildAllowedOperationsSchema`** + `renderAllowedOperationsSchemaText` — allowlist ids, patch ranges, unsupported list.

Chat-only feedback uses the same summary via `buildCurrentBuildContextBlock` (no affordances).

---

## 2. Current semantic planner limitations

| Gap | Evidence in code / manual test |
|-----|--------------------------------|
| **Building style is shallow** | Summary lists material keys (`limestone_bricks`, `slate_tiles`) but not descriptors (rustic, medieval, welcoming). No silhouette/proportion narrative beyond room W×D×H. |
| **Material semantics absent** | No mapping from `CLASSIC_MATERIAL_KEYS` / palette slots to style tags for the planner. |
| **Why an action is unavailable** | Affordances expose `canAdd.porch: false` but not “porch already exists”; rejections may come from wrong component path (porch vs window). |
| **Surface-specific windows incomplete** | `inferWindowSurfaceFromPrompt` is single-surface; compound “left and right” needs 2 ops (max 3) but routing/classifier may not enter refine or deterministic front-window matcher wins. |
| **Add vs update not distinguished in summaries** | `appliedLabels` say “Updated window group (2 windows)” or “Added window group”; `formatToolResultForModel` passes opaque `OPERATIONS` string; assistant invents “two additional” vs “now 2 total”. |
| **Abstract style prompts under-guided** | `classifyRefinementPrompt` sends “more welcoming” to LLM, but prompt only has generic examples + boolean affordances — no structured style→operation hints. |
| **Deterministic mapper overrides semantics** | `mapRefinementPromptToOperations` front-window `more windows` / `add windows` runs before LLM in `auto` literal path; no surface-aware deterministic for side/back. |
| **Compound multi-surface plans** | Planner schema allows up to 3 ops but no first-class “surfaces requested” in context; LLM may pack invalid multi-surface plans or single wrong surface. |
| **Affordance / rejection mismatch** | `buildValidationFailureSuggestion` uses coarse string matching; planner repair prompt may not tie rejection to requested component type. |

---

## 3. Design goals for this branch

### In scope

1. **Semantic build summary** — human- and machine-readable picture of the current build (type, proportions, style, features, constraints).
2. **Material/style descriptor library** — keyed by real classic material IDs used in palettes.
3. **Richer explanatory affordances** — availability + **reason** + **alternatives**.
4. **Better surface-specific window affordances** — per-face add/update/capacity/exclusions (e.g. “not on front”).
5. **Better operation-result summaries** — structured diffs for assistant/UI (added vs updated, count before→after).
6. **Style-intent guidance** — welcoming / rustic / bright / medieval as planner hints, not new deterministic ops.

### Out of scope (branch guardrails)

- Many new component types, second floors, interiors, side rooms.
- Image-to-build planning, persistence, auth, D1/R2, AI Gateway, Cloudflare Agents.
- Raw voxel editing or LLM access to `ComponentPlanV2` internals.
- Replacing server validation or letting the model skip materialize/validate.

---

## 4. Proposed semantic build summary

### Proposed API

```ts
// src/lib/builder/semantic/getSemanticBuildSummaryForPlanner.ts (proposed)

export type SemanticBuildSummaryForPlanner = {
  readonly buildingType: string;           // e.g. "stone workshop", "porch house"
  readonly proportions: readonly string[]; // e.g. ["compact", "low", "wide"]
  readonly materialSummary: readonly string[];
  readonly styleDescriptors: readonly string[]; // derived from materials + features
  readonly roofSummary: string;
  readonly featureSummary: readonly string[];   // porch, chimney, step, door
  readonly windowsBySurface: readonly WindowSurfaceSummary[];
  readonly missingFeatures: readonly string[];
  readonly constraints: readonly string[];
  readonly suggestedNextMoves: readonly string[]; // from affordances, not LLM-authored
};
```

`getSemanticBuildSummaryForPlanner(blueprint, options?: { presetId?, userPrompt? })` would compose:

- Existing `summarizeBlueprintForPlanner` / `findRootRoom` / roof helpers.
- New material descriptor map (§5).
- Rich affordances (§6) for `suggestedNextMoves` and `missingFeatures`.

### Example target (text block for prompt)

```text
building type: stone workshop
proportions: compact, low, wide (11×9, wallHeight 4)
materials: limestone_bricks walls, slate_tiles roof, glass windows — stone-heavy, utilitarian
roof: shed, 2 layers, front_back
features: front door (wide), front windows (2, symmetric), left windows (2), no porch, no chimney
windows: front at capacity; right/back can add group; left has group (can increase if slots allow)
missing: porch, chimney
valid next moves: add chimney, add right window_group, add porch, setMaterialPalette (warm wood accents)
```

### JSON vs text vs both

| Format | Pros | Cons |
|--------|------|------|
| **Text only** | Easy for LLM; matches current `renderBlueprintSummaryText` pattern | Harder to unit-test field-by-field; repair prompts verbose |
| **JSON only** | Testable; could extend JSON Schema context later | Model may ignore nested fields; redundant with operation JSON |
| **Both (recommended)** | JSON for tests + typed builders; compact text block in `buildPlannerUserPrompt` | Slight duplication; keep single builder function |

**Recommendation:** Build a typed object, render a stable text block via `renderSemanticBuildSummaryText`, optionally attach a minified JSON appendix behind a dev flag first.

---

## 5. Proposed material/style descriptor system

### Source of truth for material IDs

Palette keys use **`CLASSIC_MATERIAL_KEYS`** from `src/app/generic-lab/genericLabUtils.ts` (keys of `CLASSIC_BLOCK_PACK` in `src/lib/voxel/blocks/packs/classic.ts`). Builder ops validate palette values against this list (`applyBlueprintOperationsV2.ts`, `buildAllowedOperationsSchema.ts`).

Preset examples (from `sampleGenericBuildingBlueprintsV2.ts`):

- **stone_workshop_v2:** `limestone_bricks`, `cobblestone`, `slate_tiles`, `glass`, `oak_planks`
- **simple_cabin_v2 / porch_house_v2:** often `cobblestone`, `oak_planks`, `slate_tiles`, `glass`

### Proposed descriptor map (starter)

File: `src/lib/builder/semantic/materialStyleDescriptors.ts` (proposed)

| Material key (classic) | Style tags (starter) |
|----------------------|----------------------|
| `cobblestone` | sturdy, medieval, rustic, heavy, gray |
| `limestone_bricks` | bright, clean, refined, pale, formal |
| `limestone` | pale, clean, accent |
| `oak_planks` | warm, wooden, rustic, cozy |
| `beech_planks` | warm, light wood |
| `slate_tiles` | dark, formal, roof-like, medieval |
| `glass` | bright, open, transparent |
| `mud` / `grass_block` | earthy, informal (floor/ground) |
| `andesite` | cool, gray, modern |

Slot-level aggregation: map `blueprint.materials.wall` + `roof` + `window` + `door` → combined `styleDescriptors[]` (deduped).

### Design choices

| Question | Recommendation |
|----------|----------------|
| Where it lives | `src/lib/builder/semantic/` module(s), not in planner prompt strings |
| Keying | By material ID string; unknown keys → `["neutral"]` or empty + note in summary |
| Planner-only vs validation | **Planner context only** for this branch; do not relax `validateGenericBuildingV2` based on tags |
| One file vs split | **Split:** `materialStyleDescriptors.ts` + `styleIntentGuidance.ts` (§8) |

---

## 6. Proposed richer planner affordances

### Proposed shape

Extend or wrap `BlueprintAffordancesForPlanner` into `RichBlueprintAffordancesForPlanner`:

```ts
type AffordanceAction = {
  readonly available: boolean;
  readonly reason?: string;              // human-readable why false
  readonly alternatives?: readonly string[]; // e.g. "add right window_group instead"
};

type RichWindowSurfaceAffordance = WindowSurfaceAffordance & {
  readonly addGroup: AffordanceAction;
  readonly increaseCount: AffordanceAction;
  readonly removeGroup?: AffordanceAction;
};

type RichBlueprintAffordancesForPlanner = {
  readonly porch: PorchAffordance & {
    readonly add: AffordanceAction;
    readonly widen: AffordanceAction;
    readonly deepen: AffordanceAction;
    readonly remove: AffordanceAction;
  };
  readonly chimney: ChimneyAffordance & { readonly add: AffordanceAction; readonly remove: AffordanceAction };
  readonly windows: readonly RichWindowSurfaceAffordance[];
  readonly updateableComponents: readonly { id: string; type: string; patchHints: readonly string[] }[];
  // ... legacy fields for backward compat during migration
};
```

Example rendered lines:

```text
porch.add: false — porch already exists (id front-porch). Alternatives: widen to full_facade, deepen.
chimney.add: true — no chimney present.
window.front.increaseCount: false — front at capacity (2/2 slots). Alternatives: add right window_group, add back window_group.
window.right.addGroup: true — surface main-room.right has no window_group.
```

### Merge with semantic summary vs separate

| Approach | Pros | Cons |
|----------|------|------|
| **Merged** | Single “build context” section; less prompt tokens | Large blob; harder to test affordances alone |
| **Separate (recommended)** | `renderSemanticBuildSummaryText` + `renderRichAffordancesText`; clear ownership | Two sections in prompt; need cross-links (“see valid next moves”) |
| **Summary embeds affordances** | `suggestedNextMoves` derived once | Duplication if affordances also listed in detail |

**Recommendation:** Keep separate render functions; summary’s `suggestedNextMoves` is a **short** deduped list derived from rich affordances (top 5–8), not a full dump.

Implementation path: `getRichBlueprintAffordancesForPlanner` builds on existing `getBlueprintAffordancesForPlanner` + reason helpers (no second trial-validate loop where possible).

---

## 7. Proposed window affordance improvements

### Current behavior (baseline)

| Concern | Current code |
|---------|----------------|
| Per-surface state | `getBlueprintAffordancesForPlanner` → `windows[]` per `RoomFace` |
| Capacity | `getMaxWindowSlotsForSurface` / `windowFacadeCapacity.ts`; `canIncreaseCount` via trial apply + `validateBlueprint` |
| Materialize | `inferWindowSurfaceFromPrompt`, defaults `even` on sides, `symmetric` on front |
| Routing risk | `mapRefinementPromptToOperations` → front group for `add windows` / `more windows` |
| Multi-op | Up to 3 planner ops; no explicit “requested surfaces” list in context |

### Plan

**A. Context (this branch — primary)**

1. **`WindowSurfaceSummary`** in semantic summary: face, surface ref, groupId, count, maxSlots, atCapacity, recommended op (`addComponent` vs `updateComponent` with id).
2. **Compound request hints:** Parse user prompt lightly (server-side, not LLM) for surface list: `detectRequestedWindowSurfaces(prompt)` → `["left","right"]`; include in planner user prompt as “User requested surfaces: left, right (needs up to 2 operations)”.
3. **Exclusion hints:** “not on the front” → `excludedFaces: ["front"]` in prompt constraints.
4. **Rich reasons** when `canAddGroup` false because group exists: “use updateComponent on `left-windows`”.

**B. Routing (small, targeted — same branch if low risk)**

1. Narrow deterministic matcher: only map `more windows` / `add windows` to **front** when prompt lacks side/back/right/left signals (reuse `inferWindowSurfaceFromPrompt` negative check).
2. `classifyRefinementPrompt`: treat multi-surface window phrases as `semantic` (or new `literal_multi`) so LLM plans 2× `addComponent` rather than deterministic front bump.
3. `shouldRunRefinementTool`: ensure compound window phrases always gate refine (extend `looksLikeComponentEditRequest`).

**C. Validation / materialize (already mostly done)**

- Keep clamp/sanitize in `windowFacadeCapacity.ts`; document in planner prompt that counts are **totals**, not deltas.

**D. Tests (§12)**

- Table-driven: prompt → expected surfaces detected; affordance text includes reason strings; planner mock (existing `setLlmPlannerForTests`) for left+right and back-only.

**Defer if scope tight:** Full deterministic mapper for multi-surface adds (prefer planner + better context first).

---

## 8. Proposed style-intent guidance

### Intent examples (not deterministic ops)

| User phrase | Suggested operation families (from affordances) |
|-------------|--------------------------------------------------|
| welcoming | add porch, widen porch, warm palette (`oak_planks`), side windows if front full |
| rustic | cobblestone/oak palette, chimney, pitched roof |
| sturdy | stone-heavy palette, compact proportions, chimney |
| bright | glass windows, lighter walls (`limestone_bricks`), more window count on available faces |
| medieval | stone, slate roof, chimney, smaller window counts |
| refined | limestone_bricks, symmetric front windows, less rustic tags |

### Representation options

| Option | Pros | Cons |
|--------|------|------|
| **A. Static prompt paragraphs** | Fastest; no new types | Drifts from affordances; hard to test |
| **B. Structured library** | Testable; versioned; maps intent → candidate op types + palette hints | Must stay in sync with allowlist |
| **C. Hybrid (recommended)** | `styleIntentGuidance.ts` exports records; `renderStyleIntentGuidanceForPlanner(request)` injects only matching intents (token-efficient) | Slightly more code |

**Recommendation:** **Option C** — e.g. `STYLE_INTENT_HINTS: Record<string, StyleIntentHint>` keyed by normalized triggers (`welcoming`, `rustic`, …), rendered when `detectStyleIntents(userPrompt)` matches. Hints reference affordance fields (“if `frontWindowsAtCapacity`, prefer `window.right.addGroup`”).

Do **not** add deterministic `makeWelcoming()` operations in this branch.

---

## 9. Proposed operation-result summary improvements

### Current flow

- `applyBlueprintOperationsV2` → `appliedLabels: string[]` (e.g. `"Updated window group (2 windows)"`, `"Added chimney component (chimney)"`).
- `planAndRefineBuildingPreview` → `assistantSummary: \`${plan.planLabel} (${blockCount} blocks)\``.
- `formatToolResultForModel` → `OPERATIONS: label1; label2`, `SUMMARY: assistantSummary`.

No before/after component snapshot; LLM infers deltas incorrectly.

### Proposed structured diff

```ts
// src/lib/builder/operationResultSummary.ts (proposed)

export type OperationOutcomeKind =
  | "added_component"
  | "removed_component"
  | "updated_component"
  | "updated_palette"
  | "rejected"
  | "noop";

export type OperationOutcomeSummary = {
  readonly kind: OperationOutcomeKind;
  readonly componentId?: string;
  readonly componentType?: string;
  readonly surface?: string;
  readonly field?: string;           // e.g. "count", "widthMode"
  readonly before?: string | number;
  readonly after?: string | number;
  readonly deltaDescription: string; // "window count 1 → 2 on main-room.right"
  readonly userFacingShort: string;  // "Set right windows to 2 (was 1)"
};

export function summarizeOperationOutcomes(
  before: GenericBuildingBlueprintV2,
  after: GenericBuildingBlueprintV2,
  operations: readonly ApplyableBlueprintOperationV2[],
  appliedLabels: readonly string[],
): readonly OperationOutcomeSummary[];
```

Wire into:

- `BuilderToolResult.operationSummaries` (new optional field).
- `formatToolResultForModel`: emit `OUTCOME: …` lines with explicit **total vs delta** wording instructions.
- `assistantSummary` template: prefer `userFacingShort` joined, not raw `planLabel` alone.

### Cases to cover

| Case | `deltaDescription` pattern |
|------|----------------------------|
| New window group | “Added window_group on main-room.right (count 2)” |
| Count update | “window_group front-windows count 2 → 3 (total 3)” — never “added 3 windows” |
| Remove chimney | “Removed chimney (chimney)” |
| Palette only | “Palette roof: slate_tiles → oak_planks” |
| Validation fail | No outcomes; rejection detail only |
| Deterministic front +1 | Same count semantics |

---

## 10. Implementation options

### Option 1: Minimal planner-context patch

**Scope:** Summary text helper, material descriptor map, extend `renderAffordancesText` with reasons, prompt paragraphs for style intents, light `formatToolResultForModel` wording fix without full diff types.

| | |
|--|--|
| **Pros** | Small diff; shippable in days; low regression risk |
| **Cons** | Window routing bugs may remain; summaries still partly brittle |
| **Risk** | Low |
| **Files** | `buildPlannerPrompt.ts`, `getBlueprintAffordancesForPlanner.ts`, new `semantic/*.ts`, tests for render output |
| **Fit** | Good if we need quick wins only |

### Option 2: Formal semantic context module (recommended)

**Scope:** `src/lib/builder/semantic/` exporting summary, descriptors, rich affordances, style hints, `buildPlannerContextForLlm(blueprint, userRequest)` consumed by `buildPlannerUserPrompt`. Structured operation summaries. Targeted routing tweak for front-window deterministic override.

| | |
|--|--|
| **Pros** | Clear boundary; testable; matches branch name; fixes known manual-test themes |
| **Cons** | ~1–2 weeks touch many builder files |
| **Risk** | Medium — prompt size growth; must monitor token limits |
| **Files** | New `semantic/*`, `buildPlannerPrompt.ts`, `getBlueprintAffordancesForPlanner.ts`, `formatToolResultForModel.ts`, `builderToolTypes.ts`, `applyBlueprintOperationsV2` or wrapper for diffs, `mapRefinementPromptToOperations.ts` (narrow), tests |
| **Fit** | **Best balance for `feature/builder-semantic-affordances`** |

### Option 3: Larger refactor

**Scope:** Extract `plannerContext/` package, typed operation IR with before/after on every op, refactor `resolveRefinementPlan` orchestration, comprehensive golden tests per prompt class.

| | |
|--|--|
| **Pros** | Long-term clean architecture |
| **Cons** | Too large for one branch; conflicts with “no over-refactor” |
| **Risk** | High |
| **Fit** | Defer to follow-up epic |

### Recommendation

**Option 2** — formal semantic module + rich affordances + operation outcome summaries + minimal routing fix for side-window deterministic collision.

---

## 11. Recommended implementation plan

1. **Inventory** — Document current prompt token budget; list all `render*Text` call sites (`buildPlannerPrompt`, `augmentChatWithBuildContext`, `plannerRepair`).
2. **Material descriptors** — `materialStyleDescriptors.ts` + unit tests for known preset palettes.
3. **Semantic build summary** — `getSemanticBuildSummaryForPlanner` + `renderSemanticBuildSummaryText`; wire into planner prompt (keep legacy summary behind flag for one commit if needed).
4. **Rich affordances** — `getRichBlueprintAffordancesForPlanner` with `reason` / `alternatives`; refactor `renderAffordancesText` to use it (preserve existing boolean fields for tests).
5. **Window surfaces** — `detectRequestedWindowSurfaces(prompt)`; enrich per-face lines; planner prompt section “Requested surfaces”.
6. **Style intents** — `styleIntentGuidance.ts` + conditional render in user prompt.
7. **Operation summaries** — `summarizeOperationOutcomes(before, after, ops)`; extend `BuilderToolResult` + `formatToolResultForModel` + `assistantSummary` builder in `planAndRefineBuildingPreview`.
8. **Routing tweak** — Guard front-window deterministic mapping when side/back/right/left detected in `mapRefinementPromptToOperations`.
9. **Feed context** — Replace ad-hoc blocks in `buildPlannerUserPrompt` with `buildPlannerContextForLlm`; update `plannerRepair` to include semantic summary snippet.
10. **Tests** — See §12; keep `setLlmPlannerForTests` for abstract style cases.
11. **Docs** — Update `CHANGE.md` on branch; keep manual-test checklist.
12. **Validate** — `pnpm exec tsc --noEmit`, `pnpm test:generator`, `pnpm run build`.

---

## 12. Testing plan

### Unit tests (new / extended)

| Area | Test file (proposed) | Cases |
|------|----------------------|-------|
| Semantic summary | `semanticBuildSummary.test.ts` | stone_workshop_v2; with porch+chimney+windows |
| Material descriptors | `materialStyleDescriptors.test.ts` | cobblestone, limestone_bricks, unknown key |
| Rich affordances | `richAffordances.test.ts` | porch exists → add false + reason; front at capacity |
| Window surfaces | `windowSurfaceIntent.test.ts` | right only; left+right; back; “not on front” |
| Style intents | `styleIntentGuidance.test.ts` | welcoming/rustic/bright triggers render hints |
| Operation summaries | `operationResultSummary.test.ts` | add vs update count 1→2; remove; palette |
| Routing | extend `mapRefinementPromptToOperations.test.ts` | “add windows on the right” ≠ front update |
| Planner integration | extend `planAndRefineBuildingPreview.test.ts` | mocked LLM receives context containing `at capacity` |

### Manual retest (after implementation)

1. Stone workshop → “add windows to the right and back” (two groups or clear unsupported).
2. “add a window to the left and right” → refine runs, plausible plan.
3. “make it more welcoming” with front full → side windows or porch, not front count 4.
4. Update front windows 1→2 → assistant says “2 windows total”, not “two additional”.
5. Window request when porch exists → rejection mentions windows, not porch (if still failing, file follow-up).

### Commands

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

---

## 13. Open decisions/questions

1. **Semantic summary format:** Text-only in prompt first, or JSON appendix from day one?
2. **Style intents:** Hybrid library (recommended) vs prompt-only for v1?
3. **Affordances:** Replace `BlueprintAffordancesForPlanner` type or extend with optional `rich` nested object?
4. **Operation diffs:** Required for branch success, or phase 2 if `formatToolResultForModel` INSTRUCTION patch is enough?
5. **Window routing:** Context-only in planner vs also change `mapRefinementPromptToOperations` / `classifyRefinementPrompt`?
6. **Token budget:** Max size for new context block; trim order (style hints first vs affordance details)?
7. **Chat-only context:** Should `augmentChatWithBuildContext` use semantic summary (feedback quality) or planner-only?
8. **MINIMUM scope:** Ship summaries + rich affordances + descriptors without routing change — acceptable?

---

## 14. Non-goals

- Image-to-build / vision planner context expansion (beyond existing attachment chat).
- New major component families (sign, balcony, dormer, second floor, interior zones).
- Multiple rooms / side rooms / bedroom wings.
- Persistence, versioning, auth, Cloudflare Agents, D1, R2, AI Gateway integration.
- Raw voxel coordinate editing or LLM-authored `ComponentPlanV2` / compile IR.
- Full blueprint JSON rewrites from the LLM.
- Weakening `validateGenericBuildingV2` rules to satisfy the model.
- Large deterministic phrase tables for style (`makeWelcoming()` etc.).

---

## 15. Final recommendation

**Take Option 2:** add `src/lib/builder/semantic/` as the single source of planner-facing context (summary, material tags, rich affordances, style-intent hints), wire it through `buildPlannerUserPrompt` and repair prompts, and add **structured operation outcome summaries** so the assistant stops misreporting window counts.

**First implementation step:** Add `materialStyleDescriptors.ts` + `getSemanticBuildSummaryForPlanner` with tests for `stone_workshop_v2` and `porch_house_v2`, without changing routing or LLM calls — validate rendered text in snapshots, then integrate into the planner user prompt in step 2.

This keeps the AI/code boundary intact (operations → materialize → validate → generate) while giving the planner the semantic and surface-specific judgment layer manual testing showed is missing.

---

## Appendix: Key file index (current repo)

| Concern | Primary files |
|---------|----------------|
| Chat route | `src/app/api/builder/chat/route.ts` |
| Tool orchestration | `src/lib/builder/runBuilderChatTurn.ts`, `planAndRefineBuildingPreview.ts` |
| Routing | `shouldRunRefinementTool.ts`, `shouldRunGenerationTool.ts`, `classifyRefinementPrompt.ts` |
| Deterministic ops | `mapRefinementPromptToOperations.ts` |
| LLM planner | `planBlueprintOperationsWithLlm.ts`, `callWorkersAiJsonPlanner.ts`, `buildPlannerPrompt.ts` |
| Schema | `plannerResponseSchema.ts`, `blueprintOperationsV2.ts` |
| Validate / materialize | `validatePlannerOperations.ts`, `normalizePlannerOperation.ts`, `materializePlannerOperations.ts`, `componentOperationRegistry.ts` |
| Apply | `applyBlueprintOperationsV2.ts` |
| Window capacity | `windowFacadeCapacity.ts`, `validateGenericBuildingV2.ts` |
| Affordances | `getBlueprintAffordancesForPlanner.ts`, `buildAllowedOperationsSchema.ts` |
| Generator IR | `compileGenericBuildingV2Plan.ts`, `emitFromComponentPlanV2.ts`, `generateStructure.ts` |
| Tool → model | `formatToolResultForModel.ts`, `builderSystemPrompt.ts` |
| Safety | `guardNoToolChangeClaims.ts`, `applyChatOnlyResponseSafety.ts` |
| Tests | `src/lib/builder/__tests__/*.test.ts` (279 tests in generator suite) |
