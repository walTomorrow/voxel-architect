# Fix plan — Builder planner routing, rejections, and chat context

**Branch:** `feature/builder-agent-tools`  
**Status:** Implemented on `feature/builder-agent-tools`.  
**Prerequisite:** Hybrid LLM operation planner shipped on this branch.

**Live app:** https://voxel-architect.wlc562.workers.dev/

---

## 1. Summary

QA found three gaps after the planner shipped:

| Issue | Symptom | Root cause (code) |
|-------|---------|-------------------|
| **A. Missed refine routing** | “give it a gabled roof” → streaming chat; assistant claims preview changed | `shouldRunRefinementTool` / `looksLikeEditRequest` do not treat `give` + roof-kind phrases as edits; no tool runs, no `[Server builder tool result]` |
| **B. Opaque planner rejections** | “more medieval” / “brighter” enter planner but fail with generic “Rejected unsupported edit” | Validator returns plain English strings without **codes**; activity/export drop detail; summary LLM may paraphrase vaguely |
| **C. Chat without build context** | “what do you think of this design?” ignores current preview | Stream/sync chat uses `BUILDER_SYSTEM_PROMPT` only — **no** `currentBlueprint` summary injected on non-tool turns |

This plan is a **small, focused patch** — no new operation types, no add/remove components, no persistence/Agents/image-planner work.

---

## 2. Root cause audit

### 2.1 Issue A — “give it a gabled roof” misses refine path

**Gate today** (`shouldRunRefinementTool.ts`):

- `REFINE_VERBS` includes `make it` / `make the` but not **`give`** (only `give me` is in strong-create, which also requires a building noun).
- `looksLikeEditRequest` needs `(BUILDING_PART + imperative/style/compare)` OR `REFINE_VERBS`.
- “give it a gabled roof”: has `roof` ✓, but no imperative from `EDIT_IMPERATIVE` (`give` missing), no style/compare, no `REFINE_VERBS` → **`wantsEdit = false`** → `/api/builder/chat` streams.

**Mapper** (`mapRefinementPromptToOperations.ts`):

- Deterministic match requires `\b(gable roof|pitched roof|peaked roof)\b` — **“gabled roof” does not match** (would have worked if refine path ran and LLM/det fixed phrasing).

**Assistant false success**:

- Stream path has no tool result block; system prompt says not to claim updates on failure but does **not** explicitly forbid claiming updates when **no tool block is present at all**.

### 2.2 Issue B — planner rejections lack visible diagnostics

**Flow** (`planAndRefineBuildingPreview.ts` → `planBlueprintOperationsWithLlm` → `validatePlannerOperations.ts`):

- LLM returns JSON → parse → `validatePlannerOperations` → on fail, `unsupportedReason` is a single string (e.g. `unknown component id "foo"`).
- Activity always uses generic label: `Rejected unsupported edit` (`plan-reject`).
- `toolResult.error` duplicates reason but is **not** structured; export/activity don’t include rejection **category**.
- LLM planner may return `status: "unsupported"` with vague text, or return invalid ops that fail validation with messages not mapped to your requested categories.

**Requested diagnostic categories** (for activity, export, `formatToolResultForModel`, optional `toolResult.rejectionCode`):

| Code | When |
|------|------|
| `INVALID_OP_TYPE` | op not `setMaterialPalette` / `updateComponent` |
| `UNKNOWN_COMPONENT_ID` | id not in blueprint |
| `COMPONENT_TYPE_MISMATCH` | `componentType` ≠ actual type |
| `INVALID_MATERIAL` | palette value ∉ allowlist |
| `UNSUPPORTED_PATCH_FIELD` | extra or disallowed patch keys |
| `TOO_MANY_OPERATIONS` | length > 3 |
| `JSON_PARSE_FAILED` | parse + repair exhausted |
| `PLANNER_UNSUPPORTED` | model `status: "unsupported"` |
| `PLANNER_UPSTREAM` | Workers AI failure |

### 2.3 Issue C — design feedback chat lacks current build

**Gate**:

- “what do you think of this design?” does **not** match `CASUAL_CHAT` (regex is anchored to short whole-message forms only).
- It also does **not** match `looksLikeEditRequest` (no building part keyword like `roof`/`wall` in the phrase — **“design” is not in `BUILDING_PARTS`**).
- Result: **stream chat** with no blueprint context.

**Workers AI** (`callWorkersAiChat.ts`):

- `buildChatMessages` = system prompt + user/assistant history only.
- `currentBlueprint` is parsed on the request but **unused** on stream/json chat-only branches.

---

## 3. Proposed fixes

### 3.1 Refinement routing (Issue A + partial mapper)

**File:** `shouldRunRefinementTool.ts`

1. Add **`give`** to edit detection (not strong-create):
   - e.g. `\bgive (it|the|this)\b` or include `give` in `EDIT_IMPERATIVE` with guard: if text matches `give me a <noun>` keep strong-create exclusion first.
2. Expand **roof-kind / edit noun** detection:
   - `gabled`, `gable`, `shed`, `pitched`, `peaked` alongside `BUILDING_PARTS`.
3. Add **`looksLikeRoofOrMaterialEdit`**: `BUILDING_PART` + (`give`|`add`|`put`|`use`) OR roof-kind adjective.
4. Keep **design-feedback exclusion** (§3.3) so “what do you think of this design?” still skips refine.

**File:** `mapRefinementPromptToOperations.ts` (small deterministic win)

- Add patterns: `gabled roof`, `a gabled roof`, `give it a gable` → `pitched_gable` (same as existing gable branch).

**Tests:** `shouldRunRefinementTool.test.ts` — “give it a gabled roof” → true; “give me a workshop” → false (generate).

### 3.2 System prompt — never claim tool-less updates (Issue A)

**File:** `builderSystemPrompt.ts`

Add explicit rules:

- If the latest user message has **no** `[Server builder tool result]` section appended, the server did **not** run generate/refine this turn — **do not** say the preview was updated or that you changed the building.
- You may discuss intent, suggest edits, or ask clarifying questions only.
- When `[Server builder tool result]` is present, obey `PREVIEW_UPDATED` / `BUILDER_TOOL_STATUS` only.

**File:** `formatToolResultForModel.ts` (failed refine)

- Add `REJECTION_CODE` and `REJECTION_DETAIL` when present.
- Strengthen `INSTRUCTION` on failure: quote rejection detail verbatim; do not imply partial success.

### 3.3 Design-feedback vs edit routing (Issue C)

**File:** `shouldRunRefinementTool.ts` (new helper)

```ts
looksLikeDesignFeedback(text): boolean
```

Match opinion/review phrases **without** edit imperatives:

- `what do you think`, `how does this look`, `thoughts on`, `feedback on`, `opinion on`, `review this design`, `of this design`, etc.
- Require **no** strong edit signals (`make`, `give it a`, `add more`, `change the`, roof-kind + give, etc.).

**Routing:**

- `shouldRunRefinementTool`: if `looksLikeDesignFeedback` → **false** (chat with context, not tool).
- Do **not** add to `CASUAL_CHAT` whole-message anchor only — use substring patterns.

### 3.4 Chat context injection (Issue C)

**New helper:** `augmentChatMessagesWithBuildContext.ts` (or extend `callWorkersAiChat.ts`)

When `currentBlueprint != null` and turn is **non-tool** (stream or image sync chat):

- Prepend to **system** prompt (or first user context block):

```text
[Current build context — read-only]
<renderBlueprintSummaryText(summarizeBlueprintForPlanner(...))>
The 3D preview reflects this build. Discuss it when the user asks for feedback. Do not claim you changed it unless a later [Server builder tool result] says PREVIEW_UPDATED: yes.
```

**Wire in:** `/api/builder/chat/route.ts` — pass `currentBlueprint` into `streamWorkersAiChat` / `callWorkersAiChat`.

**Files:** `callWorkersAiChat.ts`, `runBuilderChatTurn.ts` (if helpers move), chat route.

**Tests:** unit test that augment adds summary when blueprint present; optional snapshot of summary header.

### 3.5 Planner rejection diagnostics (Issue B)

**File:** `validatePlannerOperations.ts`

- Change validation errors to `{ code: PlannerRejectionCode, message: string }`.
- Map existing string checks to codes (table in §2.2).
- `parsePlannerJsonResponse` failures → `JSON_PARSE_FAILED`.

**File:** `plannerTypes.ts` / `builderToolTypes.ts`

```ts
type PlannerRejectionCode = ...
toolResult.rejectionCode?: PlannerRejectionCode
toolResult.rejectionDetail?: string
```

**File:** `planAndRefineBuildingPreview.ts` / `planBlueprintOperationsWithLlm.ts`

- On reject: set `rejectionCode` + `rejectionDetail`.
- Activity: `plan-reject` label includes code + short detail, e.g. `Rejected: UNKNOWN_COMPONENT_ID — unknown component id "foo"`.
- Optional extra event: `plan-invalid-json` before reject on parse failure.

**File:** `formatBuilderConversationExport.ts`

- Include `rejectionCode` / `rejectionDetail` in export meta or per-turn if stored on message (stretch: attach to assistant message via client — **minimal v1**: ensure activity steps show detail; export already lists activity labels).

**File:** `formatToolResultForModel.ts`

- Emit `REJECTION_CODE` / `REJECTION_DETAIL` for failed refine.

**Tests:** `validatePlannerOperations.test.ts` — each code path; `planAndRefineBuildingPreview.test.ts` — mock LLM returning bad id → code + activity label.

### 3.6 Optional: improve planner prompt for stylistic requests (low risk)

**File:** `buildPlannerPrompt.ts`

- One line: for “medieval”, “brighter”, “rustic”, prefer **supported** ops (palette materials, window count, wall height) and return `unsupported` only if impossible within schema.
- No new op types.

---

## 4. Expected behavior after fix

| User message | Expected path |
|--------------|----------------|
| give it a gabled roof | Refine tool (det or LLM) → gable roof kind / preview update |
| make it more medieval | Refine → LLM plans palette/roof ops OR `PLANNER_UNSUPPORTED` with clear code + message in activity + assistant |
| make it brighter | Refine → window/material ops OR precise rejection (e.g. cannot model lighting) |
| what do you think of this design? | Stream chat **with** build summary; no tool; assistant discusses current preview; **no** claim of edit |
| give it a gabled roof (if stream bug regressed) | Must **not** claim preview updated without tool result |

---

## 5. Implementation phases

| Phase | Work |
|-------|------|
| **1** | Routing: `shouldRunRefinementTool` + deterministic gabled patterns + tests |
| **2** | Rejection codes: validator → toolResult → activity labels → formatToolResultForModel + tests |
| **3** | System prompt hardening (no tool block = no preview claims) |
| **4** | Chat context augment for non-tool turns when `currentBlueprint` set + design-feedback helper + tests |
| **5** | `CHANGE.md` + manual QA checklist |

**Estimated touch:** ~8–12 files, no new API routes.

---

## 6. Tests & verification

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

**Manual `/builder`:**

1. Generate workshop → “give it a gabled roof” → tool runs, preview updates or clear rejection.
2. “make it more medieval” → success or `REJECTION_*` visible in activity + assistant.
3. “make it brighter” → same.
4. “what do you think of this design?” → contextual feedback, no “send an image” default.
5. Copy conversation (dev menu) → rejection detail visible in activity section.

---

## 7. Out of scope

- New operation types, add/remove components, persistence, Agents, D1/R2, AI Gateway  
- Image-aware planner (Phase 2)  
- Canonical screenshots  
- Broadening LLM to author full blueprints  

---

## 8. Approval

Confirm before implementation:

1. Add `give it/the` + gabled/gable/shed to refine gate (with strong-create guard).  
2. Add `looksLikeDesignFeedback` to skip tool but inject build context.  
3. Structured `PlannerRejectionCode` on failed planner/validate paths.  
4. System prompt rule: **no tool result block → never claim preview updated**.  
5. Inject compact blueprint summary on all non-tool chat turns when `activeBlueprint` exists.  

**Stop here.** No code changes until approved.
