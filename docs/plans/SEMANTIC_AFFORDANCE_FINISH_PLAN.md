# PLAN: Finish Builder Semantic Affordances

**Branch:** `feature/builder-semantic-affordances`  
**Status:** Planning only — no implementation in this document.  
**Prerequisite:** Window/facade domain (Option 3) and initial semantic module already landed on this branch.

**Goal:** Finish the broader semantic affordance objectives — structured style guidance, aesthetic restraint, and small summary/affordance polish — without expanding into new component families or a large planner rewrite.

---

## 1. Current branch status

This section reflects what is **already in code** on `feature/builder-semantic-affordances`, not aspirations.

### General semantic planner context

| Area | Files / functions | What it does |
|------|-------------------|--------------|
| Planner context assembly | `src/lib/builder/semantic/buildPlannerContextForLlm.ts` — `buildPlannerContextForLlm()`, `renderPlannerContextText()` | Bundles semantic summary, rich affordances, allowed-ops schema, and conditional style guidance into planner-facing blocks. |
| Planner user prompt | `src/lib/builder/buildPlannerPrompt.ts` — `buildPlannerUserPrompt()`, `PLANNER_SYSTEM_PROMPT` | Injects context via `buildPlannerContextForLlm`; system prompt has minimum-change rule, multi-op allowance for style, and canonical examples. |
| Planner repair | `src/lib/builder/plannerRepair.ts` — `buildPlannerRepairUserPrompt()` | Re-injects full planner context (including style guidance when detected) on repair. |
| Legacy affordances | `src/lib/builder/getBlueprintAffordancesForPlanner.ts` | Base porch/chimney/window affordances still used under rich layer. |
| Non-front window guard (legacy) | `src/lib/builder/semantic/detectNonFrontWindowIntent.ts` | Superseded for routing by `parseFacadeWindowIntent`; may still be referenced in tests. |

### Material / style descriptors

| Area | Files | What it does |
|------|-------|--------------|
| Material tags | `src/lib/builder/semantic/materialStyleDescriptors.ts` — `MATERIAL_STYLE_DESCRIPTORS`, `getMaterialStyleTags()`, `aggregatePaletteStyleDescriptors()`, `describePaletteMaterials()` | Maps palette slot values (e.g. `cobblestone`, `limestone_bricks`) to style tags (`rustic`, `refined`, `bright`, etc.). |
| Summary integration | `getSemanticBuildSummaryForPlanner.ts` | Includes `styleDescriptors` and `materialSummary` in planner semantic summary text. |

### Semantic build summary

| Area | Files | What it does |
|------|-------|--------------|
| Summary model | `getSemanticBuildSummaryForPlanner.ts` — `getSemanticBuildSummaryForPlanner()`, `renderSemanticBuildSummaryText()` | Building type, proportions, materials, style tags, roof, features, per-face window state (count/max/at capacity), missing features, suggested next moves. |
| Tests | `semantic/__tests__/semanticBuildSummary.test.ts` | `stone_workshop_v2`, `porch_house_v2` coverage. |

### Rich explanatory affordances

| Area | Files | What it does |
|------|-------|--------------|
| Rich layer | `src/lib/builder/semantic/richAffordances.ts` — `getRichBlueprintAffordancesForPlanner()`, `renderRichAffordancesText()` | Wraps base affordances with `available` / `reason` / `alternatives` for porch (add/widen/deepen/remove), chimney (add/remove), and per-face windows (addGroup/increaseCount/removeGroup). Notes `frontWindowsAtCapacity`. |
| Tests | `semantic/__tests__/richAffordances.test.ts` | Porch widen, front capacity, side alternatives. |

### Style intent guidance (partial)

| Area | Files | What it does |
|------|-------|--------------|
| Detection + library | `src/lib/builder/semantic/styleIntentGuidance.ts` — `STYLE_INTENT_HINTS`, `detectStyleIntents()`, `renderStyleIntentGuidanceForPlanner()` | Six intents (`welcoming`, `rustic`, `sturdy`, `bright`, `medieval`, `refined`) with regex triggers and 2-line static guidance each. |
| Wiring | `buildPlannerContextForLlm.ts` | Calls `detectStyleIntents(userRequest)` and appends rendered guidance only when intents detected. |
| Tests | `semantic/__tests__/styleIntentGuidance.test.ts` | Detection + render; **no** integration tests with full planner prompt. |

**Not yet present:** affordance-aware filtering of guidance lines, dedicated aesthetic-restraint block, style-deficit derivation from summary, or planner-prompt integration tests.

### Operation result summaries

| Area | Files | What it does |
|------|-------|--------------|
| Per-op outcomes | `src/lib/builder/semantic/operationResultSummary.ts` — `summarizeOperationOutcomes()`, `buildAssistantSummaryFromOutcomes()` | Before→after counts, treatment labels, per-face window wording. |
| Window façade summaries | `buildWindowFacadeAssistantSummary()` | Used when `plannerPath === "window_det"` in `planAndRefineBuildingPreview.ts`. |
| Tool result formatting | `src/lib/builder/formatToolResultForModel.ts` | Injects `OUTCOME:` lines and planner path for model summarization. |
| Tests | `semantic/__tests__/operationResultSummary.test.ts` | Count totals, join formatting. |

### Window / façade domain

| Area | Files | What it does |
|------|-------|--------------|
| Intent types | `windows/facadeWindowIntentTypes.ts` | `FacadeWindowIntent` with `removeFaces`, `addOrUpdateFaces`, `sourceFaces`, `removeAllWindows`, `perFaceRequestedCounts`, `windowTreatment`, `operationScope: "window_only"`. |
| Parsing | `windows/parseFacadeWindowIntent.ts` | Face/exclusion/count/treatment parsing; remove-all; mixed remove+add; move/rebalance phrasing. Excludes style transforms via `isSemanticStyleTransformRequest()`. |
| Affordances | `windows/windowFacadeAffordances.ts` | Per-face window_group capacity, recommended ops, reasons. |
| Builder | `windows/buildWindowOperationsFromIntent.ts` | Deterministic remove-then-add/update; cleared-face simulation for same-batch removes. |
| Scope validation | `windows/validatePlanAgainstIntentScope.ts` | Rejects non-window ops on `window_only` intents. |
| Resolver | `windows/resolveWindowFacadePlan.ts` — `tryResolveWindowFacadePlan()` | Parse → build → scope validate → `validatePlannerOperations({ skipOperationCountCap: true })` → materialize. |
| Tests | `windows/__tests__/windowFacadeDomain.test.ts` | **44 tests** (parsing, ops, cap, scope, summaries, `window_det` integration). |

### Window treatment

| Area | Files | What it does |
|------|-------|--------------|
| Blueprint field | `genericBuildingV2.ts` — `windowTreatment` on `window_group` | Enum: `glass_block` \| `glass_pane` \| `open`; default `glass_block`. |
| Normalize / parse | `blueprints/windowTreatment.ts` | Prompt parsing for treatment phrases; labels for summaries. |
| Generator | `generation/components/v2/emitters/windows.ts`, `deriveApertureMasksV2.ts` | Emits blocks / panes / empty per treatment. |
| Materialize defaults | `componentOperationRegistry.ts` | New groups default to `glass_block`. |

### Routing / planner changes

| Area | Behavior |
|------|----------|
| `planAndRefineBuildingPreview.ts` — `resolveRefinementPlan()` | **All modes:** `tryResolveWindowFacadePlan()` runs **before** deterministic mapper and (in `auto`) before semantic classification. Success → `plannerPath: "window_det"`. |
| `classifyRefinementPrompt.ts` | `semantic` → LLM; `literal` → mapper or second `window_det` attempt; `structural` → LLM (unsupported). |
| `mapRefinementPromptToOperations.ts` | Front “more windows” shortcut gated when `parseFacadeWindowIntent` matches. |
| `validatePlannerOperations.ts` | `skipOperationCountCap` for `window_det`; LLM cap remains `MAX_PLANNER_OPERATIONS = 3`. |
| `validateOverbroadPlannerPlan.ts` | Single-op enforcement for **direct** component requests; **bypassed** for `isSemanticStyleTransformRequest()`. |
| `builderToolTypes.ts` | `BuilderPlannerPath` includes `"window_det"`. |

### Tests and validation status

| Suite | Status (per `CHANGE.md` + latest branch work) |
|-------|------------------------------------------------|
| Semantic module tests | `semanticBuildSummary`, `richAffordances`, `styleIntentGuidance`, `detectNonFrontWindowIntent`, `operationResultSummary` |
| Window domain tests | 44 tests in `windowFacadeDomain.test.ts` |
| Full generator suite | **351 passing** (reported green) |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass |

**Gap:** No dedicated tests for `buildPlannerUserPrompt()` / full rendered planner context. No mocked-LLM style-behavior tests.

### Known remaining window limitation (manual test)

**Prompt:** `remove all windows and then add one to the left and right side of the building`

**Observed:** Back window group removed; left/right **not** added in same turn. Follow-up prompt succeeded.

**Likely cause (code inspection):** `parseAddOrUpdateFaces()` mixed-add detection uses:

```text
\b(?:but|and)\s+(?:add|put|place)\b
```

The phrase **“and then add”** fails because `\s+` after `and` must be immediately followed by `add` — `then` breaks the match. With `hasMixedAdd === false`, the parser treats the prompt as **remove-only** (`removeAllWindows: true`, empty `addOrUpdateFaces`). Removes run; no add ops built.

Secondary gaps for the same phrase:

- No pattern for **“one to the left and right side”** (differs from tested **“one window on each side”**).
- `parseCountMode()` may not set `perFaceRequestedCounts` or `requestedCount: 1` for this phrasing.

**Assessment:** Small, localized parser fix — not a window-domain refactor. See §10.

---

## 2. Original semantic affordance objectives

| Objective | Status | Evidence | Remaining work |
|-----------|--------|----------|----------------|
| Semantic build summary | **Mostly complete** | `getSemanticBuildSummaryForPlanner.ts`, wired in `buildPlannerContextForLlm.ts`, tests on two presets | Add small style-planning fields: crowding summary, “already present” cues, optional style-deficit hints |
| Material / style descriptors | **Complete (baseline)** | `materialStyleDescriptors.ts`, used in summary | Optional: link descriptors to style-intent filtering (Option D) |
| Rich explanatory affordances | **Mostly complete** | `richAffordances.ts` for porch/chimney/windows | Add brief material-palette hints; roof/room update notes for style context only |
| Style-intent guidance | **Partially complete** | `styleIntentGuidance.ts` + conditional render in `buildPlannerContextForLlm.ts` | Expand guidance per product spec; affordance-aware filtering; aesthetic restraint block; align with `classifyRefinementPrompt` triggers |
| Better planner prompt context | **Partially complete** | Context blocks injected in `buildPlannerUserPrompt()` and repair | Dedicated restraint section; fix contradictory examples; integration tests |
| Aesthetic restraint | **Not started (structured)** | System prompt mentions minimum-change / multi-op for style; no style-specific restraint block | Add explicit restraint rules for style prompts (§9) |
| Better operation summaries | **Mostly complete** | `operationResultSummary.ts`, `buildWindowFacadeAssistantSummary()` | Minor polish for style/palette outcomes if needed |
| Fewer invalid / overbroad LLM plans | **Partially complete** | `validateOverbroadPlannerPlan` for direct ops; affordances in prompt; repair loop | Style prompts explicitly allowed multi-op; no guard against destructive style plans (unrelated removals, window maxing) |

---

## 3. Current limitations in abstract style prompts

### What the planner receives today

For a style prompt (e.g. “make it more welcoming”), routing is:

1. `tryResolveWindowFacadePlan()` → skip (`isSemanticStyleTransformRequest` or no window intent).
2. `classifyRefinementPrompt()` → `semantic`.
3. `runLlmPlannerPath()` → `buildPlannerUserPrompt()` which includes:
   - Semantic build summary (type, materials, style tags, features, windows per face, missing, suggested moves)
   - Rich affordances (porch/chimney/window with reasons/alternatives)
   - Allowed operations schema
   - **Only matching** style guidance from `detectStyleIntents()` (if triggers hit)

Repair prompts (`buildPlannerRepairUserPrompt`) receive the same context blocks.

### Per-prompt likely behavior

| Prompt | Style guidance injected? | Affordance / summary awareness | Likely planner behavior |
|--------|--------------------------|--------------------------------|-------------------------|
| make it more welcoming | Yes (`welcoming`) | Summary shows missing porch, window capacity per face; rich affordances show what’s available | May add porch, widen porch, palette tweak, **or** bump windows — guidance says avoid front if at capacity but **example block** shows front window increase for welcoming |
| make it more rustic | Yes (`rustic`) | Summary style tags may already include `refined` + `rustic` (stone workshop); missing chimney noted | Chimney + cobblestone/oak palette plausible; may also add windows/porch because `suggestedNextMoves` pushes side windows |
| make it brighter | Yes (`bright`) | Guidance explicitly says add/increase windows | **High risk of window-heavy plans**; “bright” triggers overlap literal “brighter” in classifier |
| make it sturdier | Yes (`sturdy`) | Stone tags in summary | Chimney + stone palette; room dimension patch possible if model overreaches |
| make it medieval | Yes (`medieval`) | Slate/stone cues in materials | Chimney + stone + moderate windows; porch full_facade discouraged in guidance |
| make it more refined | Yes (`refined`) | Limestone already on workshop | Palette tweak + symmetric front windows; may add porch if missing |

### Specific gaps

| Question | Current state |
|----------|---------------|
| Style-specific guidance? | **Yes, but static** — 2 bullets per intent; not filtered by what already exists. |
| Knows existing features? | **Partially** — summary `featureSummary` / `missingFeatures`; guidance does not say “skip add porch — already present”. |
| Window crowding awareness? | **Partially** — per-face `atCapacity` in summary and rich affordances; no global “3/4 faces have windows” cue; `suggestedNextMoves` still recommends adding windows on empty faces. |
| Material semantics? | **Yes** — `styleDescriptors` from palette; not compared to requested style intent. |
| Prefer 1–3 tasteful operations? | **Weak** — `MAX_PLANNER_OPERATIONS = 3` caps count but not tastefulness; style requests **explicitly allow** multi-op; no “prefer 1–2” guidance. |
| Avoid removing useful features? | **No style-specific rule** — overbroad validation **disabled** for style transforms. |
| Avoid “more windows” as default for every positive style change? | **No** — `bright` guidance encourages windows; summary `suggestedNextMoves` biases toward window adds; welcoming example in `PLANNER_EXAMPLES_BLOCK` increases front windows. |

### Manual test: “make the entire building more rustic”

Observed: chimney + front window group + porch widen — plausible but suggests **window/porch overuse** for style edits.

Contributing factors in code:

1. `validateOverbroadPlannerPlan` returns `{ ok: true }` for semantic style requests — no single-op pressure.
2. `suggestedNextMoves` lists `add right window_group` etc., nudging the model.
3. Rustic guidance mentions chimney and palette but not **“do not add front windows if already present / crowded”**.
4. No aesthetic restraint block saying “prefer palette + one feature, not three unrelated adds”.

---

## 4. Design goals for the finish checkpoint

The finish checkpoint should improve abstract style planning **without new component families**.

1. **Complete structured style-intent guidance** — expand the existing `styleIntentGuidance.ts` library per product spec (§5), not a new parallel system.
2. **Inject only matching guidance** — keep `detectStyleIntents()` + conditional render; add affordance-aware line filtering.
3. **Add aesthetic restraint rules** — dedicated short block in planner context for style-classified prompts.
4. **Small semantic summary improvements** — crowding, already-present cues, optional style-gap line (§7).
5. **Small rich affordance polish** — material palette hints, brief roof/room notes (§8).
6. **Planner repair parity** — repair already uses `buildPlannerContextForLlm`; ensure restraint block appears there too.
7. **Keep `window_det` separate** — style prompts must not be parsed as `window_only`; window prompts must still prefer `window_det` (already: `parseFacadeWindowIntent` returns null for `isSemanticStyleTransformRequest`; `tryResolveWindowFacadePlan` runs first).
8. **No scope expansion** — no image planning, interiors, second floors, persistence, new components, or full `ComponentEditDomain` abstraction.

---

## 5. Proposed style intent guidance system

### Target intents and guidance (product spec)

Align `STYLE_INTENT_HINTS` with the following (affordance-filtered at render time — see Option D):

| Intent | Guidance themes |
|--------|-----------------|
| **welcoming** | Porch if absent; widen/deepen if narrow; warm wood accents; moderate side/back windows only if not crowded; windows are not the only solution |
| **rustic** | Stone/wood palette; chimney if absent; darker/slate roof; porch if absent/narrow; avoid excessive front windows |
| **bright** | Lighter walls; windows only on non-crowded faces; `glass` / open treatment if supported; avoid unrelated removals |
| **sturdy** | Stone-heavy materials; compact/wide proportions (room patch only if clearly appropriate); chimney can help; avoid too much glass |
| **medieval** | Cobblestone/stone + slate/dark roof; chimney; smaller/moderate windows; avoid bright/refined-only palette |
| **refined** | Limestone/cleaner/paler materials; symmetry/moderate windows; avoid rugged/overcrowded features |

### Implementation options

| Option | Description | Pros | Cons | Risk | Scope | Testability |
|--------|-------------|------|------|------|-------|-------------|
| **A — Static prompt paragraph** | Add fixed “style hints” paragraph to `PLANNER_SYSTEM_PROMPT` | Trivial | Bloat every request; not conditional; ignores current build | Low | ~1 file | Poor |
| **B — Structured library, conditional render** | Extend current `styleIntentGuidance.ts`; render only detected intents | Already half-built; testable; no bloat for literal prompts | Guidance still generic; may contradict affordances | Low–medium | 2–3 files | Good |
| **C — Summary-derived deficits** | `getSemanticBuildSummaryForPlanner` computes “missing rustic cues” etc. | Highly contextual | More logic; harder to test; blurs summary vs guidance | Medium | 4+ files | Medium |
| **D — Hybrid B + affordance filtering** | Structured library **plus** `filterStyleGuidanceForBuild(summary, rich, intents)` drops inapplicable lines (e.g. “add porch” when porch present) | Relevant guidance only; matches user preference; testable | Slightly more code; must keep filters in sync with hints | Medium | 3–5 files | Good |

### Recommendation: **Option D**

Option D extends what already exists (`styleIntentGuidance.ts`, `buildPlannerContextForLlm.ts`, summary, rich affordances) without a planner rewrite. Option C can be a **small additive slice** inside D (e.g. one “style gap” line in summary) but should not become the primary mechanism.

**Proposed new function:**

```text
filterStyleGuidanceForPlanner(
  intents: StyleIntentId[],
  summary: SemanticBuildSummaryForPlanner,
  rich: RichBlueprintAffordancesForPlanner,
): readonly string[]
```

Filter rules (examples):

- Drop “add porch” if `summary.featureSummary` includes porch.
- Drop “add chimney” if chimney present.
- Drop “increase front windows” / “add front windows” if `rich.frontWindowsAtCapacity`.
- Drop “add side/back windows” if all non-front faces with capacity already have groups at capacity.
- Append dynamic line: “Current palette already reads rustic; prefer chimney/porch over palette churn.”

---

## 6. Planner prompt integration

### Where to render

| Concern | Recommended location |
|---------|---------------------|
| Style guidance (filtered) | `buildPlannerContextForLlm.ts` — extend `buildPlannerContextForLlm()` / add `renderStyleGuidanceBlock()` |
| Aesthetic restraint | Same file — new `renderAestheticRestraintForStylePrompt(intents)` appended **only when** `intents.length > 0` |
| System rules (minimum-change, max ops) | Keep in `PLANNER_SYSTEM_PROMPT` (`buildPlannerPrompt.ts`) |
| User request + final instructions | Keep in `buildPlannerUserPrompt()` |

**Do not** move allowed-ops schema or full summary into the system prompt — they stay in user context.

### Prompt bloat controls

- Render **only detected** intents (already done).
- Filter guidance lines per affordances (Option D).
- Cap filtered guidance to **~6–8 lines** per intent.
- Aesthetic restraint: **one short block** (~5 bullets), style prompts only.
- No change to context for literal / `window_det` paths.

### Planner repair

`buildPlannerRepairUserPrompt()` already calls `buildPlannerContextForLlm({ userRequest })` — restraint + filtered guidance appear automatically once added to context builder.

### Interaction with allowed-ops schema

Guidance must remain **advisory**. Hard limits stay in:

- `buildAllowedOperationsSchema()` / `renderAllowedOperationsSchemaText()`
- `validatePlannerOperations()`
- Affordance-driven rejections (`ADD_NOT_ALLOWED`, etc.)

Add explicit line in restraint block: *“Style guidance is advisory; every operation must be allowed by affordances and schema.”*

### Interaction with `window_det`

| Path | Rule |
|------|------|
| Clear window façade prompt | `tryResolveWindowFacadePlan()` succeeds → **no LLM**; style guidance irrelevant. |
| Style prompt mentioning “windows” metaphorically | Must not parse as `window_only` unless explicit mechanical window edit; `isSemanticStyleTransformRequest` / low window confidence → LLM. |
| Prompt with both style and clear window edit | **Window wins** today (window attempt runs first). Document as intentional; do not merge style guidance into `window_det`. |

### Example prompt text (user context append)

```text
Aesthetic restraint (style edit):
- Prefer 1–3 tasteful operations that match the requested style.
- Do not remove porch, chimney, or window groups unless the user explicitly asked.
- Do not max out window counts on every face; add windows only where affordances show capacity and the style intent needs more light.
- Do not add duplicate porch or chimney.
- Style guidance below is advisory; skip any line that contradicts affordances or "already present" summary cues.
- Do not change room width/depth/height for pure style requests unless proportions are central to the style intent.

Style intent guidance (filtered for this build):
- rustic:
  - Prefer cobblestone or oak_planks palette (current: limestone_bricks walls — consider shifting toward rustic).
  - Add chimney — not present (affordance: chimney.add available).
  - Avoid adding more front windows (front-windows count 2/3, not at capacity but rustic intent prefers moderation).
```

### Fix contradictory example

Update `PLANNER_EXAMPLES_BLOCK` “More welcoming” example in `buildPlannerPrompt.ts` to align with restraint (e.g. add porch + side window, **not** front count bump when at capacity).

---

## 7. Semantic build summary improvements

Keep changes **small** — extend `SemanticBuildSummaryForPlanner` and `renderSemanticBuildSummaryText()` only.

### Proposed additions

| Field / line | Purpose |
|--------------|---------|
| `windowCrowdingSummary: string` | e.g. `"2/4 faces have window groups; front at 2/3 slots"` |
| `alreadyPresentStyleCues: string[]` | e.g. `["porch (full_facade)", "chimney", "slate roof"]` |
| `styleGapHints: string[]` (optional, 0–2 lines) | Only when style intents passed in at render time: e.g. `"palette reads refined; rustic request may need warmer/stone materials"` |

### Implementation sketch

- `buildWindowCrowdingSummary(windowsBySurface)` — pure function in `getSemanticBuildSummaryForPlanner.ts`.
- `buildAlreadyPresentCues(featureSummary)` — extract from existing feature strings.
- `buildStyleGapHints(intents, styleDescriptors, materials)` — new helper in `styleIntentGuidance.ts` or small `styleSummaryHints.ts`.

### Do not

- Emit long narrative paragraphs.
- Duplicate full rich affordance text.
- Recompute window capacity (already per-face).

---

## 8. Rich affordance improvements

Current `richAffordances.ts` covers porch/chimney/windows well. Proposed **small** additions:

| Area | Improvement |
|------|-------------|
| Material palette | Add 3–4 lines: `palette.setMaterialPalette` allowed keys; which slots are style-relevant; example “wall=cobblestone → rustic”. Could live in `renderRichAffordancesText()` or a tiny `renderPaletteAffordancesText()`. |
| Roof | One line: roof `kind` / `layers` patchable via `updateComponent` if in schema. |
| Room | One line: “room dimensions patchable but avoid for pure style unless sturdy/proportions requested.” |
| Porch remove | Already modeled; add note in restraint that style edits should not use `porch.remove` without user ask. |

No new affordance simulation — reuse `getBlueprintAffordancesForPlanner()` data.

---

## 9. Aesthetic restraint and overbroad-plan control

### Proposed rules (style prompts only)

1. Prefer **1–3 tasteful** operations (not necessarily 1).
2. **No removals** of porch/chimney/window_group unless explicitly requested.
3. **No duplicate** porch/chimney.
4. **No maxing** all window faces — cap window ops to 1–2 faces per style request unless user asked for windows.
5. **Preserve** prior successful features (bias toward add/tweak, not remove/replace).
6. **No room dimension** changes for pure style unless intent is `sturdy` / proportions-related.
7. Prefer **affordance-backed** ops only.

### Existing controls

| Mechanism | Style behavior today |
|-----------|---------------------|
| `validateOverbroadPlannerPlan` | **Bypassed** for style (`isSemanticStyleTransformRequest`) — intentional for multi-op. |
| `MAX_PLANNER_OPERATIONS = 3` | Hard cap — good. |
| `validatePlanAgainstIntentScope` | Window-only — N/A for style. |
| Prompt minimum-change rule | Applies to **direct** component requests, not style. |

### Recommendation

| Layer | Action |
|-------|--------|
| **Prompt** | **Primary** — aesthetic restraint block + filtered guidance (§6). |
| **Validation** | **Light extension** — optional `validateStylePlannerPlan()` that rejects `removeComponent` on porch/chimney/window_group when `detectStyleIntents().length > 0` and prompt lacks remove verbs. Low cost, high safety. **Defer** room-dimension rejection unless manual tests show abuse. |
| **Repair** | Rely on existing repair + improved context; add rejection detail when style validation added. |
| **Tests** | **Required** — prompt rendering tests + style validation tests if implemented. |

Avoid overengineering: **no** second repair loop, **no** aesthetic critic agent.

---

## 10. Known window follow-up

### Prompt

`remove all windows and then add one to the left and right side of the building`

### Likely cause

1. **Primary:** `hasMixedAdd` / `addSegments` split regex does not allow **“then”** between `and` and `add` (`parseFacadeWindowIntent.ts` ~lines 309–319).
2. **Secondary:** No match for **“one to the left and right side”** in `parseCountMode()` (`perFaceRequestedCounts`) — tested variant is **“one window on each side”** only.

### Assessment

| Question | Answer |
|----------|--------|
| Small bug? | **Yes** — localized parser changes. |
| Recommended fix | Extend mixed-add regex: `\b(?:but|and)(?:\s+then)?\s+(?:add|put|place)\b`; add pattern `\bone\s+(?:window\s+)?to\s+the\s+left\s+and\s+right\b` or `\bleft\s+and\s+right\s+side\b` with count 1 per face; one test in `windowFacadeDomain.test.ts`. |
| Checkpoint placement | **Stage 4** of finish plan — after style work, **only if** fix remains ~15–30 lines + 1 test. |
| Defer if | Parser changes grow beyond mixed-add + one count pattern. |

---

## 11. Implementation options for this finish checkpoint

| Option | Summary | Pros | Cons | Risk | Files | Tests | MVP impact |
|--------|---------|------|------|------|-------|-------|------------|
| **1 — Minimal style prompt patch** | Static paragraphs in system prompt | Fast | Bloat; untestable; ignores affordances | Low | `buildPlannerPrompt.ts` | Few/none | Low |
| **2 — Structured conditional guidance** | Finish Option B on existing module | Testable; conditional | May still suggest impossible ops | Low–med | `styleIntentGuidance.ts`, `buildPlannerContextForLlm.ts` | Detection + render | Medium |
| **3 — Option 2 + summary/affordance polish + restraint** | **Recommended** — Option D filtering + restraint block + small summary lines | Best balance; uses existing architecture | Needs discipline to avoid scope creep | Medium | +`getSemanticBuildSummaryForPlanner.ts`, `richAffordances.ts`, optional `validateStylePlannerPlan.ts` | Prompt integration + style validation | **High** |
| **4 — Large semantic refactor** | Unified context object, deficit engine, operation diffing | Theoretically optimal | Too large for this branch | High | Many | Many | Delayed |

### Recommendation: **Option 3**

Matches user preference (D if safe, else B) and current code trajectory. Option 4 is not justified — the plumbing (`buildPlannerContextForLlm`, summary, rich affordances, `window_det`) already exists.

---

## 12. Recommended implementation plan

### Stage 1 — Style guidance module completion

- Expand `STYLE_INTENT_HINTS` per §5 product spec.
- Add `filterStyleGuidanceForPlanner()` (Option D).
- Add `buildStyleGapHints()` (optional 0–2 lines).
- Align `detectStyleIntents()` triggers with `classifyRefinementPrompt` semantic signals where reasonable.
- **Tests:** extend `styleIntentGuidance.test.ts` — filtering when porch/chimney present, front at capacity.

### Stage 2 — Planner context + restraint

- Add `renderAestheticRestraintForStylePrompt()` in `buildPlannerContextForLlm.ts`.
- Wire filtered guidance + restraint into `renderPlannerContextText()`.
- Update `PLANNER_EXAMPLES_BLOCK` welcoming example.
- Add `buildPlannerPrompt.test.ts` (or `plannerContext.test.ts`) — snapshot/key phrases for welcoming/rustic/bright; assert no style block for “add a window to the right”.
- **Tests:** prompt rendering per §13.

### Stage 3 — Summary + rich affordance polish

- Add `windowCrowdingSummary`, `alreadyPresentStyleCues` to semantic summary.
- Add brief palette hints to `renderRichAffordancesText()`.
- **Tests:** extend `semanticBuildSummary.test.ts`, `richAffordances.test.ts`.

### Stage 4 — Window mixed-add “then” bug (if still small)

- Parser fix in `parseFacadeWindowIntent.ts` (§10).
- Test: `remove all windows and then add one to the left and right side of the building`.
- Skip if scope grows.

### Stage 5 — Optional style validation

- `validateStylePlannerPlan.ts` — reject remove ops on style prompts without remove language.
- Wire in `validatePlannerJsonAndOperations()` when `detectStyleIntents().length > 0`.
- **Tests:** rustic prompt plan with `removeComponent porch` → reject.

### Stage 6 — Documentation + validation

- Update `CHANGE.md` finish checkpoint section.
- Run:

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

- Manual retest: welcoming, rustic, bright, window_det prompts, mixed window phrase from §10.

---

## 13. Testing plan

### Style intent detection

| Prompt | Expected |
|--------|----------|
| make it more welcoming | `["welcoming"]` |
| make it more rustic | `["rustic"]` |
| make it brighter | `["bright"]` |
| make it sturdier | `["sturdy"]` |
| make it medieval | `["medieval"]` |
| make it more refined | `["refined"]` |
| make the windows brighter | **Careful** — may detect `bright` but should be classified **literal** if “windows brighter” = treatment/material; document expected behavior in test |
| add a window to the right | **no** style intents |

### Planner context rendering

- Welcoming → welcoming guidance only + restraint block.
- Rustic → rustic guidance only; “add chimney” line **absent** when chimney present.
- Bright → bright guidance; no welcoming/rustic paragraphs.
- Literal window prompt → no style guidance, no restraint.
- Semantic summary + affordances + allowed ops still present.

### Planner behavior (mocked LLM / context inspection)

- Style prompt context includes filtered guidance (inspect `buildPlannerUserPrompt` output).
- `tryResolveWindowFacadePlan("add more windows but not to the front")` → success before LLM.
- `classifyRefinementPrompt("make it more welcoming")` → `semantic`.
- Narrow window → `window_det`.

### Overbroad / aesthetic

- If style validation added: reject remove porch on rustic prompt.
- Prompt text includes “do not max out windows unless asked”.

### Known window bug (Stage 4)

- `remove all windows and then add one to the left and right side of the building` → remove all + add left + add right (or 2 add ops).

### Regression

- `windowFacadeDomain.test.ts` — 44 tests pass.
- `componentOperations.test.ts`, `plannerSchemaHardening.test.ts` pass.

### Validation commands

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

---

## 14. Definition of done

The finish checkpoint is **done** when:

- [ ] Structured style guidance covers all six target intents with product-aligned bullets.
- [ ] Only **matching, affordance-filtered** guidance is injected into planner context.
- [ ] Style prompts include an **aesthetic restraint** block.
- [ ] Clear window prompts still route through **`window_det`** before LLM.
- [ ] Style prompts still route through **LLM** (`classifyRefinementPrompt` → semantic).
- [ ] Tests cover style detection, filtering, and planner context rendering.
- [ ] Known mixed window “and then add” bug is **fixed** (if small) **or documented** in `CHANGE.md`.
- [ ] `CHANGE.md` updated with finish checkpoint summary.
- [ ] `tsc`, `test:generator`, `build` pass.

---

## 15. Non-goals

Do **not** implement in this finish checkpoint:

- Image-to-build planning
- Second floors / interiors / new rooms
- New component families
- Full `ComponentEditDomain` abstraction
- Raw voxel editing
- Persistence / versioning / auth
- Cloudflare Agents / D1 / R2 / RAG
- Large planner rewrite or multi-pass aesthetic critic
- Expanding `window_det` into general style planning
- Global raise of `MAX_PLANNER_OPERATIONS` for LLM plans

---

## 16. Final recommendation

### Recommended option

**Option 3 — Structured conditional style guidance + affordance-aware filtering + small summary/affordance polish + aesthetic restraint** (hybrid **Option D**).

### Why it is appropriate now

- The branch **already invested** in `buildPlannerContextForLlm`, `styleIntentGuidance.ts`, semantic summary, and rich affordances — finishing the wiring is lower risk than a new architecture.
- **`window_det` is working** for mechanical window edits; style quality is the remaining MVP gap.
- Manual testing shows the LLM **can** produce plausible style edits but **overuses windows/porch** — addressable with filtered guidance and restraint without new components.
- Option D is **testable** (rendered prompt snapshots) unlike static prompt-only patches.

### Exact first implementation step

**Stage 1:** In `styleIntentGuidance.ts`, expand `STYLE_INTENT_HINTS` to match §5 product spec and implement `filterStyleGuidanceForPlanner(summary, rich, intents)` with unit tests for “porch already present → drop add porch line”.

### What to defer

- Full style-deficit engine (Option C as primary mechanism)
- `ComponentEditDomain` generalization
- Style validation layer (Stage 5) unless manual retest shows destructive removals
- Large window parser expansion beyond the “and then add” + “left and right side” fix
- Planner JSON schema changes for style (not required)

### Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Prompt bloat | Conditional render + filter lines + cap per intent |
| Guidance contradicts affordances | Filter + explicit “advisory” restraint line |
| Style prompts still window-heavy | Restraint block + fix welcoming example + tone down `bright` window bullet |
| `detectStyleIntents` / `classifyRefinementPrompt` mismatch | Align trigger words; test both |
| Window regression | Run full `windowFacadeDomain.test.ts` every stage |

### How this moves us toward MVP

Users can ask **abstract style questions** (“more rustic”, “more welcoming”) and get **1–3 coherent, affordance-backed edits** (palette, chimney, porch, selective windows) instead of random multi-surface window spam — while **mechanical window edits** stay on the reliable **`window_det`** path. That closes the original branch promise: *semantic understanding of the current build, valid next moves, and restrained aesthetic planning* — without blocking MVP on new geometry or components.

---

*Document version: 2026-06-05. Review before implementation.*
