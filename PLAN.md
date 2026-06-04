# Plan — LLM operation planner for v2 refinement

> **Post-QA fix plan (routing, rejections, chat context):** see [docs/plans/BUILDER_PLANNER_ROUTING_FIX.md](docs/plans/BUILDER_PLANNER_ROUTING_FIX.md) — planning only, awaiting approval.

**Branch:** `feature/builder-agent-tools`  
**Status:** Planning only — **no implementation** until review.  
**Prerequisite:** Preset generation bridge and deterministic refinement layer are implemented and verified on this branch.

**Live app:** https://voxel-architect.wlc562.workers.dev/

---

## 1. Summary

This plan upgrades `/builder` refinement from **deterministic keyword mapping** to a **hybrid**: keep the existing fast mapper for exact commands, and add a **strict, schema-constrained LLM operation planner** for natural, stylistic, and ambiguous edit requests.

The AI/code boundary is unchanged:

| Layer | Responsibility |
|-------|----------------|
| **LLM (planner)** | Propose **typed `BlueprintOperationV2[]` only**, from user request + compact blueprint summary + allowed schema |
| **Server (code)** | Validate planner JSON; apply via `applyBlueprintOperationsV2`; `validateBlueprint`; `generateStructure`; decide preview update |
| **LLM (chat)** | User-facing explanation only; summarizes compact tool result after server work |
| **Never** | Model authors full blueprints, edits `ComponentPlan`, outputs voxel coordinates, or claims preview update without `toolResult.ok` |

Target pipeline:

```text
user request
+ compact blueprint summary (code-generated)
+ allowed operation schema (code-generated)
→ LLM proposes strict JSON operations (when deterministic mapper does not match)
→ server validates operation JSON
→ applyBlueprintOperationsV2
→ validateBlueprint
→ generateStructure
→ preview update (client)
→ assistant summarizes actual result
```

This is **not** a full autonomous agent. No Cloudflare Agents, D1/R2 persistence, AI Gateway, canonical screenshots, interiors, region selection, or LLM full-blueprint generation in this step.

---

## 2. Current status audit

### 2.1 What exists — generation bridge

| Piece | Location | Notes |
|-------|----------|-------|
| Intent gate | `shouldRunGenerationTool.ts` | Generation verbs; image-only stays chat-only |
| Preset resolver | `resolvePresetFromPrompt.ts` | Keywords → `simple_cabin_v2`, `stone_workshop_v2`, `porch_house_v2` |
| Tool | `generateBuildingPreview.ts` | Clone preset → validate → generate; returns `toolKind: "generate"` |
| Standalone API | `POST /api/builder/generate` | Debug/direct tool access |
| Chat orchestration | `runBuilderGenerationChatTurn` | Tool then Workers AI summary |
| Strong create override | `shouldStrongCreatePrompt` | “Make me a workshop” replaces active build via generate |

### 2.2 What exists — deterministic refinement

| Piece | Location | Notes |
|-------|----------|-------|
| Refinement gate | `shouldRunRefinementTool.ts` | Requires `activeBlueprint` + `REFINE_VERBS` regex; defers strong-create |
| Phrase mapper | `mapRefinementPromptToOperations.ts` | ~370 lines of regex → `BlueprintOperationV2[]` |
| Apply layer | `applyBlueprintOperationsV2.ts` | Pure apply + clamp; uses `structuredClone` |
| Component index | `blueprintComponentIndex.ts` | Find room, roof, porch, chimney, front windows |
| Refine tool | `refineBuildingPreview.ts` | **Sync**; mapper-only; validate → generate |
| Standalone API | `POST /api/builder/refine` | `{ prompt, blueprint }` → `{ toolResult }` |
| Chat orchestration | `runBuilderRefinementChatTurn` | Refine tool then Workers AI summary |
| Blueprint parse | `parseCurrentBlueprint.ts` | Structural checks on incoming JSON |
| Request body | `validateChatRequest.ts` | Parses `currentBlueprint` on chat POST |

### 2.3 Operation types (`blueprintOperationsV2.ts`)

**Allowed op kinds today:**

- `setMaterialPalette` — partial palette patch
- `updateComponent` — typed component patch
- `setMaterialOverride` — per-component materials (**implemented in apply, not used by mapper**)

**Supported component patches (apply layer):**

| Component | Patch fields | Clamps (apply) |
|-----------|--------------|----------------|
| `room` | `width`, `depth`, `wallHeight` | 5–17, 5–13, 4–9 |
| `roof` | `kind`, `layers`, `overhang`, `orientation` | layers 1–3 |
| `window_group` | `count`, `layout` | count 0–12 |
| `porch` | `depth` only | depth 1–8 |
| `chimney` | `targetFace`, `placementHorizontal` | — |

**Not supported in patches:** door dimensions, porch width, add/remove components, metadata/constraints edits.

**Deterministic mapper coverage (examples):**

- Materials: stone/brick/wood walls, dark wood/slate roof, glass windows, wooden building
- Room: wider/narrower/deeper/shallower/taller/shorter/larger/smaller
- Roof: shed/gable, steeper/flatter (layers)
- Windows: more/fewer on **front primary** `window_group` only
- Porch: **deeper only**; **wider explicitly rejected**
- Chimney: left/right/back placement

**Known mapper gaps (observed in use):**

- “make the roof into wood” — no match (requires adjacent phrase like `wood roof` or `roof dark wood`)
- Stylistic/semantic requests — no match at all

### 2.4 Chat route orchestration (`/api/builder/chat`)

Order today:

1. `shouldUseRefinementJsonTurn` + `currentBlueprint` → `runBuilderRefinementChatTurn`
2. `shouldUseGenerationJsonTurn` → `runBuilderGenerationChatTurn`
3. Image or text → stream / sync chat

Headers: `X-Builder-Tool-Kind: refine | generate`, `X-Builder-Chat-Mode: json | stream`.

### 2.5 Client state

| State | Location | Notes |
|-------|----------|-------|
| `activeBlueprint` | `mockBuilderData.ts`, `BuilderClient.tsx` | Full v2 JSON; in-memory; cleared on reset |
| `generatedStructure` | same | Voxel blocks for preview |
| POST body | `BuilderClient.tsx` | Sends `currentBlueprint` on chat |
| Tool UX | `BuilderClient.tsx` | Uses `shouldRunRefinementTool` + `shouldStrongCreatePrompt` for loading state |

Preview updates **only** when `toolResult.ok && toolResult.blocks.length > 0`.

### 2.6 Tool result / activity flow

| Piece | Role |
|-------|------|
| `BuilderToolResult` | Unified generate/refine result; `appliedOperations`, `activityEvents` |
| `formatToolResultForModel.ts` | Injects `[Server builder tool result]` for summary LLM |
| `builderActivityFromTool.ts` | Maps tool events to activity card steps |
| `builderSystemPrompt.ts` | Rules for generate vs refine summaries |

Refine activity today: parsed → blueprint → planned (deterministic label) → apply → validate → generate → preview.

### 2.7 Workers AI helpers

| Piece | Notes |
|-------|-------|
| `callWorkersAiChat.ts` | Sync + stream; default `@cf/meta/llama-3.2-11b-vision-instruct`; `max_tokens: 1024` |
| Vision | Image passed as base64 on sync path |
| Config | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `WORKERS_AI_MODEL` |

No dedicated JSON planner call exists. Chat and tool-summary share the same model and system prompt.

### 2.8 Tests (builder)

Included in `vitest.config.ts` under `src/lib/builder/__tests__/`:

- `shouldRunGenerationTool.test.ts`
- `resolvePresetFromPrompt.test.ts`
- `generateBuildingPreview.test.ts`
- `shouldRunRefinementTool.test.ts`
- `mapRefinementPromptToOperations.test.ts`
- `applyBlueprintOperationsV2.test.ts`
- `refineBuildingPreview.test.ts`

**165 tests** pass in `pnpm test:generator` (including builder). `pnpm exec tsc --noEmit` and `pnpm run build` pass.

### 2.9 What is still missing

- Blueprint summary helper for planner context
- LLM operation planner (prompt, call, parse)
- Strict planner output validator (separate from apply)
- Hybrid routing (deterministic vs LLM)
- Broadened refinement entry gate for natural language (see §9)
- Async refine pipeline (planner requires network)
- `plannerMode` on refine API
- Activity events for planner path / failures
- Planner-specific system prompt (separate from chat prompt)
- Mocked planner tests
- Image context summary fed into planner (deferred by default)
- `setMaterialOverride` in planner allowlist (deferred)

---

## 3. Why deterministic mapping is insufficient

The keyword mapper is valuable for **speed, predictability, and zero extra API cost** on exact commands (“make it taller”, “add more windows”). It is the wrong long-term strategy for **language diversity**.

**Examples the mapper cannot handle well (and regex expansion would not scale):**

| User request | Why mapper fails |
|--------------|------------------|
| “make it feel more medieval” | Style → multiple material/roof/dimension choices; no single regex |
| “make it look more like the image” | Requires image semantics → typed ops |
| “make the facade more welcoming” | Subjective → larger door/windows/material warmth |
| “make the windows more balanced” | May mean count, symmetry layout, or spacing — context-dependent |
| “make it less squat” | Implies taller walls and/or fewer layers — composite edit |
| “make the roof dominate the silhouette” | Layers + height + maybe overhang |
| “make it more rustic” | Palette + maybe roof kind |
| “make the workshop look sturdier” | Stone walls, lower/wider proportions |
| “make it brighter” | Glass/windows/light materials — ambiguous |
| “more like a cabin but keep the stone walls” | Constraint + style blend |

Adding regex for each phrasing creates **fragile, overlapping rules** and still misses paraphrases. The LLM should **interpret intent** into **already-supported operations**; the server must **enforce** the schema.

---

## 4. Recommended next scope

### Option A — Keep expanding deterministic mapper

**Pros:** No extra Workers AI call; fully testable; fast.  
**Cons:** Does not solve natural/stylistic/image-inspired edits; maintenance burden grows without bound.

### Option B — Replace mapper with LLM planner only

**Pros:** Maximum flexibility.  
**Cons:** Slower; costs another API call on every edit; regresses reliability on exact commands; harder to debug.

### Option C — Hybrid (recommended)

**Pros:** Best of both: fast path for known commands; LLM for everything else; server validates all ops either way.  
**Cons:** Two planning paths to maintain; need clear routing and activity labeling.

**Recommendation: Option C**, aligned with branch direction and user preference.

```text
refinement request + activeBlueprint
  → try deterministic mapper (confident match)
  → else LLM operation planner
  → validate planner JSON
  → apply → validate blueprint → generate
  → on total failure: friendly limitation, preview unchanged
```

---

## 5. Operation planner contract

### 5.1 Server-side function

```ts
planBlueprintOperationsWithLlm(input: {
  userRequest: string;
  blueprintSummary: BlueprintPlannerSummary; // structured + renderable text
  allowedOperations: AllowedOperationsSchema; // derived from blueprint + apply caps
  imageContextSummary?: string; // Phase 2 optional
}): Promise<PlannerResult>;
```

### 5.2 Planner output shape

```ts
type PlannerResult =
  | {
      ok: true;
      operations: BlueprintOperationV2[];
      rationaleSummary: string; // short, for activity + tool result
    }
  | {
      ok: false;
      unsupportedReason: string;
    };
```

### 5.3 Raw model response shape (before server validation)

Use a **single JSON object** with no markdown fences:

```json
{
  "status": "ok",
  "operations": [ /* BlueprintOperationV2[] */ ],
  "rationaleSummary": "Raised walls and switched roof to slate for a taller profile."
}
```

Or on failure:

```json
{
  "status": "unsupported",
  "unsupportedReason": "Cannot add a second room with current operation set."
}
```

### 5.4 Hard rules

- Planner returns **JSON only** — no prose outside the object.
- No raw voxels, `ComponentPlan`, full blueprint, or metadata/constraints edits.
- Component IDs must come from the provided summary allowlist.
- Operation types must be whitelisted (`setMaterialPalette`, `updateComponent` initially).
- Server **never** applies planner output without passing `validatePlannerOperations()`.

---

## 6. Blueprint summary design

Do **not** send full raw blueprint JSON as primary planner context (token cost, distraction, temptation to emit full JSON).

### 6.1 Helper

```ts
summarizeBlueprintForPlanner(
  blueprint: GenericBuildingBlueprintV2,
  options?: { presetId?: string },
): BlueprintPlannerSummary;
```

### 6.2 Structured type (internal)

```ts
type BlueprintPlannerSummary = {
  schemaVersion: 2;
  presetSource?: string; // from metadata.name or client presetId if passed
  materials: Record<string, string>;
  constraints: { maxBlockCount: number };
  components: Array<{
    id: string;
    type: string;
    label?: string;
    // type-specific compact fields
  }>;
};
```

### 6.3 Text rendering (planner prompt)

```text
Current build:
- schemaVersion: 2
- source: stone_workshop_v2
- components:
  - room main-room: width 13, depth 9, wallHeight 5
  - roof main-roof: kind shed, layers 2, orientation front_back
  - door front-door: surface main-room.front, width 2, height 2
  - window_group front-windows: count 2, surface main-room.front, layout symmetric
  - chimney chimney: surface main-room.back, horizontal center
- materials:
  - wall cobblestone
  - roof oak_planks
  - window glass
  - door oak_planks
- constraints:
  - maxBlockCount 80000
```

Implementation notes:

- Generate from `GenericBuildingBlueprintV2` via `blueprintComponentIndex` + component-type formatters.
- Include **every component id** present (planner allowlist).
- Include attach surfaces for doors/windows/chimney.
- Omit voxels, ComponentPlan, generator internals.

---

## 7. Allowed operation schema

Planner allowlist must mirror **`applyBlueprintOperationsV2`** — no new op types in v1.

### 7.1 Included in v1 planner

| Op | Notes |
|----|-------|
| `setMaterialPalette` | Keys: `wall`, `floor`, `roof`, `window`, `door`, `accent` |
| `updateComponent` | Patches listed in §2.3 |

### 7.2 Excluded from v1 planner

| Op / edit | Reason |
|-----------|--------|
| `setMaterialOverride` | Implemented but untested in mapper; skip until explicitly tested |
| Add/remove components | Out of scope |
| Porch width | Not in patch type; mapper rejects “wider porch” |
| Door dimension patches | Not in `ComponentPatchV2` |
| Metadata / constraints | Not in operation system |

### 7.3 Schema payload for planner prompt

Code-generated appendix:

- **Component allowlist:** `{ id, type }[]` from summary
- **Material keys:** `CLASSIC_MATERIAL_KEYS` from `genericLabUtils.ts`
- **Roof kinds:** `pitched_gable`, `shed`, `none` (from v2 types)
- **Numeric ranges:** same as apply clamps (§2.3)
- **Unsupported list:** add/remove components, porch width, door resize, full blueprint rewrite, voxels

---

## 8. Planner validation

New module: `validatePlannerOperations.ts` (name TBD).

### 8.1 Checks (before apply)

| Check | Action on fail |
|-------|----------------|
| JSON parses | Reject; optional one repair retry (§11) |
| Top-level shape: `status`, `operations` or `unsupportedReason` | Reject |
| `status: "unsupported"` | Return friendly limitation; no apply |
| `operations` is array, length 1–**MAX_OPS** (default **3**) | Reject |
| Each `op` whitelisted | Reject |
| No unknown top-level or op-level keys | Reject (strict) |
| `updateComponent.id` exists in blueprint | Reject |
| `componentType` matches actual component | Reject |
| Patch `type` matches component type | Reject |
| Patch fields ⊆ allowed fields for type | Reject |
| Material values ∈ `CLASSIC_MATERIAL_KEYS` | Reject |
| Numeric values finite; optionally pre-clamp or reject out-of-range | Prefer **reject** if far out of range; apply layer clamps if within generous bounds |

### 8.2 On validation failure

- Do **not** apply operations.
- Do **not** update preview.
- Return `toolResult.ok: false` with clear error.
- Activity: “Planner output invalid” or “Rejected unsupported edit”.
- **Do not** fall back to deterministic mapper after invalid LLM JSON (unsafe). Fallback only when mapper simply did not match (see §9).

---

## 9. Integration with deterministic mapper

### 9.1 Recommended routing (`plannerMode: "auto"`)

```text
1. Parse refinement request
2. Build blueprint summary
3. If plannerMode === "deterministic" → mapper only
4. If plannerMode === "llm" → planner only (debug)
5. If plannerMode === "auto":
   a. Try mapRefinementPromptToOperations
   b. If ok → use operations (activity: "Matched deterministic edit")
   c. Else → planBlueprintOperationsWithLlm
   d. If planner ok → validate → use (activity: "Planned semantic edit with LLM")
   e. Else → fail (activity: "Rejected unsupported edit")
6. applyBlueprintOperationsV2 → validateBlueprint → generateStructure
7. Workers AI chat summary (unchanged)
```

**Do not** always call planner first — preserves speed and deterministic test coverage.

### 9.2 Refinement entry gate (required change)

Today `shouldRunRefinementTool` requires `REFINE_VERBS`, so requests like “make it feel more medieval” **never enter the refine path** — they fall through to streaming chat and the LLM hallucinates edits.

**Plan:** Broaden gate when `activeBlueprint` exists:

- Enter refinement JSON turn if: **not** strong-create **and** (`REFINE_VERBS` **or** `looksLikeEditRequest(text)`).
- `looksLikeEditRequest`: lightweight heuristic — e.g. imperative mood, comparative adjectives (`more`, `less`, `-er`), style adjectives (`rustic`, `medieval`, `sturdy`), or reference to building parts (`roof`, `walls`, `windows`, `facade`, `porch`, `chimney`, `door`).
- Still **exclude** pure conversation (“what do you think?”, “thanks”, “hello”) via negative patterns or short-message allowlist.

Document and test the gate carefully — false positives trigger unnecessary planner calls; false negatives skip the tool.

### 9.3 Activity path labels

| Event id | Label |
|----------|-------|
| `plan-det` | Matched deterministic edit |
| `plan-llm` | Planned semantic edit with LLM |
| `plan-reject` | Rejected unsupported edit |
| `plan-invalid` | Planner output invalid |

---

## 10. API and orchestration

### 10.1 `refineBuildingPreview` → async pipeline

Current function is **synchronous**. Planner requires async.

**Recommended:** extract shared pipeline and add:

```ts
async function planAndRefineBuildingPreview(
  request: RefineBuildingPreviewRequest & {
    plannerMode?: "auto" | "deterministic" | "llm";
    imageContextSummary?: string;
  },
): Promise<BuilderToolResult>;
```

Keep `refineBuildingPreview` as thin sync wrapper (`plannerMode: "deterministic"`) for unit tests, or migrate tests to inject mock planner.

### 10.2 `/api/builder/refine`

Extend body:

```ts
{
  prompt: string;
  blueprint: GenericBuildingBlueprintV2;
  plannerMode?: "auto" | "deterministic" | "llm"; // default "auto"
}
```

Response unchanged: `{ toolResult }`.

### 10.3 `/api/builder/chat`

- Pass `plannerMode: "auto"` implicitly inside `runBuilderRefinementChatTurn`.
- `runBuilderRefinementChatTurn` becomes async planner-aware.
- Generation and stream branches unchanged.

### 10.4 Tool result extensions

Add optional fields on `BuilderToolResult`:

```ts
plannerPath?: "deterministic" | "llm" | "none";
rationaleSummary?: string; // from planner when used
```

Update `formatToolResultForModel` to include `PLANNER_PATH` for summary LLM.

---

## 11. Workers AI model usage

### 11.1 Dedicated JSON planner call

New helper: `callWorkersAiJsonPlanner(messages, { maxTokens })`:

- Same `WORKERS_AI_MODEL` and credentials as chat (**recommend same multimodal model** — keeps one env var; text-only planner requests ignore image).
- **Non-streaming** only.
- Low `max_tokens` (e.g. **512** — operations JSON is small).
- Separate **planner system prompt** — not `BUILDER_SYSTEM_PROMPT`.
- Temperature low if exposed by API (or omit).

### 11.2 Parse and repair

1. Parse response as JSON (strip accidental markdown fences defensively).
2. If parse fails: **one** repair request (“Return only valid JSON matching schema”).
3. If still fails: `PlannerResult ok: false`, friendly message.

### 11.3 Cost / latency

Each ambiguous refinement adds **one** Workers AI call before the existing summary call. Keep summary compact; consider skipping summary model call on planner failure (return `assistantSummary` from tool only).

---

## 12. Image context

**Current behavior:** Image attached on refine turn is passed to **summary** Workers AI call, not to operation planning.

### Phase 1 (default — defer image-aware planning)

- Image + refinement text enters refine path (with broadened gate).
- Planner receives **text request + blueprint summary only**.
- Summary LLM still sees image for user-facing reply.

### Phase 2 (optional — if approved)

1. If attachment present and user text references image (“like the photo”, “match the reference”):
2. Call multimodal model for **short image context summary** (materials, roof shape, proportions, mood) — max ~200 tokens.
3. Pass `imageContextSummary` into `planBlueprintOperationsWithLlm`.
4. Do **not** pass raw image bytes to planner prompt builder twice; one vision call only.

**Recommendation:** Defer Phase 2 to keep first implementation focused. Note in activity when image was ignored by planner.

---

## 13. Activity events

### Success path (full)

1. Parsed refinement request  
2. Built current blueprint summary  
3. Matched deterministic edit **OR** Planned semantic edit with LLM  
4. Validated operation plan  
5. Applied operations  
6. Validated updated blueprint  
7. Regenerated voxel structure  
8. Ready to update builder preview  
9. Assistant response ready  

### Failure path

| Condition | Activity |
|-----------|----------|
| Mapper + planner both unsupported | Rejected unsupported edit |
| Invalid planner JSON | Planner output invalid |
| Validator reject | Operation plan rejected |
| Apply/validate/generate fail | Existing error steps |
| Preview unchanged | Implicit via `toolResult.ok: false` |

Expose `plannerPath` in tool result for UI if needed (activity card subtitle optional).

---

## 14. UI behavior

Minimal changes:

| Area | Change |
|------|--------|
| Activity card | Show deterministic vs LLM plan step when present |
| Preview | Update only on `toolResult.ok` (unchanged) |
| Assistant | Explains actual applied edits or limitation |
| Loading | Refinement turns may take longer (planner call) — keep existing tool-loading placeholder |
| Layout | No redesign |

Optional: show `rationaleSummary` in activity detail tooltip — low priority.

---

## 15. Tests

All tests use **mocked** planner — no live Workers AI in CI.

### New test files

| Module | Cases |
|--------|-------|
| `summarizeBlueprintForPlanner.test.ts` | All component types; stable text snapshot |
| `validatePlannerOperations.test.ts` | Valid ops; unknown id; wrong type; too many ops; invalid materials; extra keys |
| `buildPlannerPrompt.test.ts` | Allowlist + ranges present; no full blueprint blob |
| `planBlueprintOperationsWithLlm.test.ts` | Mock fetch: valid JSON, invalid JSON, repair, unsupported |
| `planAndRefineBuildingPreview.test.ts` | Auto: deterministic wins; mapper miss → mock planner; full fail |
| `shouldRunRefinementTool.test.ts` | Extend for broadened natural-language gate |

### Existing tests

- Keep all current mapper/apply/refine tests passing.
- `refineBuildingPreview.test.ts` may use `plannerMode: "deterministic"` explicitly.

### Verification commands

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
```

Manual: generate workshop → “make it taller” (deterministic) → “make it more rustic” (LLM) → invalid request → preview unchanged.

---

## 16. Cloudflare / OpenNext considerations

- **No new infrastructure** — another Workers AI HTTP call only.
- Planner runs **server-side** in existing Next.js route handlers.
- No Cloudflare Agents, D1, R2, AI Gateway.
- No route `runtime` changes.
- Avoid Node-only APIs (`structuredClone` already used — OK on modern Workers).
- Keep planner prompt **concise** (summary + schema, not full blueprint).
- Two Workers AI calls per ambiguous refine turn (planner + summary) — acceptable for dev; monitor latency.

---

## 17. Out of scope

Do **not** implement in this step:

- Full blueprint generation from LLM JSON  
- Add/remove components  
- Multiple rooms / interiors / zones  
- Selected-region editing  
- Canonical render screenshots  
- Persistence / auth  
- Cloudflare Agents  
- AI Gateway  
- R2 / D1  
- Raw voxel coordinate generation  
- Direct `ComponentPlan` edits  
- `setMaterialOverride` in planner (until tested)  
- Porch width  

---

## 18. Implementation phases

### Phase A — Audit + blueprint summary

- Confirm operation allowlist against `applyBlueprintOperationsV2`
- Implement `summarizeBlueprintForPlanner` + text renderer
- Unit tests with three v2 presets

### Phase B — Planner schema + validator

- Define planner JSON response types
- Implement `validatePlannerOperations` (strict)
- Unit tests for rejection cases

### Phase C — Planner prompt + Workers AI call

- `buildPlannerPrompt` (summary + schema + user request)
- `callWorkersAiJsonPlanner` with parse + one repair retry
- `planBlueprintOperationsWithLlm` orchestration
- Mocked tests only

### Phase D — Hybrid integration

- `planAndRefineBuildingPreview` with `plannerMode`
- Wire into `runBuilderRefinementChatTurn` (`auto`)
- Extend `/api/builder/refine` with `plannerMode`
- Broaden `shouldRunRefinementTool` / edit heuristic
- Keep deterministic mapper as first pass

### Phase E — Activity + tool result formatting

- New activity events and `plannerPath` on tool result
- Update `formatToolResultForModel` and `builderSystemPrompt`
- Minimal UI activity labels

### Phase F — Tests + docs

- Complete test coverage (§15)
- Update `CHANGE.md`
- Manual smoke on `/builder`

**Phase 2 (optional, separate approval):** image context summary → planner input.

---

## 19. Success criteria

- [ ] Natural refinement requests not covered by regex produce **valid** operations via LLM planner  
- [ ] Preview updates **only** after validate + generate succeed  
- [ ] Deterministic mapper still handles exact commands (no regression)  
- [ ] Invalid planner JSON fails safely; preview unchanged  
- [ ] Model never outputs voxels, full blueprint, or ComponentPlan in planner path  
- [ ] Normal chat streaming still works  
- [ ] Image chat still works (summary path)  
- [ ] `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:generator`, `pnpm run build` pass  

---

## 20. Approval questions

Before implementation, confirm:

1. **Hybrid strategy** — deterministic first, LLM planner on mapper miss (`auto` mode)?  
2. **Max operations per turn** — recommend **3**; approve or change?  
3. **Image context** — defer to Phase 2 (planner text-only; image still on summary LLM)?  
4. **Same Workers AI model** for JSON planner as chat/vision (`WORKERS_AI_MODEL`)?  
5. **`/api/builder/refine` exposes `plannerMode`** (`auto` | `deterministic` | `llm`)?  
6. **Broadened refinement gate** — allow natural-language edit requests when `activeBlueprint` exists (with conversation exclusions)?  
7. **`setMaterialOverride`** — exclude from planner v1?  

---

**Stop here.** No implementation until review.
