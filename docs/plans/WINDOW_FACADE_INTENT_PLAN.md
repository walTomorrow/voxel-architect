# PLAN: Window and Facade Intent Architecture

**Branch:** `feature/builder-semantic-affordances`  
**Status:** Planning only — no implementation in this document.  
**Prerequisite:** Component operations + semantic planner context (summary, rich affordances, operation outcomes) already landed on this branch.

**Goal:** Design a robust, modular facade/window intent system for routing, planning, validation, and summarization — without one-off regex patches or LLM-authored geometry.

**Constraint:** The LLM may only propose constrained semantic operations (`addComponent` / `updateComponent` / `removeComponent` / `setMaterialPalette`). The server normalizes, validates, materializes, and applies.

---

## 1. Current failure analysis

Manual test sequence (stone workshop) vs current code paths.

### Failure 1 — “add more windows but not to the front of the workshop”

| Question | Answer |
|----------|--------|
| **Routing** | **Deterministic** (`planAndRefineBuildingPreview` → `classifyRefinementPrompt` → `literal` → `mapRefinementPromptToOperations` ok). |
| **Deterministic override?** | **Yes.** `mapRefinementPromptToOperations.ts` lines 367–382: `\b(more windows\|add windows\|extra windows)\b` bumps **primary front** `window_group` count by +1. |
| **Non-front guard?** | **Failed.** `mentionsNonFrontWindowSurfaces()` (`semantic/detectNonFrontWindowIntent.ts`) does **not** match **“not to the front”** — patterns only cover `not on the front` / `not the front`, not `not to the front`. Prompt also contains `front` + `window`, so the front-only short-circuit can return false before exclusions are considered. |
| **Classifier** | `classifyRefinementPrompt.ts`: `hasLiteralMechanicalSignals` matches `\b(more windows\|add windows\|…)\b` → **`literal`**, so LLM never runs. |
| **Planner context** | N/A (deterministic). Semantic summary lists per-face windows but **no** `requestedFaces` / `excludedFaces` / `countMode`. |
| **Planner output** | N/A. |
| **Validation / scope** | `validateOverbroadPlannerPlan` not used on deterministic path. |
| **Summary** | Activity: “Matched deterministic edit” / “Planned: Add front window”; apply label uses delta wording from mapper, not structured intent. |
| **Responsible code** | `mapRefinementPromptToOperations.ts` (front-window block), `detectNonFrontWindowSurfaces.ts` (incomplete exclusions), `classifyRefinementPrompt.ts` (literal precedence). |

**Root cause:** Front-window shortcut is still the default for generic “more/add windows” phrases; exclusion phrasing is handled by a fragile regex helper, not a first-class intent object.

---

### Failure 2 — “Could you add a window to the right side instead?”

| Question | Answer |
|----------|--------|
| **Routing** | **LLM** (mapper miss → `runLlmPlannerPath`). |
| **Deterministic override?** | No match in mapper (no “more windows” on front; has “right side”). |
| **Classifier** | Likely `literal` from `add a window` in `hasLiteralMechanicalSignals`, but mapper returns `ok: false` → fallback LLM. |
| **Planner context** | `buildPlannerContextForLlm` includes semantic summary + rich affordances; **no structured intent block**. `inferWindowSurfaceFromPrompt` used only at **materialize** time, not in planner prompt. |
| **Planner output** | Correct family: `addComponent` `window_group` on `main-room.right`. |
| **Validation** | `validatePlannerOperations` + materialize OK. |
| **Scope** | `detectDirectComponentRequest` may match `add a window` → `validateOverbroadPlannerPlan` requires **exactly one** op — OK if single add. |
| **Summary** | `operationResultSummary` can say “Added window_group … with N window(s)”; assistant/LLM may still paraphrase as “added a window” without emphasizing **total count on that face**. |
| **Responsible code** | LLM path works; gaps are **count semantics in summaries** and lack of **deterministic builder** for obvious single-face adds. |

---

### Failure 3 — “add a window to the back”

| Question | Answer |
|----------|--------|
| **Routing** | **LLM** (same as failure 2). |
| **Planner** | `addComponent` on `main-room.back` — correct. |
| **Materialize** | `inferWindowSurfaceFromPrompt` + `inferWindowCountFromPrompt` (`a window` → count 1). |
| **Summary** | Same as failure 2. |
| **Responsible code** | LLM + registry materialization; should be **deterministic** under Option D. |

---

### Failure 4 — “add a window to both the left and right sides”

| Question | Answer |
|----------|--------|
| **Routing** | **LLM** (mapper has no multi-face window builder). |
| **Classifier** | `literal` signals (`add a window`) but mapper fails → LLM. |
| **Planner context** | No `requestedFaces: [left, right]` or `maxOperationCount: 2` for this intent class. |
| **Planner output** | **JSON_PARSE_FAILED** — model returned unparseable JSON or repair exhausted (`planBlueprintOperationsWithLlm.ts` → `parsePlannerRawText` / repair). |
| **Validation** | Never reached. |
| **Scope** | `validateOverbroadPlannerPlan` only enforces single-op for **direct component** intents from `detectDirectComponentRequest`; multi-face window request is **not** classified as direct, so multi-op is allowed — but LLM failed earlier. |
| **Responsible code** | No **deterministic two-op builder** for compound faces; LLM asked to invent 2 ops without tight intent scaffolding; `MAX_PLANNER_OPERATIONS = 3` is sufficient but **prompt/schema do not require** one op per requested face. |

**Root cause:** Compound window edits are delegated to a general JSON planner without a dedicated operation builder or guaranteed parse path.

---

### Failure 5 — “now make the front only have one window please”

| Question | Answer |
|----------|--------|
| **Routing** | **LLM** (no deterministic pattern for “only have one window” / total count 1). |
| **Deterministic override?** | No. |
| **Planner context** | No `countMode: "total"`, `requestedCount: 1`, `operationScope: "window_only"`. |
| **Planner output** | **Wrong:** `updateComponent` front windows to 1 **and** `removeComponent` porch (unrelated). |
| **Validation** | Per-op validation passed; **`validateOverbroadPlannerPlan` did not run** — `detectDirectComponentRequest` returns **null** (no match for “front only have one window”). |
| **Scope** | No `validatePlanAgainstIntentScope` for `window_only`. |
| **Summary** | May describe front count correctly while omitting erroneous porch removal. |
| **Responsible code** | LLM overreach; missing **intent scope validator**; prompt says minimum-change for direct component requests but not for **narrow window count** requests. |

**Root cause:** Narrow window-only total-count requests are treated as open-ended semantic edits; nothing forbids porch removal.

---

### Failure 6 — “make the entire workshop more welcoming”

| Question | Answer |
|----------|--------|
| **Routing** | **LLM** (`classifyRefinementPrompt` → `semantic` via `welcoming`). |
| **Planner** | Multi-op: porch + front windows + right windows — **plausible** for style intent. |
| **Scope** | `isSemanticStyleTransformRequest` → **`validateOverbroadPlannerPlan` skipped** (multi-op allowed). |
| **Risk** | Without `operationScope: "style"`, model may still over-edit (e.g. remove features). |
| **Summary** | Multi-op summaries need per-outcome lines; user noted confusion on counts elsewhere. |
| **Responsible code** | Correct high-level path; needs **style scope** hints and affordance-driven suggestions, not window-only rules. |

---

### Cross-cutting gaps (from code inspection)

| Area | Current behavior | Gap |
|------|------------------|-----|
| `inferWindowSurfaceFromPrompt` | Single surface; first match left/right/back/front | No multi-face, no exclusions |
| `mapRefinementPromptToOperations` | Front `count + 1` for “more/add windows” | No surface-aware builder; exclusion regex incomplete |
| `detectNonFrontWindowSurfaces` | Band-aid before front block | Not a intent model; easy to miss phrasing |
| `classifyRefinementPrompt` | `literal` wins over mapper miss → LLM, but **literal wins over mapper hit** → wrong det | No `window_intent` class |
| `validateOverbroadPlannerPlan` | Only `detectDirectComponentRequest` shapes | No `window_only` / `count total` scope |
| `getBlueprintAffordancesForPlanner` / `richAffordances` | Per-face capacity, reasons | Not used to **build** ops |
| `buildPlannerContextForLlm` | Summary + affordances + style hints | No **parsed intent JSON** |
| `operationResultSummary` | Total count on `updateComponent` patch | Good for updates; doesn’t assert **no excluded-face changes** |
| Tests | `detectNonFrontWindowIntent.test.ts`, mapper front guard | No table-driven intent parser; no scope validator |

**Files inspected:** `shouldRunRefinementTool.ts`, `looksLikeComponentEditRequest.ts`, `classifyRefinementPrompt.ts`, `mapRefinementPromptToOperations.ts`, `buildPlannerPrompt.ts`, `planBlueprintOperationsWithLlm.ts`, `validatePlannerOperations.ts`, `materializePlannerOperations.ts`, `componentOperationRegistry.ts`, `windowFacadeCapacity.ts`, `getBlueprintAffordancesForPlanner.ts`, `semantic/*`, `operationResultSummary.ts`, `applyBlueprintOperationsV2.ts`, `validateOverbroadPlannerPlan.ts`, `detectDirectComponentRequest.ts`.

---

## 2. First-principles model

### Facade / surface in v2 blueprints

- A **façade** is a **`RoomFace`** on the root room: `front` | `back` | `left` | `right` (not `roof`).
- Exposed to the system as **`RoomSurfaceRef`**: `main-room.front`, `main-room.left`, etc.
- **Capacity** is derived from room footprint + wall thickness via `windowFacadeCapacity.ts` / `validateGenericBuildingV2.ts` (`maxWindowSlotsOnFacade`).

### What is `window_group`?

| Lens | Meaning |
|------|---------|
| **Blueprint** | Typed component (`window_group`) attached to one `targetSurface` with `count`, `layout`, `heightBand`. |
| **Semantics** | An **opening group** on one façade — `count` is the number of window slots on that face, not voxels. |
| **Generator** | Input to façade placement / pane emission after compile. |

It is **all three**: a component record, a façade feature, and the editable unit for window operations.

### Phrase semantics (canonical)

| User phrase | Meaning | `countMode` | `targetFaces` |
|-------------|---------|-------------|---------------|
| “add a window to the right” | One more opening on right (or create group with total 1) | `delta` (+1) or unspecified → min(current+1, max) | `[right]` |
| “add windows to left and right” | Two faces, one group each (or update each) | `unspecified` / per-face default | `[left, right]` |
| “add more windows” (no face) | Increase on **default** face(s) — must **not** assume front if exclusions present | `delta` | affordance-derived |
| “add more windows but not front” | Increase on **non-front** faces with capacity; never front | `delta` | `targetFaces = available \ excluded` |
| “make the front only have one window” | **Total** count on front = 1 | `total` | `[front]` | `requestedCount: 1` |
| “remove the side windows” | Remove `window_group` on left/right (or named groups) | — | explicit faces or ids |
| “more welcoming” | **Style** scope — porch, materials, multi-face windows allowed | — | `operationScope: "style"` |

### Count representation

- **Blueprint field `window_group.count` is always a TOTAL** on that surface (validator + generator assume total slots).
- **User language** may mean total (“only one window”, “set to 1”) or delta (“one more”, “add a window”).
- The intent parser must set **`countMode`**: `"total"` | `"delta"` | `"unspecified"`.
- Summaries and `formatToolResultForModel` must **always** state **final total** after apply, with optional “was N”.

### Side names → internal faces

| Natural language | `RoomFace` |
|------------------|----------|
| front, façade (default entrance) | `front` |
| back, rear | `back` |
| left, left side, left-hand | `left` |
| right, right side | `right` |
| sides (plural, no chirality) | `left` + `right` or affordance-guided |
| not front / except front / but not on the front | `excludedFaces: [front]` |

### Overbroad plan (narrow request)

For **`operationScope: "window_only"`**:

- **Allowed:** `addComponent`/`updateComponent`/`removeComponent` where `componentType === "window_group"` on allowed faces only.
- **Disallowed:** porch/chimney/room/roof/palette changes unless user also asked for them.
- **Multi-op:** only when `targetFaces.length > 1` or multiple explicit window actions; max ops = `targetFaces.length` (cap at `MAX_PLANNER_OPERATIONS`).

For **`operationScope: "style"`** (welcoming, rustic): multi-op allowed; still forbid **unrelated removes** unless explicit.

### Proposed canonical intent terms

```ts
type CountMode = "total" | "delta" | "unspecified";
type OperationScope = "window_only" | "facade_feature" | "style" | "structural";

type FacadeWindowIntent = {
  kind: "window_intent";
  requestedFaces: RoomFace[];   // explicit mentions
  excludedFaces: RoomFace[];    // "not front", etc.
  targetFaces: RoomFace[];      // resolved: requested minus excluded, or affordance-filled
  countMode: CountMode;
  requestedCount?: number;      // for total mode or explicit numerals
  plurality: "single" | "plural" | "unspecified";
  operationScope: "window_only";
  confidence: "high" | "medium" | "low";
  rawMatches: string[];
};
```

Style prompts use a separate `StyleTransformIntent` (existing `detectStyleIntents` / `classifyRefinementPrompt` semantic path).

---

## 3. Proposed facade/window intent parser

**Module (proposed):** `src/lib/builder/windows/parseFacadeWindowIntent.ts`  
**Export:** `parseFacadeWindowIntent(prompt: string, blueprint: GenericBuildingBlueprintV2): FacadeWindowIntent | null`

**Rules (deterministic, no blueprint mutation):**

1. If no window/façade/opening signals → `null` (not a window intent).
2. Extract **excludedFaces** first (not front, except front, but not on the front, **not to the front**, etc.).
3. Extract **requestedFaces** from side/back/left/right phrases; support **compound** (`left and right`, `both sides`).
4. Resolve **targetFaces**:
   - If `requestedFaces` non-empty → use them minus exclusions.
   - If empty but exclusions present + “more/add windows” → `targetFaces` = faces where affordances allow add/increase, excluding excluded.
   - If empty and no exclusions → **do not default to front** without high confidence; prefer `confidence: "low"` → LLM fallback with intent context.
5. Parse numerals and “only/just/exactly N” → `countMode: "total"`, `requestedCount`.
6. Parse “a window” / “one more” / “more windows” → `plurality` + `countMode: "delta"` or `unspecified`.
7. Set `operationScope: "window_only"`; set `confidence` from match coverage.

**Examples**

| Prompt | requestedFaces | excludedFaces | targetFaces | countMode |
|--------|----------------|---------------|-------------|-----------|
| add more windows but not to the front | [] | [front] | [left, right, back] ∩ available | delta |
| add a window to the right side | [right] | [] | [right] | delta/unspecified |
| left and right sides | [left, right] | [] | [left, right] | unspecified |
| make the front only have one window | [front] | [] | [front] | total, requestedCount: 1 |
| make it more welcoming | — | — | — | **null** (style, not window_intent) |

### Parser options compared

| Option | Pros | Cons |
|--------|------|------|
| **A. Lightweight regex** | Fast, matches current codebase style | Grows brittle (today’s `detectNonFrontWindowIntent`) |
| **B. Formal phrase classifier** | Table-driven, testable tokens | Upfront grammar design |
| **C. LLM intent extraction** | Flexible language | Extra call, schema drift, violates “server owns semantics” |
| **D. Hybrid deterministic + LLM for style only** | Clear boundary; testable faces/counts | Two paths to maintain |

### Recommendation for this branch: **Option D**

- Implement **B-style table-driven rules** inside a **deterministic parser** (structured as phrase tables + resolution, not scattered regex in mapper).
- **Do not** use LLM for face/count/exclusion extraction on this branch.
- Deprecate `detectNonFrontWindowSurfaces` by folding into `parseFacadeWindowIntent`.

---

## 4. Routing strategy

### Current `auto` flow (simplified)

```
shouldRunRefinementTool → planAndRefineBuildingPreview
  → classifyRefinementPrompt
       semantic/structural → LLM
       literal → mapRefinementPromptToOperations
         hit → deterministic apply
         miss → LLM
```

### Proposed flow

```
parseFacadeWindowIntent(prompt, blueprint)
  → if window_intent with confidence high|medium AND targetFaces resolvable
       → buildWindowOperationsFromIntent (deterministic)
       → if ok → apply (plannerPath: "window_det")
       → if ambiguous → LLM with intent block + scope
  → else if style semantic → LLM (scope: style)
  → else legacy literal mapper (non-window) 
  → else LLM fallback
```

### Routing rules

| Condition | Route |
|-----------|--------|
| `window_only` + high confidence + ≤3 target faces + builder succeeds | **Deterministic window builder** |
| `window_only` + excluded front + “more windows” | **Never** `mapRefinementPromptToOperations` front block |
| Multi-face (`left` + `right`) | **Window builder** emits 2 ops; **not** general LLM unless builder fails |
| `window_only` + low confidence | LLM with **intent context** + `validatePlanAgainstIntentScope` |
| `style` (welcoming, etc.) | LLM; `operationScope: style`; multi-op allowed |
| Explicit room/roof/porch literal (no window intent) | Existing mapper |

### Exact file changes (routing)

| File | Change |
|------|--------|
| `planAndRefineBuildingPreview.ts` | Insert window-intent resolution **before** `mapRefinementPromptToOperations`; new `plannerPath: "window_det"` |
| `classifyRefinementPrompt.ts` | Add `window_literal` or check intent before classifying “more windows” as generic literal |
| `mapRefinementPromptToOperations.ts` | **Remove** front-window block (or guard only when `parseFacadeWindowIntent` null and no exclusions) |
| `detectNonFrontWindowSurfaces.ts` | **Delete** after migration to parser |
| `shouldRunRefinementTool.ts` | Ensure compound window phrases (`left and right`, `both sides`) always `wantsEdit` — likely OK via `looksLikeComponentEditRequest` / `BUILDING_PARTS` |

---

## 5. Dedicated window operation builder

### Proposed API

`src/lib/builder/windows/buildWindowOperationsFromIntent.ts`

```ts
buildWindowOperationsFromIntent(
  intent: FacadeWindowIntent,
  blueprint: GenericBuildingBlueprintV2,
  affordances: WindowFacadeAffordances,
): { ok: true; operations: ApplyableBlueprintOperationV2[]; planLabel: string }
  | { ok: false; reason: string; rejectionCode?: ... }
```

### Rules (server-side)

For each `face` in `intent.targetFaces` (stable order: left, right, back, front):

| State | Action |
|-------|--------|
| No `window_group` on face, `canAddGroup` | `addComponent` `window_group` with `targetSurface`, count from total/delta/defaults |
| Group exists, `countMode: "total"` | `updateComponent` set `count` to `requestedCount` (clamped) |
| Group exists, `countMode: "delta"` | `updateComponent` set `count` to `current + delta` (default delta 1) |
| `countMode: unspecified` + plurality single | `current + 1` or add with count 1 |
| At capacity | Skip face or fail with clear reason aggregating alternatives |

**Hard rules:**

- **Never** emit `removeComponent` porch/chimney for `window_only`.
- **Never** target `excludedFaces`.
- **Never** emit more than one window op per face per turn (idempotent merge).
- Reuse `materializePlannerOperations` / `sanitizeWindowGroupComponent` for final clamping.

### Options compared

| Option | Summary |
|--------|---------|
| **A. All clear window requests deterministic** | Simplest UX; largest builder |
| **B. Single-face deterministic; compound LLM** | Leaves failure 4 on LLM |
| **C. LLM only + stricter context** | Keeps JSON_PARSE risk |
| **D. Parser + builder first; LLM fallback** | Best match to failures 1–5 |

### Recommendation: **Option D** (aligns with your bias)

Compound left+right becomes **two deterministic ops** — no JSON planner required for success path.

---

## 6. Operation scoping / overbroad plan validation

### New layer

`src/lib/builder/windows/validatePlanAgainstIntentScope.ts`

```ts
validatePlanAgainstIntentScope(
  operations: readonly BlueprintOperationV2[],
  intent: FacadeWindowIntent | StyleTransformIntent | null,
): PlannerRejection | { ok: true }
```

### `window_only` rules

| Rule | Enforcement |
|------|-------------|
| Allowed op types | Only `window_group` add/update/remove |
| Disallowed | porch, chimney, room, roof, palette |
| Excluded faces | No op targeting `main-room.{excluded}` |
| Requested faces | Each op’s surface ∈ `targetFaces` (when requested non-empty) |
| Op count | `operations.length <= targetFaces.length` (and ≤ `MAX_PLANNER_OPERATIONS`) |
| Total count request | At most one update per face; front total 1 → **only** front window op |

### Extend existing `validateOverbroadPlannerPlan.ts`

- Keep direct porch/chimney rules.
- Delegate window-only checks to `validatePlanAgainstIntentScope` when `parseFacadeWindowIntent` returns high/medium confidence.
- On failure: `OVERBROAD_OPERATION_PLAN` with detail listing disallowed op; optional **repair** = drop unrelated ops and re-validate (prefer reject for safety on this branch).

### Failure 5 fix

“make the front only have one window” → intent `window_only`, `total`, `requestedCount: 1` → builder emits **one** `updateComponent` → scope validator rejects plan with `removeComponent` porch.

---

## 7. Window affordances as canonical source

### Proposed module

**`src/lib/builder/windows/windowFacadeAffordances.ts`** (canonical)

- Wraps `getMaxWindowSlotsForSurface`, `findWindowGroupOnSurface`, trial apply from `getBlueprintAffordancesForPlanner`.
- Consumed by: intent parser (resolution), operation builder, planner context renderer, scope validator.

```ts
type WindowFaceAffordance = {
  face: RoomFace;
  surfaceRef: RoomSurfaceRef;
  existingGroupId?: string;
  currentCount: number;
  maxCount: number;
  minCount: number;
  canAddGroup: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  canSetTotal: (n: number) => AffordanceAction;
  recommendedOperation:
    | { op: "addComponent"; componentType: "window_group"; targetSurface: RoomSurfaceRef }
    | { op: "updateComponent"; id: string; patchHints: { count: number } };
  reasons: string[];
  alternatives: string[];
};
```

### Where logic lives

| Concern | Location |
|---------|----------|
| Geometry / max slots | `windowFacadeCapacity.ts` (keep) |
| Trial validate increase | shared helper used by affordances |
| Planner text | `windowFacadeAffordances.ts` → `renderWindowAffordancesForPlanner()` |
| Rich “why not” copy | Extend or call from `richAffordances.ts` — **do not duplicate** capacity math in prompt strings |

**`getBlueprintAffordancesForPlanner.ts`** remains the legacy aggregate; window domain code imports shared primitives.

---

## 8. Planner prompt/schema implications

### What still uses the LLM

- **Ambiguous** window intent (`confidence: low`, conflicting faces).
- **Style** transforms (welcoming, medieval).
- **Non-window** component edits (porch depth, roof, materials).
- **Structural** unsupported → `unsupported` JSON.

### Prompt additions (fallback only)

Inject structured block:

```text
PARSED_WINDOW_INTENT (server authoritative):
requestedFaces: [left, right]
excludedFaces: [front]
countMode: unspecified
operationScope: window_only
maxOperationCount: 2
allowedComponentTypes: [window_group]
```

**Examples to add** to `PLANNER_EXAMPLES_BLOCK`:

- Front total 1 → single `updateComponent` front-windows count 1; **no** porch remove.
- Left + right → two `addComponent` ops.
- Not front → **no** front `updateComponent`.

**Prohibitions:**

- Do not remove porch/chimney/materials for `window_only` context.
- Window counts are **totals** per face.

### JSON_PARSE_FAILED mitigation

| Mitigation | Rationale |
|------------|-----------|
| Deterministic builder for ≤3 face window intents | Removes compound cases from LLM |
| Keep JSON Mode + repair | For style/ambiguous only |
| Do not shrink schema for window fallback | Parse failures are often multi-op complexity, not schema size |

---

## 9. Component modularity

### Reusable “component edit domain” pattern

```ts
interface ComponentEditDomain<TIntent, TAffordance> {
  detectIntent(prompt: string, blueprint: GenericBuildingBlueprintV2): TIntent | null;
  getAffordances(blueprint: GenericBuildingBlueprintV2): TAffordance;
  buildOperations(
    intent: TIntent,
    affordances: TAffordance,
    blueprint: GenericBuildingBlueprintV2,
  ): BuildResult;
  validatePlanScope(
    operations: readonly BlueprintOperationV2[],
    intent: TIntent,
  ): ScopeValidationResult;
  summarizeOutcomes(
    before: GenericBuildingBlueprintV2,
    after: GenericBuildingBlueprintV2,
    operations: readonly ApplyableBlueprintOperationV2[],
  ): OperationOutcomeSummary[];
}
```

**Domains later:** `windows`, `porch`, `chimney`, `palette`, `room_dimensions`.

### Implement full abstraction now?

**No** — shape window modules with this interface **in comments / file layout** only; extract shared `ComponentEditDomain` type in a follow-up if a second domain (porch) migrates.

**Compatibility:** `parseFacadeWindowIntent` + `buildWindowOperationsFromIntent` should be extractable into `WindowsEditDomain` without changing apply/validate pipeline.

---

## 10. Implementation options

### Option 1: Narrow patch

| | |
|--|--|
| **Scope** | Fix `detectNonFrontWindowSurfaces` for “not to the front”; one test |
| **Pros** | Tiny diff |
| **Cons** | Failure 4, 5, summary issues remain |
| **Risk** | Low |
| **Files** | `detectNonFrontWindowIntent.ts`, mapper guard |
| **Failures fixed** | Partial **#1** only |
| **This branch?** | **No** — contradicts first-principles goal |

### Option 2: Intent parser + scope validation

| | |
|--|--|
| **Scope** | `FacadeWindowIntent` + routing + `validatePlanAgainstIntentScope`; LLM still builds ops |
| **Pros** | Stops porch removal on narrow requests; better prompt context |
| **Cons** | JSON_PARSE_FAILED for compound faces may persist |
| **Risk** | Medium |
| **Files** | `windows/parse*.ts`, `validatePlanAgainstIntentScope.ts`, `buildPlannerPrompt.ts`, `planAndRefineBuildingPreview.ts` |
| **Failures fixed** | **#1** (prompt), **#5**; partial **#4** |
| **This branch?** | Possible half-step |

### Option 3: Intent parser + deterministic window operation builder (recommended)

| | |
|--|--|
| **Scope** | Parser + `windowFacadeAffordances` + `buildWindowOperationsFromIntent` + routing + scope validator + summaries |
| **Pros** | Addresses **all six** failure themes; modular; testable tables |
| **Cons** | ~1–2 weeks; touches routing + tests |
| **Risk** | Medium — must not break porch/chimney paths |
| **Files** | New `src/lib/builder/windows/*`, `planAndRefineBuildingPreview.ts`, trim `mapRefinementPromptToOperations.ts`, extend `operationResultSummary.ts`, tests |
| **Failures fixed** | **#1–#5** directly; **#6** unchanged (style path) |
| **This branch?** | **Yes** |

### Option 4: Full component edit domain abstraction now

| | |
|--|--|
| **Scope** | General framework + all domains |
| **Pros** | Clean long-term |
| **Cons** | Too large; conflicts with focused branch |
| **Risk** | High |
| **This branch?** | **Defer** |

---

## 11. Recommended implementation plan

Aligned to **Option 3**. Adjust stages after review.

### Stage 1 — Canonical window affordances

- Add `src/lib/builder/windows/windowFacadeAffordances.ts`.
- Unit tests: `stone_workshop_v2` — front has group, right/back missing, left optional, capacity edges.
- **No routing change.**

### Stage 2 — Facade window intent parser

- Add `parseFacadeWindowIntent.ts` + phrase table tests (manual export phrases §12).
- Replace `detectNonFrontWindowSurfaces` usages with parser output.
- **No apply change yet.**

### Stage 3 — Deterministic window operation builder

- Add `buildWindowOperationsFromIntent.ts`.
- Table tests: right add, back add, front total 1, left+right two ops, not-front delta distribution.
- Wire in `resolveRefinementPlan` **before** mapper front-window block.

### Stage 4 — Intent scope validation

- Add `validatePlanAgainstIntentScope.ts`.
- Call from `validatePlannerJsonAndOperations` when LLM fallback used with parsed intent.
- Reject porch remove on `window_only` (**failure #5**).

### Stage 5 — Routing integration

- `planAndRefineBuildingPreview.ts`: window_det path, activity labels.
- `classifyRefinementPrompt.ts`: do not treat resolved `window_only` as generic literal front bump.
- `mapRefinementPromptToOperations.ts`: remove or gate front-window section.

### Stage 6 — Operation summaries

- Extend `operationResultSummary.ts` for multi-face plans: per-face totals, “no change on excluded faces”.
- Ensure `formatToolResultForModel` lists each OUTCOME line.

### Stage 7 — Planner prompt (fallback only)

- `buildPlannerContextForLlm.ts`: inject `renderParsedWindowIntentText(intent)` when confidence low.
- Add examples / prohibitions from §8.

### Stage 8 — Docs + manual checklist

- Update `CHANGE.md`.
- Manual retest: exact export sequence.

**Estimated scope:** Stages 1–6 ≈ core; 7–8 ≈ polish. **~800–1200 LOC** including tests.

---

## 12. Testing plan

### Intent parsing (table-driven)

| Prompt | Expected |
|--------|----------|
| add more windows but not to the front | excluded [front]; targets non-front only |
| add more windows, but not on the front | same |
| add a window to the right side | requested [right] |
| add windows to the left and right sides | requested [left, right] |
| add a window to both the left and right sides | requested [left, right] |
| put windows on the back | requested [back] |
| make the front only have one window | requested [front], total 1 |
| set the front windows to 1 | total 1 front |
| remove the side windows | window_only remove left/right groups |
| make it more welcoming | **null** window intent (style) |

### Affordances

- Front: existing group, at capacity behavior.
- Right/back: missing group → `canAddGroup`.
- `canSetTotal(1)` on front when count > 1.

### Operation building

- Right no group → single `addComponent`.
- Back no group → single `addComponent`.
- Front total 1 → single `updateComponent` only.
- Left+right → **two** ops, no porch/chimney.
- Not front + more windows → ops only on non-front faces with capacity.
- Existing group + “add a window” → `updateComponent` count+1, not second group.

### Scope validation

- window_only + remove porch → reject.
- window_only + palette → reject.
- excluded front + front update → reject.
- requested right + back op → reject.

### Integration (`planAndRefineBuildingPreview`)

- Mock LLM only for style; assert deterministic path for failures **#1, #4, #5**.
- Export phrases from manual test as fixtures.

### Commands

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

---

## 13. Definition of done

- [ ] “add more windows but not to the front” — **no** front window count change.
- [ ] “add a window to the right side” — succeeds on deterministic path (LLM optional).
- [ ] “add a window to the back” — succeeds.
- [ ] “add windows to left and right sides” — **two ops** or clear rejection; **not** `JSON_PARSE_FAILED`.
- [ ] “make the front only have one window” — front count = 1; **porch unchanged**.
- [ ] Summaries use **total** count per face (before → after).
- [ ] Tests cover §12.
- [ ] Porch/chimney/component tests still pass.
- [ ] LLM never emits voxels / ComponentPlan / full blueprint JSON.

---

## 14. Non-goals

- Second floors, interior rooms, new component families (dormers, balconies, signs).
- Image-to-build planner context.
- Raw voxel / coordinate editing.
- Weakening `validateGenericBuildingV2`.
- Replacing `GenericBuildingBlueprintV2`.
- Full `ComponentEditDomain` framework in this branch (interface-only compatibility OK).
- LLM-based intent extraction for faces/counts on this branch.

---

## 15. Final recommendation

### Recommended option: **Option 3** — Window intent parser + deterministic window operation builder + scope validation (hybrid **Option D** routing)

**Why it solves the observed failures**

| Failure | Mechanism |
|---------|-----------|
| **#1** not front | `excludedFaces` + builder targets only non-front; mapper front shortcut removed |
| **#2–#3** right/back | Deterministic builder; consistent summaries |
| **#4** left+right | Two ops from builder; no LLM JSON for clear compound intent |
| **#5** front only one | `countMode: total` + scope validator blocks porch remove |
| **#6** welcoming | Unchanged style path; window_only rules do not apply |

**Implement first**

1. `windowFacadeAffordances.ts` (Stage 1)  
2. `parseFacadeWindowIntent.ts` + tests (Stage 2)  
3. `buildWindowOperationsFromIntent.ts` + routing hook (Stage 3)

**Defer**

- Full `ComponentEditDomain` generic abstraction (Option 4).
- LLM intent extraction (Option C).
- Narrow regex-only patches (Option 1) except as temporary tests during migration.

**Risks and mitigations**

| Risk | Mitigation |
|------|------------|
| Wrong face resolution when prompt vague | `confidence: low` → LLM fallback **with** intent block + scope validator |
| Regress porch/chimney deterministic mapper | Keep non-window paths in `mapRefinementPromptToOperations`; integration tests |
| Op count > 3 for many faces | Cap targets; reject with clear message |
| Duplicate window groups | Builder checks `canAddGroup` / existing id per face |

**Architectural principle**

Treat **façade window editing** as a **constrained edit domain**: server parses intent, server builds operations, server validates scope, LLM only for ambiguity and style — never as the primary author of window placement logic.

---

## Appendix: Key file index (window-related)

| Concern | Current file | Proposed |
|---------|--------------|----------|
| Front-window shortcut | `mapRefinementPromptToOperations.ts` | Remove / gate |
| Non-front band-aid | `semantic/detectNonFrontWindowIntent.ts` | Replace with parser |
| Routing | `planAndRefineBuildingPreview.ts`, `classifyRefinementPrompt.ts` | Window_det path |
| Single-surface infer | `componentOperationRegistry.ts` `inferWindowSurfaceFromPrompt` | Used by materialize; parser is authoritative for routing |
| Capacity | `windowFacadeCapacity.ts` | Unchanged math |
| Affordances | `getBlueprintAffordancesForPlanner.ts`, `semantic/richAffordances.ts` | Feed `windows/windowFacadeAffordances.ts` |
| Overbroad | `validateOverbroadPlannerPlan.ts` | + `validatePlanAgainstIntentScope` |
| Summaries | `semantic/operationResultSummary.ts` | Per-face outcome lines |
| Planner prompt | `buildPlannerPrompt.ts`, `semantic/buildPlannerContextForLlm.ts` | Intent block for fallback |
| Tests | `semantic/__tests__/detectNonFrontWindowIntent.test.ts`, `mapRefinementPromptToOperations.test.ts` | `windows/__tests__/*` |
