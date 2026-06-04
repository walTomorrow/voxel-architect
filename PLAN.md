# Plan — Builder agent tools (bare-minimum generator bridge)

**Branch:** `feature/builder-agent-tools`  
**Status:** Planning only — **no implementation** until review.  
**Type:** Product integration — connects `/builder` chat to the **existing deterministic** generator; not a full autonomous agent.

**Live app (reference):** https://voxel-architect.wlc562.workers.dev/  
**Infra:** Cloudflare Workers + OpenNext (`docs/deployment/CLOUDFLARE.md`).

**Goal:** Move from “user chats while preview is static” to “user chats → controlled tool run → validated blueprint → voxel generation → preview updates → activity log reflects real steps.”

This is the **middle layer** between the top-end chat UI and the generator. It is **not** Cloudflare Agents SDK, **not** D1/R2 persistence, and **not** full v2 semantic refinement / operation grammar yet.

---

## 1. Summary

`/builder` already has Workers AI chat (streaming text, image references) and a **static** voxel preview driven by a fixed **v1 preset id** on the active chat. The assistant is instructed not to claim it changed the building.

This branch adds a **server-side builder tool** (`generate_building_preview`) that:

1. Selects or receives a **valid generic building blueprint** (initially from **v2 presets**, not model-invented JSON).
2. Runs **`validateBlueprint` → `generateStructure`** (existing pipeline).
3. Returns **blocks + summary + validation issues + activity events** to the client.
4. Updates the preview from **tool output**, not from a frozen preset alone.

The model may **request** generation via a controlled orchestration path; it must **not** output raw voxel coordinates or edit `ComponentPlan` IR.

---

## 2. Current implementation status survey

### 2.1 `/builder` UI (exists)

| Path | Role |
|------|------|
| `src/app/builder/page.tsx` | Route shell |
| `src/app/builder/BuilderClient.tsx` | Chat state, `fetch("/api/builder/chat")`, streaming via `consumeBuilderChatSse`, mock activity on every assistant turn |
| `src/app/builder/mockBuilderData.ts` | `BuilderChat`: `presetId`, `status`, messages; default preset `simple_rustic_cabin` (v1); **no** stored blocks/blueprint |
| `src/app/builder/components/BuilderWorkspace.tsx` | Layout; header shows preset label + **“Static preview”** |
| `src/app/builder/components/BuilderPreviewPanel.tsx` | **Client-side** `clonePresetBlueprint(presetId)` → `validateBlueprint` → `generateStructure` in `useMemo`; badge **“Static preset”** |
| `src/app/builder/components/BuilderChatPanel.tsx` | Message list + prompt |
| `src/app/builder/components/BuilderActivityCard.tsx` | Renders `BuilderActivityStep[]` |
| `src/lib/builder/mockBuilderActivity.ts` | **Mock-only** steps; ends with “Preview unchanged — static preset” |

**Preview data flow today:** `presetId` from chat → `genericLabUtils.clonePresetBlueprint` (**v1 only**) → `generateStructure` → `VoxelViewer`. Preview **does not** react to chat content.

### 2.2 `/api/builder/chat` (exists)

| Path | Role |
|------|------|
| `src/app/api/builder/chat/route.ts` | `POST`; no `runtime = "edge"` (OpenNext Node on Workers) |
| `src/lib/builder/callWorkersAiChat.ts` | Workers AI REST; streaming for text-only |
| `src/lib/builder/validateChatRequest.ts` | JSON + image validation |
| `src/lib/builder/builderChatTypes.ts` | Request/response types; **no** tool result types yet |
| `src/lib/builder/builderSystemPrompt.ts` | Tells model preview is **static**; no tool vocabulary |
| `src/lib/builder/consumeBuilderChatStream.ts` | Client SSE parser (`chunk` / `done` / `error`) |
| `src/lib/builder/builderChatGuardrails.ts` | Message prep, friendly errors |

**No** tool invocation, **no** blueprint/generation in chat route today.

### 2.3 Generator & validation (exists, production-quality)

| Entry | Path | Notes |
|-------|------|--------|
| Unified validate + generate | `src/lib/generation/generateStructure.ts` | Dispatches `schemaVersion` 1 vs 2 |
| v1 validate | `src/lib/blueprints/validateBlueprint.ts` → `validateGenericBuilding` | Returns `resolved` for v1 |
| v2 validate | `validateGenericBuildingBlueprintV2` | Returns `normalized` blueprint |
| v1 generate | `generateGenericBuilding` | From resolved v1 |
| v2 generate | `generateGenericBuildingV2` | After `resolveGenericBuildingV2` |
| v2 compiler IR | `src/lib/generation/components/v2/*` | `ComponentPlan` v2 — **internal**, not for UI/model |

**Presets:**

| Version | Catalog | Count (repo) | IDs (examples) |
|---------|---------|----------------|----------------|
| v1 | `sampleGenericBuildingBlueprints.ts` | 2 | `simple_rustic_cabin`, `shed_roof_workshop` |
| v2 | `sampleGenericBuildingBlueprintsV2.ts` | 3 | `simple_cabin_v2`, `stone_workshop_v2`, `porch_house_v2` |

`previewPresetCatalog.ts` lists both v1 and v2 for `/preview` lab sources.

### 2.4 GenericBuildingBlueprint v2 — **implemented in `src/`, not docs-only**

**In code today:**

- Types: `src/lib/blueprints/types/genericBuildingV2.ts`
- Validator: `validateGenericBuildingV2.ts` + tests
- Resolver: `resolveGenericBuildingV2.ts` + tests
- Generator: `generateGenericBuildingV2.ts`, `compileGenericBuildingV2Plan.ts`, emitters + tests
- UI: `/generic-lab` v2 client (`GenericLabV2Client.tsx`, component tree editor)
- Invariant tests: `generatorGenericPresetInvariantsV2.test.ts`

**Not implemented (docs/planned, out of this branch):**

- LLM-authored full v2 blueprints from free-form prompts
- Semantic **refine** operations (`add window`, `widen porch`) as first-class tool ops
- Automatic v1→v2 conversion
- Canonical render / screenshot self-evaluation loop

`docs/plans/GENERIC_BUILDING_V2.md` is a **broader** product plan; the **executable v2 preset + generator path already exists**.

### 2.5 Builder vs v2 gap

- Builder preview uses **v1-only** `clonePresetBlueprint` in `genericLabUtils.ts`.
- Default builder preset is **v1** `simple_rustic_cabin`.
- Chat/model have **no** path to v2 presets yet.

### 2.6 Other routes (unchanged this branch)

- `/preview` — `PreviewInspectionClient.tsx`; preset catalog v1/v2
- `/generic-lab` — v1 lab + v2 lab; human blueprint editing

### 2.7 Relevant tests (keep green)

- `pnpm test:generator` — v1/v2 preset invariants, compile tests, validation tests
- No builder tool tests yet

---

## 3. Recommended first tool scope

### Option A — v1 preset bridge

| Criterion | Assessment |
|-----------|------------|
| Speed | Fastest (builder already uses v1 `clonePresetBlueprint`) |
| Architecture | **Misaligned** with long-term v2 + semantic components target |
| Demo value | Good for “see preview move” |
| Risk | Low technically; **high** product debt if refinement is built on v1 |
| Code touched | Builder preview utils, tool mapping to 2 v1 presets |

### Option B — v2 as first executable target (preset selection, not free-form authoring)

| Criterion | Assessment |
|-----------|------------|
| Speed | **Still fast** — reuse `getGenericBuildingPresetV2` + `generateStructure` (v2 path already wired) |
| Architecture | **Correct** direction; matches generic-lab v2 and PLAN in `docs/plans/GENERIC_BUILDING_V2.md` |
| Demo value | Strong (“cottage” → `simple_cabin_v2`, “workshop” → `stone_workshop_v2`, etc.) |
| Risk | Low if scope is **preset pick + validate + generate**, not LLM JSON blueprint |
| Code touched | New `clonePresetBlueprintV2` (or shared preset helper), tool module, builder state, preview props |

### Recommendation: **Option B — minimal v2 executable path (preset selection)**

**Phase-1 tool behavior (`generate_building_preview`):**

- **Modes implemented first:**
  - `select_preset` — map user/assistant intent to one of **3 v2 preset ids** (deterministic keyword table + default `simple_cabin_v2`).
  - `create_from_prompt` — **alias** of `select_preset` in phase 1 (honest activity copy: “Matched request to v2 preset …”).
- **Deferred in phase 1:**
  - `modify_current` — needs stable in-memory blueprint + safe patch rules (semantic ops) → later branch.
  - LLM-emitted full `GenericBuildingBlueprintV2` JSON.

**v1:** Do **not** build refinement on v1. Optional **fallback** only if v2 generation throws (log + single retry with `simple_cabin_v2`), not a parallel product path.

**Honesty in UI/activity:** Say “v2 component blueprint (preset)” not “AI designed every component.”

---

## 4. Tool contract (refined from repo types)

### 4.1 Request (server-internal first)

```ts
/** Tool name: generate_building_preview */
type GenerateBuildingPreviewRequest = {
  /** Latest user message text (trimmed). */
  prompt: string;
  mode: "select_preset" | "create_from_prompt" | "modify_current";
  /** Phase 1: preset id hint from classifier; phase 2+: sanitized blueprint. */
  presetId?: string;
  /** Phase 2+ only — never accept raw ComponentPlan. */
  blueprint?: import("@/src/lib/blueprints/types").StructureBlueprint;
  /** Optional: last successful blueprint in session (for modify_current later). */
  currentBlueprint?: import("@/src/lib/blueprints/types").StructureBlueprint;
  /** High-level image note only — not raw base64 in tool (chat route already handled image). */
  imageContextSummary?: string;
};
```

Phase 1 implementation: only `select_preset` / `create_from_prompt` with **v2 preset ids**.

### 4.2 Result

```ts
type BuilderActivityEvent = {
  readonly id: string;
  readonly label: string;
  readonly status: "pending" | "success" | "error";
};

type BuilderValidationIssueView = {
  readonly severity: "error" | "warning" | "note";
  readonly message: string;
  readonly code?: string;
};

type GenerateBuildingPreviewResult = {
  readonly ok: boolean;
  /** Shown in chat + activity; must reflect actual tool outcome. */
  readonly assistantSummary: string;
  /** Public blueprint JSON safe for UI/debug panel — schemaVersion 2 preset clone. */
  readonly blueprint?: import("@/src/lib/blueprints/types").GenericBuildingBlueprintV2;
  readonly presetId?: string;
  readonly presetLabel?: string;
  readonly schemaVersion: 2;
  readonly blocks?: import("@/src/lib/voxel/types").VoxelBlock[];
  readonly blockCount?: number;
  readonly validationIssues?: readonly BuilderValidationIssueView[];
  readonly activityEvents: readonly BuilderActivityEvent[];
  readonly error?: string;
};
```

**Never expose:** `ComponentPlan`, `ComponentPlanV2`, resolved compiler internals, raw coordinate arrays for the model to edit.

**Size guard:** Reject or warn if `blockCount` exceeds blueprint `constraints.maxBlockCount` after generation (validator should already catch most issues).

### 4.3 Core function (new)

`src/lib/builder/generateBuildingPreview.ts`:

1. Resolve preset id (`resolvePresetFromPrompt(prompt)`).
2. `structuredClone(getGenericBuildingPresetV2(id).blueprint)`.
3. `validateBlueprint(blueprint)` — if `!ok`, return `ok: false` with issues, **no** blocks.
4. `generateStructure(blueprint)` → blocks.
5. Build `activityEvents` + `assistantSummary` from actual steps.

Unit-test: each v2 preset id produces `ok: true` and `blockCount > 0`.

---

## 5. LLM / tool integration design

### Approaches considered

| Approach | Summary | Risk |
|----------|---------|------|
| **1** Single model call returns text + tool JSON | Fragile parsing; stream incompatible | High |
| **2** Backend rules classify intent → run tool | Predictable; may miss nuance | Low–medium |
| **3** Strict JSON planner call → tool → final response | More accurate; extra latency/cost | Medium |

### Recommendation: **Approach 2 (rules) + optional single non-stream “summary” call**

**Phase 1 orchestration (`runBuilderChatTurn` in `src/lib/builder/`):**

1. Parse chat request (existing validation).
2. **`shouldRunGenerationTool(lastUserMessage)`** — keyword/heuristic table, e.g. `make`, `build`, `create`, `generate`, `cottage`, `cabin`, `house`, `workshop`, `porch`, `preview` (tunable list in code).
3. If **false:** existing Workers AI stream path only (unchanged).
4. If **true:**
   - Run `generateBuildingPreview` **before** assistant text.
   - If tool **`ok: false`:** return assistant message that states failure (no claim of preview update); SSE or JSON includes `toolFailed: true`.
   - If tool **`ok: true`:** inject **tool summary** into a **short augmented user context** for Workers AI (preset chosen, block count, validation warnings count) — **non-streaming** assistant reply for that turn **or** stream only the explanation after tool completes.
5. Response to client includes **`toolResult`** payload (blocks or block count + preset id; see API shape).

**Image turns:** Phase 1 — run tool only if text also triggers generation keywords; image-only interpretation stays chat-only. Phase 2 — extend classifier with vision summary stub.

### Guardrails (required)

| Risk | Mitigation |
|------|------------|
| Model claims preview changed when tool failed | System prompt + server only attaches `toolResult.ok` metadata; UI only updates preview on `ok: true` |
| Raw voxel coordinates | Prompt + validator rejects non-blueprint payloads; tool never accepts coordinate arrays |
| Bypass validation | Tool always calls `validateBlueprint` before `generateStructure` |
| Edit ComponentPlan | Tool API does not import compiler IR; blueprint only via preset clone |
| Unconstrained JSON from model | Phase 1: **no** model-produced blueprint JSON; preset id from **server** classifier only |
| Huge payloads | Cap blocks returned to client (full blocks OK for dev sizes ~ tens of thousands); consider omitting full `blueprint` in SSE and sending `presetId` only |

**Update `BUILDER_SYSTEM_PROMPT`:** Preview **can** update when the server reports a successful generation tool run; assistant must not claim success without `toolResult.ok`.

---

## 6. UI integration (minimal)

| Area | Change |
|------|--------|
| `BuilderPreviewPanel` | Accept `structure: VoxelStructure \| null` prop; when set, use it instead of regenerating from static `presetId` only; badge: **“Generated preview”** vs initial **“Default preset”** |
| `BuilderClient` | Hold per-chat: `generatedStructure`, `lastToolResult`, `activePresetId`; on successful tool response, update state and `status: "preview_ready"` |
| Chat message | Show assistant text as today; attach **real** `activitySteps` from server when tool ran |
| Validation | Compact strip or activity lines for warnings (v2 `ValidationIssue`); errors block preview update |
| Failure | Preview unchanged; assistant error friendly; activity shows failed step |
| `BuilderWorkspace` header | Remove “Static preview” when `preview_ready`; show preset label from tool |
| **No** full UI redesign |

---

## 7. State model (client-only)

Per `BuilderChat` (extend `mockBuilderData.ts` types or parallel `BuilderSessionState`):

```ts
type BuilderPreviewState = {
  readonly presetId: string;
  readonly schemaVersion: 1 | 2;
  readonly structure: VoxelStructure | null; // null until first successful tool
  readonly lastToolResult?: GenerateBuildingPreviewResult;
};
```

- **New chat / reset:** structure `null`, preview shows default v2 preset (change default to `simple_cabin_v2`) until first generation.
- **Switch chat:** restore that chat’s last structure from React state (in-memory map).
- **Refresh:** all generation state lost — **no** misleading “saved build” copy; optional subtle “Not saved” in header (one line).
- **No** D1/R2.

---

## 8. Activity events (tool-driven)

Replace mock steps when `toolResult` present:

| Step id (example) | Label (example) |
|-------------------|-----------------|
| `parsed` | Parsed building request |
| `target` | Chose v2 preset: Simple cabin (v2) |
| `blueprint` | Loaded v2 component blueprint (preset) |
| `validate` | Validated blueprint |
| `generate` | Generated voxel structure (N blocks) |
| `preview` | Updated builder preview |
| `assistant` | Assistant response ready |

On failure: mark `validate` or `generate` as `error`; **no** `preview` success step.

Keep `buildMockActivitySteps` only for **chat-only** turns (no tool).

---

## 9. Server / API shape

### Recommendation: **separate endpoint + orchestration helper**

| Endpoint | Role |
|----------|------|
| `POST /api/builder/chat` | Remains chat + optional **orchestrated** turn: internally may call tool, then Workers AI; extends SSE/JSON with tool metadata |
| `POST /api/builder/generate` | **Deterministic tool only** — same auth/env as chat; usable for testing and explicit “regenerate” later |

**Why separate `/api/builder/generate`:**

- Keeps generator logic testable without Workers AI tokens.
- Avoids tangling SSE stream parser with large block payloads in every chat request.
- Chat route **calls** `generateBuildingPreview()` in-process (shared lib), not only via HTTP self-fetch.

**Client flow (phase 1):**

1. `POST /api/builder/chat` with messages (+ image).
2. Response:
   - **Stream path:** new SSE events `tool_start`, `tool_result` (summary + presetId + blockCount; **blocks** in final `done` payload or separate JSON field after stream) — **or**
   - **Simpler phase 1:** if generation intent, use **JSON response** (no stream) with `{ message, toolResult, model }`; non-generation turns keep streaming.

**Preference alignment:** Start with **non-stream chat response when tool runs** (lowest risk); preserve streaming for non-generation messages.

### Response type extension (sketch)

```ts
type BuilderChatResponse =
  | { mode: "stream"; /* existing SSE */ }
  | {
      mode: "json";
      message: string;
      model: string;
      toolResult?: GenerateBuildingPreviewResult;
    };
```

Client: if `toolResult?.ok`, apply blocks to preview.

---

## 10. Cloudflare / runtime

- Route handlers stay **OpenNext Workers**-compatible (no Edge runtime).
- Secrets unchanged (`CLOUDFLARE_*`, `WORKERS_AI_MODEL`).
- Tool path: `fetch` only inside existing Workers AI module; generator is **pure TS** (no `fs`, no `Buffer` required).
- **Do not** add Agents, D1, R2, AI Gateway.
- Streaming for **non-tool** turns must remain working; image JSON mode unchanged.
- Worker bundle: returning full block arrays in JSON increases response size — acceptable for preset-scale builds; monitor limits.

---

## 11. Testing plan

### Automated

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
```

**New unit tests (Vitest):**

- `generateBuildingPreview` — each v2 preset succeeds.
- `resolvePresetFromPrompt` — keyword → id mapping.
- `shouldRunGenerationTool` — positive/negative cases.
- Optional: `POST /api/builder/generate` route test with mocked env (minimal).

### Manual (deployed or `pnpm run preview:cloudflare`)

| Check | Expected |
|-------|----------|
| `/builder` loads | Default v2 preset preview |
| Chat without build verbs | Streams as today |
| Image prompt | Works; no false preview update unless keywords |
| “Make me a small stone cottage” | Tool runs → preview updates → real activity |
| Tool failure path | Friendly error; preview unchanged |
| `/preview`, `/generic-lab` | Unchanged |

---

## 12. Out of scope (this branch)

- Cloudflare Agents SDK, Durable Objects, D1, R2, AI Gateway
- Full v2 **authoring** from LLM JSON
- Semantic **refine** / `modify_current` beyond stub
- Canonical render evaluation, long-term memory, auth
- Model outputting voxel coordinates
- Public import/export format
- Major `/builder` UI redesign
- Generator/blueprint **logic** changes unless required for tool safety

---

## 13. Implementation phases

### Phase A — Audit & types

- Add `builderToolTypes.ts`, `generateBuildingPreview.ts` stubs.
- Preset classifier table + tests.
- Document preset ids in plan/CHANGE.

### Phase B — Deterministic tool

- Implement `generateBuildingPreview` (v2 presets only).
- `clonePresetBlueprintV2` in `src/lib/blueprints/` or extend catalog helper.
- Unit tests.

### Phase C — API

- `POST /api/builder/generate/route.ts`.
- `runBuilderChatTurn.ts` orchestration; wire into `chat/route.ts` for generation intents.
- Extend SSE or JSON response contract + `consumeBuilderChatStream` if SSE events added.

### Phase D — Client state & preview

- Extend `BuilderChat` / client state with `structure` + `toolResult`.
- `BuilderPreviewPanel` driven by generated structure.
- Default preset → v2.

### Phase E — Activity & prompts

- Real activity from tool; update `BUILDER_SYSTEM_PROMPT`.
- Validation warnings in UI (compact).

### Phase F — Docs

- `docs/development/CHANGE.md` entry.
- Short note in `docs/deployment/CLOUDFLARE.md` only if env/API behavior changes (unlikely).

---

## 14. Success criteria

- [ ] User can ask to create/build a cottage-like structure and **see preview change** after a **validated** generation.
- [ ] Activity log shows **real** tool steps (not mock “Preview unchanged”).
- [ ] Assistant does **not** claim preview updated on tool failure.
- [ ] Model is **not** given raw voxel coordinates or ComponentPlan IR.
- [ ] Streaming chat still works for non-generation messages.
- [ ] Image chat still works.
- [ ] `pnpm test:generator` and existing checks pass.
- [ ] No persistence / Cloudflare platform expansion.

---

## 15. Files likely to create/edit

| Action | Path |
|--------|------|
| Create | `src/lib/builder/builderToolTypes.ts` |
| Create | `src/lib/builder/generateBuildingPreview.ts` |
| Create | `src/lib/builder/resolvePresetFromPrompt.ts` |
| Create | `src/lib/builder/shouldRunGenerationTool.ts` |
| Create | `src/lib/builder/runBuilderChatTurn.ts` |
| Create | `src/lib/builder/builderActivityFromTool.ts` |
| Create | `src/lib/blueprints/clonePresetBlueprint.ts` (v1+v2 unified) or `clonePresetBlueprintV2.ts` |
| Create | `src/app/api/builder/generate/route.ts` |
| Edit | `src/app/api/builder/chat/route.ts` |
| Edit | `src/lib/builder/builderChatTypes.ts` |
| Edit | `src/lib/builder/builderSystemPrompt.ts` |
| Edit | `src/lib/builder/consumeBuilderChatStream.ts` (if new SSE events) |
| Edit | `src/app/builder/BuilderClient.tsx` |
| Edit | `src/app/builder/mockBuilderData.ts` |
| Edit | `src/app/builder/components/BuilderPreviewPanel.tsx` |
| Edit | `src/app/builder/components/BuilderWorkspace.tsx` |
| Edit | `src/lib/builder/mockBuilderActivity.ts` (chat-only fallback) |
| Test | `src/lib/builder/__tests__/generateBuildingPreview.test.ts` |
| Test | `src/lib/builder/__tests__/resolvePresetFromPrompt.test.ts` |
| Docs | `docs/development/CHANGE.md` |

**Do not edit** (unless build forces): `src/lib/generation/**` compiler internals, `/generic-lab` editor logic, `/preview` page.

---

## 16. Approval checklist (before implementation)

Please confirm:

1. **v2 preset selection** is acceptable as phase-1 “create_from_prompt” (no LLM blueprint JSON yet).
2. **Non-streaming** chat response when the tool runs is acceptable for v1 integration (streaming stays for normal chat).
3. **Separate** `POST /api/builder/generate` plus in-process call from chat is acceptable.
4. **Default builder preview** should switch to **`simple_cabin_v2`** (not v1 cabin).
5. Keyword list for `shouldRunGenerationTool` is sufficient for first demo (vs extra JSON planner call).

---

## 17. Main risks

| Risk | Mitigation |
|------|------------|
| False-positive tool triggers on casual chat | Tunable keyword list; require build verbs |
| Assistant contradicts tool outcome | Strict prompt + server-built summary from `toolResult` only |
| Large JSON responses (blocks) | Accept for MVP; later return presetId + regen client-side |
| SSE complexity | Phase 1 JSON for tool turns |
| User expects persistence | Copy: “Not saved after refresh” |
| `modify_current` requested but not ready | Honest “can’t edit yet” + new preset selection |

---

*After review approval, implement phase A → F on `feature/builder-agent-tools` without expanding scope.*
