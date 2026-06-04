# Plan — Builder v2 refinement operations

**Branch:** `feature/builder-agent-tools` (continued)  
**Status:** Planning only — **no implementation** until review.  
**Prerequisite:** Preset-based `generate_building_preview` tool bridge is implemented and verified on this branch.

**Live app:** https://voxel-architect.wlc562.workers.dev/

**Goal:** Extend the builder tool path from **“select v2 preset → generate”** to **“apply simple semantic edits to the current `GenericBuildingBlueprintV2` → validate → regenerate → update preview.”**

Still **not** a full autonomous agent. Boundaries unchanged:

| Layer | Responsibility |
|-------|----------------|
| **Server (code)** | Detect refine vs generate vs chat; map user text to typed operations; `applyBlueprintOperationsV2`; validate; generate blocks |
| **LLM** | User-facing explanation only; summarizes compact tool result |
| **Never** | Model authors blueprint JSON, edits `ComponentPlan`, outputs voxel coordinates, or claims preview update without `toolResult.ok` |

---

## 1. Summary

After a successful generation (e.g. “Make me a stone workshop”), the preview shows the correct v2 preset build, but every follow-up that asks to **change** the current building still hits the **create** path or returns **“modify not available yet.”**

This plan adds a **small, typed, testable operation system** on top of the existing pipeline:

```text
current GenericBuildingBlueprintV2 (in memory)
  + user refinement request (deterministic parse)
  → BlueprintOperationV2[] (server-produced)
  → applyBlueprintOperationsV2()
  → validateBlueprint()
  → generateStructure()
  → toolResult + preview update + activity log
```

**Recommended strategy:** **Option A** — deterministic rule-based operation mapper first. **No** LLM JSON planner in this step. Add Option B only after `applyOperations` and validation integration are stable and tested.

---

## 2. Current status audit

### 2.1 Builder tool files (this branch)

| File | Role |
|------|------|
| `src/lib/builder/builderToolTypes.ts` | `GenerateBuildingPreviewRequest/Result`, activity types |
| `src/lib/builder/generateBuildingPreview.ts` | Preset clone → validate → generate |
| `src/lib/builder/resolvePresetFromPrompt.ts` | Keyword → `simple_cabin_v2` \| `stone_workshop_v2` \| `porch_house_v2` |
| `src/lib/builder/shouldRunGenerationTool.ts` | Generation verb gate; image-only excluded |
| `src/lib/builder/runBuilderChatTurn.ts` | `runBuilderGenerationChatTurn` + `shouldUseGenerationJsonTurn` |
| `src/lib/builder/formatToolResultForModel.ts` | Injects tool summary for Workers AI |
| `src/lib/builder/builderActivityFromTool.ts` | Activity steps from tool result |
| `src/lib/blueprints/clonePresetBlueprint.ts` | `clonePresetBlueprintV2` |
| `src/app/api/builder/generate/route.ts` | Standalone preset tool POST |
| `src/lib/builder/__tests__/*` | Preset tool + classifier tests |

### 2.2 What already works

- **`POST /api/builder/chat`**
  - **Generation intent** → non-streaming JSON `{ message, model, toolResult }` (`X-Builder-Chat-Mode: json`, `X-Builder-Tool-Ran: true`)
  - **Normal text** → SSE streaming (unchanged)
  - **Image-only** (no build verbs) → JSON chat, no tool
- **`generateBuildingPreview`**
  - Modes: `create_from_prompt` / `select_preset` (same path), `modify_current` → **hard fail** with friendly message
  - Always starts from **fresh v2 preset clone**, not from an edited blueprint
- **Client (`BuilderClient`)**
  - On `toolResult.ok`: stores `generatedStructure` (blocks), `presetId`, `status: preview_ready`, validation warnings
  - Preview uses `generatedStructure` when present; else default v2 preset render
  - Header: “Not saved after refresh”
- **v2 stack in `src/`** (not docs-only): types, validator, resolver, generator, 3 presets, tests

### 2.3 Critical gap for refinement

| Stored today | Needed for refine |
|--------------|-------------------|
| `generatedStructure` (blocks only) | Yes for preview |
| `presetId` | Label only |
| **`activeBlueprint` JSON** | **Missing** — tool returns `blueprint` in `toolResult` but **client does not persist it** |

Without persisting and resending the blueprint, refinement would incorrectly re-clone a preset or have nothing to edit.

### 2.4 v2 blueprint shape (authoring)

Defined in `src/lib/blueprints/types/genericBuildingV2.ts`:

- **Root:** `structureType`, `schemaVersion: 2`, `metadata`, `materials` (full palette), `constraints`, `components[]`
- **Component types:** `room`, `roof`, `door`, `window_group`, `porch`, `chimney`, `step`
- **Attachments:** `SurfaceAttachment` (`targetSurface` + optional `placement.horizontal`), `DoorAttachment`

**Preset component IDs (stable across presets):**

| Preset | Notable ids |
|--------|-------------|
| `simple_cabin_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, `chimney`, `front-step` |
| `stone_workshop_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, `left-windows` (no porch/chimney) |
| `porch_house_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, `front-porch`, `front-step` |

Refinement mapper must **resolve components by id/type** on the **current** blueprint, not assume every preset has a porch or chimney.

### 2.5 Validation limits (use for clamping in `applyOperations`)

From `validateGenericBuildingV2.ts` (representative):

| Field | Range / rules |
|-------|----------------|
| `room.width` | 5–17 |
| `room.depth` | 5–13 |
| `room.wallHeight` | 4–9 |
| `roof.kind` | `pitched_gable` \| `shed` \| `none` |
| `roof.layers` | 1–3 (clamped) |
| `window_group.count` | 0–12 (façade capacity checks) |
| `porch.depth` | 1–8 |
| `attach.placement.horizontal` | `left` \| `center` \| `right` |
| Materials | Must be valid classic pack local keys |

### 2.6 `modify_current` today

`generateBuildingPreview({ mode: "modify_current" })` returns `ok: false` immediately. No blueprint input accepted.

---

## 3. Recommended next scope

### Options

| Option | Description | Speed | Risk | Demo value |
|--------|-------------|-------|------|------------|
| **A** | Deterministic text → operations | Fastest | Lowest | Good for scripted demos |
| **B** | LLM strict JSON → operations | Slower | Parse/schema failures, model drift | Broader phrasing |
| **C** | Hybrid rules + LLM fallback | Medium | Medium | Best long-term, more scope |

### Recommendation: **Option A only** (this step)

- Implement **`applyBlueprintOperationsV2`** + tests first.
- Implement **`mapRefinementPromptToOperations`** (deterministic) with an explicit **supported / unsupported** matrix.
- LLM continues to **summarize** tool results only (extend `formatToolResultForModel` with refinement fields).
- **Defer** LLM operation planner to a follow-up after 3–5 edit types work end-to-end.

**Explicit non-goals for this step:** `addComponent`, `removeComponent`, remove porch, multiple rooms, free-form LLM blueprint patches.

---

## 4. Operation model

New module: `src/lib/builder/blueprintOperationsV2.ts` (types + apply).

### 4.1 Operation union (refined from repo types)

Use **typed patches**, not `Record<string, unknown>`:

```ts
import type {
  GenericBuildingBlueprintV2,
  GenericBuildingComponentTypeV2,
  RoofKindV2,
  RoomFace,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  BlueprintMaterialPalette,
  ComponentMaterialOverride,
} from "@/src/lib/blueprints/types/materials";

export type BlueprintOperationV2 =
  | {
      op: "updateComponent";
      id: string;
      componentType: GenericBuildingComponentTypeV2;
      patch: ComponentPatchV2;
    }
  | {
      op: "setMaterialPalette";
      patch: Partial<BlueprintMaterialPalette>;
    }
  | {
      op: "setMaterialOverride";
      id: string;
      materials: ComponentMaterialOverride;
    };

/** Discriminated per-type allowed fields only. */
export type ComponentPatchV2 =
  | { type: "room"; width?: number; depth?: number; wallHeight?: number }
  | {
      type: "roof";
      kind?: RoofKindV2;
      layers?: number;
      overhang?: number;
      orientation?: "front_back" | "left_right";
    }
  | { type: "window_group"; count?: number; layout?: "symmetric" | "even" }
  | { type: "porch"; depth?: number; widthMode?: "door_only" | "full_facade" }
  | {
      type: "chimney";
      placementHorizontal?: "left" | "center" | "right";
      targetFace?: RoomFace; // only non-front faces allowed by validator
    }
  | { type: "door"; width?: number; height?: number };
  // door/step patches optional in v1 of refine — defer unless easy
```

**Deferred ops:** `addComponent`, `removeComponent`, raw coordinate ops, metadata-only edits.

### 4.2 Apply result

```ts
export type ApplyOperationsResult =
  | { ok: true; blueprint: GenericBuildingBlueprintV2; appliedLabels: string[] }
  | {
      ok: false;
      error: string;
      code:
        | "UNKNOWN_COMPONENT"
        | "TYPE_MISMATCH"
        | "UNSUPPORTED_FIELD"
        | "INVALID_VALUE";
    };
```

### 4.3 Pure function contract

```ts
export function applyBlueprintOperationsV2(
  blueprint: GenericBuildingBlueprintV2,
  operations: readonly BlueprintOperationV2[],
): ApplyOperationsResult;
```

Rules:

- `structuredClone` input; never mutate argument
- Match `id` + `componentType` on each op
- Clamp numeric fields to validator ranges **before** apply (or reject with `INVALID_VALUE`)
- Reject unknown ids / wrong types / forbidden fields (e.g. porch on workshop preset)
- **Never** accept `ComponentPlan` or `VoxelBlock[]`

---

## 5. Allowed first refinements (deterministic mapper)

Mapper: `mapRefinementPromptToOperations(prompt, blueprint) → { ok, operations } | { ok: false, reason }`.

Helper: `src/lib/builder/blueprintComponentIndex.ts` — `findRoom`, `findRoof`, `findWindowGroups`, `findPorch`, `findChimney` on current blueprint.

### 5.1 Materials (palette — `setMaterialPalette`)

| User phrasing (examples) | Operation |
|--------------------------|-----------|
| “stone walls”, “more stone” | `materials.wall` → `cobblestone` or `limestone_bricks` |
| “wooden”, “wood roof” | `materials.roof` → `oak_planks` |
| “dark wood roof” | `materials.roof` → `oak_planks` (document as approximate) |
| “glass windows” | `materials.window` → `glass` |
| “slate roof” | `materials.roof` → `slate_tiles` |

Use allowlist from `CLASSIC_BLOCK_PACK` / `CLASSIC_MATERIAL_KEYS` (same as generic-lab).

### 5.2 Room dimensions (`updateComponent` on `main-room`)

| Phrasing | Patch |
|----------|--------|
| “wider” / “make it wider” | `width += 1` (clamp max 17) |
| “narrower” | `width -= 1` |
| “deeper” | `depth += 1` (max 13) |
| “shallower” | `depth -= 1` |
| “taller” / “higher” | `wallHeight += 1` (max 9) |
| “shorter” | `wallHeight -= 1` |
| “larger” / “bigger” | `width += 1; depth += 1` |
| “smaller” | `width -= 1; depth -= 1` |

### 5.3 Roof (`updateComponent` on roof where `targetRoom === main-room`)

| Phrasing | Patch |
|----------|--------|
| “steeper roof” / “more layers” | `layers += 1` (max 3) |
| “flatter roof” / “fewer layers” | `layers -= 1` (min 1 unless kind none) |
| “shed roof” | `kind: "shed"` (+ default `orientation` if missing) |
| “gable roof” / “pitched roof” | `kind: "pitched_gable"` |

### 5.4 Windows (`updateComponent` on first/front `window_group` or all groups — start with **front** only)

| Phrasing | Patch |
|----------|--------|
| “more windows” / “add windows” | `count += 1` (max 12, façade check deferred to validator) |
| “fewer windows” | `count -= 1` (min 0) |

### 5.5 Porch (`front-porch` if present)

| Phrasing | Patch |
|----------|--------|
| “wider porch” | **Unsupported** in v1 (no width field; only `depth`, `widthMode`) — return friendly message |
| “deeper porch” / “extend porch” | `depth += 1` (max 8) |

### 5.6 Chimney (if `chimney` component exists)

| Phrasing | Patch |
|----------|--------|
| “move chimney left/right” | `attach.placement.horizontal` on chimney |
| “move chimney to the back” | change `targetSurface` to `main-room.back` (validator disallows front) |

### 5.7 Unsupported (explicit)

- Remove porch / remove chimney / add porch
- “move the door” (attachment surface changes — defer)
- Arbitrary component creation
- Raw voxel / coordinate language

Return `ok: false` with **preview unchanged** and clear assistant summary template.

---

## 6. Current blueprint state (client + API)

### 6.1 Client (`BuilderChat`)

Extend `src/app/builder/mockBuilderData.ts`:

```ts
readonly activeBlueprint: GenericBuildingBlueprintV2 | null;
```

**On successful generate/refine `toolResult`:**

- Set `activeBlueprint` from `toolResult.blueprint` (structured clone on client)
- Keep `generatedStructure`, `presetId`, `preview_ready`

**On reset / new chat:**

- Clear `activeBlueprint` and `generatedStructure`

**UI copy:** Keep “Not saved after refresh” (already present).

### 6.2 API request body

Extend `BuilderChatRequestBody` in `builderChatTypes.ts`:

```ts
readonly currentBlueprint?: GenericBuildingBlueprintV2 | null;
```

Validate server-side:

- `schemaVersion === 2`, `structureType === generic_building`
- Reasonable size cap (reuse chat body limit)
- Strip unknown top-level keys if needed

`POST /api/builder/refine` body:

```ts
{ prompt: string; blueprint: GenericBuildingBlueprintV2 }
```

### 6.3 Server flow

Never refine from preset id alone when `currentBlueprint` is provided. Clone blueprint server-side before apply.

---

## 7. Operation application + generation

New tool: `refineBuildingPreview` in `src/lib/builder/refineBuildingPreview.ts`:

```text
blueprint in
  → mapRefinementPromptToOperations
  → if unsupported: fail early
  → applyBlueprintOperationsV2
  → validateBlueprint (v2)
  → if !ok: fail with validation errors
  → generateStructure(normalized)
  → return GenerateBuildingPreviewResult (reuse type; add toolKind?: "generate" | "refine")
```

Reuse `GenerateBuildingPreviewResult`; optional field `toolKind: "refine"` and `appliedOperations?: string[]` for activity/model context.

**Do not skip validation** after apply.

---

## 8. Refinement request handling (server routing)

New: `src/lib/builder/shouldRunRefinementTool.ts`

```ts
export function shouldRunRefinementTool(
  userText: string,
  hasActiveBlueprint: boolean,
  hasImageAttachment: boolean,
): boolean;
```

**Rules (deterministic, order matters in orchestrator):**

1. If **no** `activeBlueprint` / `currentBlueprint` → refinement **off** (assistant can say “generate a building first”).
2. If image-only without refinement verbs → **off** (chat-only).
3. If text matches **new-building** preset intent (`workshop`, `cottage`, `make me a …`) **and** strong **create** phrasing → **generate** path (fresh preset), not refine.
4. If text matches **refinement** patterns (`wider`, `taller`, `change`, `switch`, `more windows`, `dark wood`, `move chimney`, `make the roof`, `make it`) **and** blueprint exists → **refine**.
5. Else → normal chat stream.

Refinement patterns (separate from `shouldRunGenerationTool`):

```ts
const REFINE_VERBS = /\b(change|switch|move|wider|narrower|deeper|taller|shorter|steeper|flatter|more|fewer|add|use|make it|make the)\b/i;
```

Orchestrator in `runBuilderChatTurn.ts`:

```ts
if (shouldRunRefinementTool(...)) return runBuilderRefinementChatTurn(...)
else if (shouldUseGenerationJsonTurn(...)) return runBuilderGenerationChatTurn(...)
else stream
```

---

## 9. LLM involvement

**This phase:**

- LLM **does not** produce `BlueprintOperationV2[]`.
- Deterministic mapper is the **only** operation author.
- LLM receives updated `formatToolResultForModel` including:
  - `TOOL_KIND: refine`
  - `OPERATIONS_APPLIED: ...`
  - `PREVIEW_UPDATED: yes|no`
- System prompt addition: on refine success, describe **specific** change (material/roof/size), not “rebuilt from scratch.”

**If unsupported mapper result:**

- Still call LLM with `PREVIEW_UPDATED: no` and `UNSUPPORTED_REASON: ...` so the assistant explains limitation honestly.

**Future (not this step):** Option B strict JSON planner behind feature flag, with schema validation and whitelist — only after Option A tests pass.

---

## 10. API design

| Endpoint | Role |
|----------|------|
| `POST /api/builder/chat` | Add refinement branch; accept optional `currentBlueprint` |
| `POST /api/builder/generate` | Unchanged (preset create) |
| **`POST /api/builder/refine`** | **New** — `{ prompt, blueprint }` → `{ toolResult }` for tests/debug |

Shared libs:

- `refineBuildingPreview()`
- `runBuilderRefinementChatTurn()` (refine + Workers AI + JSON response)

Chat route calls **in-process** refine function (no self-HTTP).

**Response:** Same JSON shape as generation turn: `{ message, model, toolResult }`, non-streaming.

---

## 11. UI integration (minimal)

| Area | Change |
|------|--------|
| `BuilderClient` | Persist `activeBlueprint` from `toolResult`; send in chat body |
| `BuilderPreviewPanel` | No structural change if blocks + blueprint stay in sync |
| Activity | Refinement-specific steps via `builderActivityFromRefine.ts` |
| Header | Optional: show last refinement in `lastOperationSummary` |
| Failure | Preview + blueprint unchanged |
| Success | Replace both `generatedStructure` and `activeBlueprint` |

Update stale chat panel copy in `BuilderChatPanel.tsx` if it still says “static preview until blueprint generation connects.”

---

## 12. Activity events (refinement)

Success path:

| id | label |
|----|--------|
| `parsed` | Parsed refinement request |
| `blueprint` | Using current v2 blueprint |
| `plan` | Planned operation: … (one per op) |
| `apply` | Applied operations to blueprint |
| `validate` | Validated updated blueprint |
| `generate` | Regenerated voxel structure (N blocks) |
| `preview` | Updated builder preview |

Unsupported path:

| id | label |
|----|--------|
| `parsed` | Parsed refinement request |
| `unsupported` | Could not map to a supported operation |
| (no preview step) | |

Extend `buildActivityEventsFromToolResult` or add `buildRefinementActivityEvents`.

---

## 13. Tests

### New unit tests

| File | Covers |
|------|--------|
| `applyBlueprintOperationsV2.test.ts` | clone safety, room width, palette, roof kind, invalid id |
| `mapRefinementPromptToOperations.test.ts` | phrasing → ops, unsupported |
| `shouldRunRefinementTool.test.ts` | blueprint required, vs generate |
| `refineBuildingPreview.test.ts` | integration on `simple_cabin_v2` blueprint |

### Keep green

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
pnpm vitest run src/lib/builder/__tests__
```

### Manual (deployed or `preview:cloudflare`)

1. “Make me a stone workshop” → preview updates  
2. “Make it taller” → taller workshop, same preset family  
3. “Make the roof dark wood” → palette roof material change (honest wording)  
4. “Add more windows” on cabin → front window count +1  
5. “Move the chimney to the left” on cabin → placement change  
6. “Make the porch wider” on porch house → **unsupported** message, preview unchanged  
7. Normal question → still streams  
8. Image-only → chat-only  
9. `/preview`, `/generic-lab` unchanged  

---

## 14. Cloudflare / OpenNext

- No new bindings, D1, R2, Agents, AI Gateway
- Same route handler pattern (no Edge runtime)
- Refine responses include full blueprint JSON — monitor response size; still acceptable for single-building presets
- Workers AI only for explanation after tool runs

---

## 15. Out of scope

- LLM-authored operations (unless explicitly approved later)
- Full free-form blueprint from model JSON
- `addComponent` / `removeComponent`
- Multiple rooms, interiors, region selection
- Persistence, auth, canonical screenshots
- Cloudflare platform expansion
- Generator/compiler changes except as forced by validation

---

## 16. Implementation phases

### Phase A — Audit + operation types

- `blueprintOperationsV2.ts` types
- `blueprintComponentIndex.ts` helpers
- Extend `builderToolTypes` (`toolKind`, refine request types)

### Phase B — `applyBlueprintOperationsV2` + tests

- Pure apply with clamp/reject
- No API wiring yet

### Phase C — `mapRefinementPromptToOperations` + tests

- Supported matrix from §5
- Unsupported messages

### Phase D — `refineBuildingPreview` + `POST /api/builder/refine`

- Full validate → generate pipeline

### Phase E — Chat orchestration

- `shouldRunRefinementTool`, `runBuilderRefinementChatTurn`
- Extend `parseBuilderChatRequestBody` / chat route ordering
- Update `formatToolResultForModel`, `BUILDER_SYSTEM_PROMPT`

### Phase F — Client state + UI

- `activeBlueprint` on `BuilderChat`
- Send `currentBlueprint` in chat POST
- Activity + chat panel copy

### Phase G — `CHANGE.md`

- Document supported refinements and limitations

---

## 17. Success criteria

- [ ] At least **3–5** refinement types work on an existing build (materials, room size, roof, windows, chimney placement)
- [ ] Edits apply to **current** blueprint, not a fresh preset
- [ ] Validation runs **after** apply; preview updates only on `toolResult.ok`
- [ ] Unsupported requests fail gracefully; preview unchanged
- [ ] Model never receives blocks/ComponentPlan to edit
- [ ] Streaming chat + image chat still work
- [ ] All automated tests pass

---

## 18. Files likely to create/edit

| Action | Path |
|--------|------|
| Create | `src/lib/builder/blueprintOperationsV2.ts` |
| Create | `src/lib/builder/applyBlueprintOperationsV2.ts` |
| Create | `src/lib/builder/blueprintComponentIndex.ts` |
| Create | `src/lib/builder/mapRefinementPromptToOperations.ts` |
| Create | `src/lib/builder/refineBuildingPreview.ts` |
| Create | `src/lib/builder/shouldRunRefinementTool.ts` |
| Create | `src/lib/builder/runBuilderRefinementChatTurn.ts` |
| Create | `src/app/api/builder/refine/route.ts` |
| Create | `src/lib/builder/__tests__/applyBlueprintOperationsV2.test.ts` |
| Create | `src/lib/builder/__tests__/mapRefinementPromptToOperations.test.ts` |
| Create | `src/lib/builder/__tests__/shouldRunRefinementTool.test.ts` |
| Create | `src/lib/builder/__tests__/refineBuildingPreview.test.ts` |
| Edit | `src/lib/builder/builderToolTypes.ts` |
| Edit | `src/lib/builder/builderChatTypes.ts` |
| Edit | `src/lib/builder/validateChatRequest.ts` (optional blueprint validation) |
| Edit | `src/lib/builder/runBuilderChatTurn.ts` |
| Edit | `src/app/api/builder/chat/route.ts` |
| Edit | `src/lib/builder/formatToolResultForModel.ts` |
| Edit | `src/lib/builder/builderSystemPrompt.ts` |
| Edit | `src/lib/builder/builderActivityFromTool.ts` |
| Edit | `src/app/builder/mockBuilderData.ts` |
| Edit | `src/app/builder/BuilderClient.tsx` |
| Edit | `src/app/builder/components/BuilderChatPanel.tsx` (stale copy) |
| Edit | `CHANGE.md` |

**Do not edit:** `src/lib/generation/components/v2/*` compiler internals unless validation forces a fix.

---

## 19. Key risks

| Risk | Mitigation |
|------|------------|
| Blueprint not stored client-side | Phase F requirement; block refine until present |
| Generate vs refine classifier collision | Explicit precedence rules; tests for “make me X” vs “make it wider” |
| Preset missing component (porch/chimney) | Index helpers return unsupported, not throw |
| Validation fails after apply | Surface validator errors; do not update preview |
| Large JSON payloads | Accept for MVP; only send blueprint on refine/generate turns |
| Mapper false positives | Conservative regex; prefer unsupported over wrong edit |

---

## 20. Approval questions (before implementation)

1. **Store full `activeBlueprint` on client** and POST it on refine/generate follow-ups — OK?
2. **“Make the porch wider”** → unsupported in v1 (only depth supported) — acceptable?
3. **Fresh generate when user says “make me a workshop”** even if a blueprint exists — should that **replace** the current build (recommended) or be treated as refine?
4. **Refine all `window_group` components** vs **front only** for “more windows” — prefer front-only first?
5. **Separate `POST /api/builder/refine`** for tests — approved?

---

*Stop here until review. Do not implement until approved.*
