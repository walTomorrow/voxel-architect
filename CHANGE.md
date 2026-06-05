# Change report — Builder semantic affordances

## Semantic affordance finish — Option 3 (2026-06-03)

**Branch:** `feature/builder-semantic-affordances`

- **Structured conditional style guidance:** `styleIntentGuidance.ts` — per-line `omitWhen` filters (affordance-aware), `filterStyleGuidanceForPlanner()`, minimal `buildStyleGapHints()` (max 2 lines), `renderAestheticRestraintForStylePrompt()`; `bright` skips window-treatment-only phrasing.
- **Planner context:** `buildPlannerContextForLlm.ts` — restraint block + filtered style guidance wired into `buildPlannerUserPrompt` and `plannerRepair`; context order: summary → affordances → allowed ops → restraint → style.
- **Summary polish:** `getSemanticBuildSummaryForPlanner.ts` — `alreadyPresentStyleCues`, `windowCrowdingSummary` in rendered summary text.
- **Affordance polish:** `richAffordances.ts` — brief palette/roof/room hints (room changes discouraged for pure style).
- **Planner example fix:** `buildPlannerPrompt.ts` — welcoming example uses porch + side window instead of front window bump.
- **Window parser fix:** `parseFacadeWindowIntent.ts` — `and then add` mixed clause; `one to the left and right side` face/count parsing.
- **Tests:** expanded `styleIntentGuidance`, `semanticBuildSummary`, `richAffordances`, `windowFacadeDomain`; new `plannerContext.test.ts`.
- **Deferred:** Stage 5 style validation (`validateStylePlannerPlan`) — prompt/context restraint preferred.

### Validation

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

See `docs/plans/SEMANTIC_AFFORDANCE_FINISH_PLAN.md`.

---

## Window façade follow-up — mixed ops & operation cap (2026-06-04)

**Branch:** `feature/builder-semantic-affordances`

- **Deterministic `window_det` operation cap:** server-authored window plans may exceed `MAX_PLANNER_OPERATIONS` (3) via `skipOperationCountCap` in `validatePlannerOperations`; the LLM planner cap is unchanged.
- **Mixed remove + add/update:** `FacadeWindowIntent` now includes `removeFaces`, `addOrUpdateFaces`, `sourceFaces`, `removeAllWindows`, and optional `perFaceRequestedCounts` for compound window-only requests in one plan.
- **Remove-all path:** phrases like “remove all (of the) windows”, “no windows”, and “walls with no windows” remove every `window_group` through `window_det` (including >3 groups).
- **Move/rebalance phrasing:** “move windows from the front to the sides”, “take windows off the front and put them on the back”, “move side windows to the back”, etc. emit remove-then-add/update ops deterministically.
- **Scope validation:** mixed window plans still reject porch/chimney/palette/room/roof ops; excluded faces cannot receive add/update.
- **Summaries:** `buildWindowFacadeAssistantSummary` gives per-face remove/add wording (e.g. which faces were removed vs left unchanged) instead of misleading global window totals.

### Validation

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

---

## Semantic affordances checkpoint (2026-06-04)

**Branch:** `feature/builder-semantic-affordances`

- Added the initial builder semantic module under `src/lib/builder/semantic/` (`materialStyleDescriptors.ts`, `getSemanticBuildSummaryForPlanner.ts`, `richAffordances.ts`, `styleIntentGuidance.ts`, `buildPlannerContextForLlm.ts`, `operationResultSummary.ts`, `detectNonFrontWindowIntent.ts`).
- Added semantic build summary support for planner-facing context (building type, proportions, palette style tags, per-face windows, missing features, suggested next moves).
- Added tests for `semanticBuildSummary` (`stone_workshop_v2`, `porch_house_v2`).
- Added `detectNonFrontWindowIntent` coverage, including “not on the front” and routing guard tests in `mapRefinementPromptToOperations`.
- Added `operationResultSummary` coverage (add/remove/update/palette; window totals as before → after).
- Added `richAffordances` and `styleIntentGuidance` tests; wired semantic context into `buildPlannerUserPrompt` and `plannerRepair`; operation outcomes in `formatToolResultForModel` / `planAndRefineBuildingPreview`.
- Fixed the “not on the front” detection edge case (evaluate front exclusions before the front-only short-circuit; allow `not on the front` / `but not on the front` phrasing).
- Fixed operation summary formatting expectations around locale-formatted numbers (e.g. `1,000` vs `1000` in assertions).

### Validation status

- Semantic targeted tests: **16/16 passing** (`semanticBuildSummary`, `richAffordances`, `styleIntentGuidance`, `detectNonFrontWindowIntent`, `operationResultSummary`).
- Broader generator suite: **279 passing**.

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

See `PLAN.md` (Builder Semantic Affordances) for scope and manual retest checklist.

---

# Change report — Builder tool expansion

## Component operation framework (2026-06-04)

**Branch:** `feature/builder-tool-expansion`

- **`addComponent` / `removeComponent`** (Option B): planner returns intent; server materializes via `componentOperationRegistry.ts`.
- **Allowlist:** porch, chimney, window_group — one porch/chimney per blueprint; one window_group per surface.
- **`getBlueprintAffordancesForPlanner()`** injected into planner prompt.
- **Porch `widthMode`** patch for “make the porch wider” (deterministic + planner).
- **`classifyRefinementPrompt`:** add/remove porch/chimney/windows no longer structural unsupported.
- Pipeline unchanged: validate → materialize → apply → validateBlueprint → generate.

See `PLAN.md` §18 for long-term semantic vs geometry layering.

---

## Planner schema hardening (2026-06-03)

**Branch:** `feature/builder-tool-expansion`

- **Strict planner JSON Schema** (`plannerResponseSchema.ts`): top-level `ok` | `unsupported` only; per-op `oneOf` (no shared `required: ["op","patch"]` on all ops); `addComponent` intent only (no full `component` blob).
- **Workers AI JSON Mode** on native `/ai/run/{model}`: `response_format: { type: "json_schema", json_schema: PLANNER_RESPONSE_JSON_SCHEMA }` on initial and repair calls.
- **One-shot repair**: parse/validation failures with repairable codes → single repair fetch with JSON Mode + rejection detail + bad snippet; no preview update on failure.
- **Minimum-change rule**: direct add/remove/widen component requests → reject `OVERBROAD_OPERATION_PLAN` if more than one operation (`validateOverbroadPlannerPlan.ts` + prompt examples).
- **Diagnostics**: field-specific messages (missing `id`, unknown patch fields, full `component` object rejected before normalize).
- **New rejection codes:** `JSON_MODE_FAILED`, `OVERBROAD_OPERATION_PLAN`.
- **Tests:** `plannerSchemaHardening.test.ts` (schema, fetch payload, diagnostics, overbroad, repair helpers).

Pipeline unchanged: parse → normalize → validate → materialize → apply → validateBlueprint → generate.

---

## Component operation stabilization (2026-06-03)

**Branch:** `feature/builder-tool-expansion`

- **Remove routing:** `looksLikeComponentEditRequest`, `remove`/`delete` in refine verbs; deterministic `removeComponent` in mapper for chimney/porch.
- **Window defaults:** `windowFacadeCapacity.ts` — layout sanitization, count clamp, singular-window count 1; sanitize on add/apply.
- **Affordances:** per-surface window capacity, `frontWindowsAtCapacity`, porch widen/deepen, chimney remove id.
- **Validation hints:** `buildValidationFailureSuggestion` on post-apply validate failures.

### Known limitations from manual testing

Partially addressed on `feature/builder-semantic-affordances` (see semantic checkpoint above). Remaining follow-ups:

- **Multi-surface window planning** — deterministic front-window mapping is guarded when side/back/left/right or “not on the front” is detected; compound “left and right” / “right and back” still relies on the LLM planner with better context, not full `detectRequestedWindowSurfaces` wiring.
- **Compound side-window requests** may still miss the refine tool gate (`shouldRunRefinementTool` / `classifyRefinementPrompt` unchanged).
- **Some planner failures may reference the wrong component affordance**, e.g. a porch-related rejection during a window request.
- **Assistant window count wording** — structured operation outcomes and `formatToolResultForModel` OUTCOME lines should reduce delta misreports; needs manual retest on live chat.

---

# Change report — Planner routing & chat context fixes

## Semantic routing refactor (2026-06-04)

- **`auto` mode** classifies prompts: literal → deterministic; semantic/structural → LLM planner.
- Deterministic mapper trimmed to explicit mechanical commands only; semantic band-aids removed.
- Activity labels: `Semantic edit — using LLM planner`, `Rejected unsupported edit: …`.
- See `docs/plans/BUILDER_PLANNER_SEMANTIC_ROUTING.md`.

---

## Branch

`feature/builder-agent-tools`

## Scope

Post-QA fixes: broader refine gate (`give it a gabled roof`), design-feedback routing, structured planner rejection codes, hardened no-tool system prompt, compact build context on non-tool chat turns.

## Behavior

- **give it a gabled roof** → refine tool (deterministic gable match or LLM).
- **what do you think of this design?** → stream chat with build summary; no tool.
- **Failed planner** → activity shows `Rejected: CODE — detail`; export includes last rejection.
- **Stream chat** with `activeBlueprint` → system prompt includes `[Current build context]`.
- **Assistant** must not claim preview updated without `[Server builder tool result]`.

## Files created

- `src/lib/builder/plannerRejection.ts`
- `src/lib/builder/augmentChatWithBuildContext.ts`
- `src/lib/builder/__tests__/augmentChatWithBuildContext.test.ts`

## Files updated

- `src/lib/builder/shouldRunRefinementTool.ts`
- `src/lib/builder/mapRefinementPromptToOperations.ts`
- `src/lib/builder/validatePlannerOperations.ts`
- `src/lib/builder/planAndRefineBuildingPreview.ts`
- `src/lib/builder/planBlueprintOperationsWithLlm.ts`
- `src/lib/builder/callWorkersAiJsonPlanner.ts`
- `src/lib/builder/builderToolTypes.ts`
- `src/lib/builder/builderSystemPrompt.ts`
- `src/lib/builder/formatToolResultForModel.ts`
- `src/lib/builder/callWorkersAiChat.ts`
- `src/app/api/builder/chat/route.ts`
- `src/lib/builder/formatBuilderConversationExport.ts`
- `src/app/builder/mockBuilderData.ts`
- `src/app/builder/BuilderClient.tsx`
- `src/app/builder/components/BuilderWorkspace.tsx`
- Tests: `shouldRunRefinementTool`, `validatePlannerOperations`, `mapRefinementPromptToOperations`, `planAndRefineBuildingPreview`

---

# Change report — LLM operation planner (hybrid refinement)

## Branch

`feature/builder-agent-tools` (planner extension)

## Scope

Hybrid refinement: deterministic phrase mapper first, then strict Workers AI JSON operation planner when the mapper misses. Planner may only emit `setMaterialPalette` and `updateComponent`; server validates all output before apply. No image-to-planner context in v1.

## Behavior

- **`plannerMode: "auto"`** (chat): try deterministic mapper → LLM planner on miss → apply → validate → generate.
- **`POST /api/builder/refine`**: optional `plannerMode` — `auto` | `deterministic` | `llm`.
- **Max 3 operations** per planner turn; unknown fields/IDs/materials rejected.
- **Broadened refinement gate**: natural-language edits (e.g. “more rustic”) when `activeBlueprint` exists; casual chat excluded.
- **Activity**: labels for deterministic vs LLM path (`plan-det`, `plan-llm`, `plan-reject`, etc.).
- **Preview** updates only on `toolResult.ok` after validate + generate.

## Files created (planner)

- `src/lib/builder/plannerTypes.ts`
- `src/lib/builder/summarizeBlueprintForPlanner.ts`
- `src/lib/builder/buildAllowedOperationsSchema.ts`
- `src/lib/builder/buildPlannerPrompt.ts`
- `src/lib/builder/validatePlannerOperations.ts`
- `src/lib/builder/callWorkersAiJsonPlanner.ts`
- `src/lib/builder/planBlueprintOperationsWithLlm.ts`
- `src/lib/builder/planAndRefineBuildingPreview.ts`
- `src/lib/builder/__tests__/summarizeBlueprintForPlanner.test.ts`
- `src/lib/builder/__tests__/validatePlannerOperations.test.ts`
- `src/lib/builder/__tests__/planAndRefineBuildingPreview.test.ts`

## Files updated (planner)

- `src/lib/builder/runBuilderChatTurn.ts` — async `planAndRefineBuildingPreview` with `auto`
- `src/lib/builder/refineBuildingPreview.ts` — thin wrapper (`deterministic` mode)
- `src/app/api/builder/refine/route.ts` — `plannerMode` query body field
- `src/lib/builder/shouldRunRefinementTool.ts` — `looksLikeEditRequest` + casual exclusions
- `src/lib/builder/builderToolTypes.ts` — `plannerPath`, `rationaleSummary`
- `src/lib/builder/formatToolResultForModel.ts` — `PLANNER_PATH`
- `src/lib/builder/builderSystemPrompt.ts` — planner path guidance
- `src/lib/builder/__tests__/shouldRunRefinementTool.test.ts`
- `src/lib/builder/__tests__/refineBuildingPreview.test.ts`

---

# Change report — Builder v2 refinement layer

## Branch

`feature/builder-agent-tools` (refinement extension)

## Scope

Deterministic semantic edits on an active v2 blueprint: client stores full `activeBlueprint`, POSTs it on refinement turns, server maps phrases to `setMaterialPalette` / `updateComponent`, validates, and regenerates. No LLM-authored operations, no add/remove components, no persistence.

## Behavior

- **Refinement intent** (e.g. “make it taller”, “dark wood roof”, “more windows”, “deeper porch”): JSON chat response with `toolResult.toolKind: "refine"`; preview updates only when `toolResult.ok`.
- **Strong create** (e.g. “make me a workshop”) with an active blueprint: replaces build via existing generate path.
- **Wider porch**: unsupported — clear error, preview unchanged.
- **More windows**: front/primary `window_group` only.
- **`POST /api/builder/refine`**: standalone debug endpoint; chat uses `planAndRefineBuildingPreview` in-process.
- **Normal chat**: SSE streaming unchanged.

## Files created (refinement)

- `src/lib/builder/blueprintOperationsV2.ts` — operation types
- `src/lib/builder/blueprintComponentIndex.ts` — component lookup helpers
- `src/lib/builder/applyBlueprintOperationsV2.ts` — pure apply + clamp
- `src/lib/builder/mapRefinementPromptToOperations.ts` — phrase → operations
- `src/lib/builder/shouldRunRefinementTool.ts` — refinement + strong-create gates
- `src/lib/builder/refineBuildingPreview.ts` — map → apply → validate → generate
- `src/lib/builder/parseCurrentBlueprint.ts` — request blueprint validation
- `src/app/api/builder/refine/route.ts` — debug refine endpoint
- `src/lib/builder/__tests__/shouldRunRefinementTool.test.ts`
- `src/lib/builder/__tests__/mapRefinementPromptToOperations.test.ts`
- `src/lib/builder/__tests__/applyBlueprintOperationsV2.test.ts`
- `src/lib/builder/__tests__/refineBuildingPreview.test.ts`

## Files updated (refinement)

- `src/lib/builder/builderToolTypes.ts` — unified `BuilderToolResult` with `toolKind`
- `src/lib/builder/runBuilderChatTurn.ts` — refine → generate → stream orchestration
- `src/app/api/builder/chat/route.ts` — refinement branch
- `src/lib/builder/validateChatRequest.ts` — parse `currentBlueprint`
- `src/lib/builder/builderChatTypes.ts` — `currentBlueprint` on request body
- `src/lib/builder/formatToolResultForModel.ts` — refine vs generate context
- `src/lib/builder/builderSystemPrompt.ts` — refinement instructions
- `src/app/builder/mockBuilderData.ts` — `activeBlueprint` state
- `src/app/builder/BuilderClient.tsx` — store/resend blueprint, tool routing UX
- `src/app/builder/components/BuilderChatPanel.tsx` — header copy

---

# Change report — Builder agent tools (deterministic bridge)

## Branch

`feature/builder-agent-tools`

## Scope

Connect `/builder` chat to the existing deterministic v2 preset → validate → generate pipeline. Server controls when the tool runs and which preset is used; the model only summarizes tool results. No Cloudflare Agents, D1, R2, or LLM-authored blueprint JSON.

## Behavior

- **Generation intent** (e.g. “make me a small stone cottage”): non-streaming JSON chat response with `toolResult`; preview updates only when `toolResult.ok`.
- **Normal chat**: existing SSE streaming unchanged.
- **Image-only** prompts: chat-only (no tool) unless text includes generation verbs.
- **`modify_current`**: returns a clear not-available-yet error via `POST /api/builder/generate` or tool path.

## Files created

- `src/lib/blueprints/clonePresetBlueprint.ts` — v2 preset clone helper
- `src/lib/builder/builderToolTypes.ts` — tool request/result types
- `src/lib/builder/shouldRunGenerationTool.ts` — server intent gate
- `src/lib/builder/resolvePresetFromPrompt.ts` — keyword → v2 preset id
- `src/lib/builder/generateBuildingPreview.ts` — deterministic tool
- `src/lib/builder/builderActivityFromTool.ts` — real activity steps
- `src/lib/builder/formatToolResultForModel.ts` — tool context for Workers AI
- `src/lib/builder/runBuilderChatTurn.ts` — generation chat orchestration
- `src/app/api/builder/generate/route.ts` — standalone tool endpoint
- `src/lib/builder/__tests__/shouldRunGenerationTool.test.ts`
- `src/lib/builder/__tests__/resolvePresetFromPrompt.test.ts`
- `src/lib/builder/__tests__/generateBuildingPreview.test.ts`

## Files updated

- `src/app/api/builder/chat/route.ts` — generation turns → JSON + tool
- `src/lib/builder/builderSystemPrompt.ts` — tool result rules
- `src/lib/builder/builderChatTypes.ts` — `BuilderChatWithToolSuccessResponse`
- `src/lib/builder/mockBuilderActivity.ts` — chat-only activity alias
- `src/app/builder/mockBuilderData.ts` — v2 default preset, `generatedStructure`
- `src/app/builder/BuilderClient.tsx` — apply tool results to preview state
- `src/app/builder/components/BuilderPreviewPanel.tsx` — generated vs default preset
- `src/app/builder/components/BuilderWorkspace.tsx` — header copy, warnings prop
- `src/app/builder/components/BuilderActivityCard.tsx` — error step styling

## Preset mapping (server)

| User intent (keywords) | v2 preset |
|------------------------|-----------|
| workshop / forge / smith | `stone_workshop_v2` |
| porch / veranda | `porch_house_v2` |
| cottage / cabin / default | `simple_cabin_v2` |

## Verification

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
```

Manual: `/builder` → “Make me a small stone cottage” → preview updates, activity shows real steps; casual chat still streams.
