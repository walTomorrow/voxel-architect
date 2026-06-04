# Plan — Deterministic builder tool expansion (semantic component operations)

**Branch:** `feature/builder-tool-expansion`  
**Status:** Implemented — see `CHANGE.md` and tests under `src/lib/builder/__tests__/componentOperations.test.ts`.  
**Prerequisite:** `feature/builder-agent-tools` merged to `main` (Workers AI chat, hybrid refinement planner, anti-hallucination guards).

**Related docs:** [`docs/plans/GENERIC_BUILDING_V2.md`](docs/plans/GENERIC_BUILDING_V2.md), [`docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md), [`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md)

---

## 1. Summary

This branch expands **deterministic builder tool capability** by introducing a **general semantic component operation framework** for `GenericBuildingBlueprintV2` — not a pile of one-off tools (`addPorchTool`, `addChimneyTool`, etc.).

| What this branch is | What this branch is not |
|---------------------|-------------------------|
| New **`addComponent` / `removeComponent`** operation types with a **registry + defaults** | Primarily an LLM routing or chat UX branch |
| Extending **`updateComponent`** where needed (e.g. porch `widthMode`) | New preset families, rooms, second floors, interiors |
| Giving the **existing LLM planner** more **legal, validated actions** | Letting the model edit voxels, `ComponentPlan`, or full blueprints |

**Product pipeline (unchanged boundary):**

```text
User intent
  → LLM proposes constrained semantic operations (JSON)
  → server normalizes + validates operations
  → applyBlueprintOperationsV2
  → validateBlueprint (v2)
  → generateStructure (deterministic compiler)
  → preview updates only on success
  → assistant explains; server/toolResult + status banner are authoritative
```

Initial allowlist: **`porch`**, **`chimney`**, **`window_group`**. The framework should make adding **`sign`**, **`awning`**, **`balcony`**, etc. a registry entry later — not a new tool path.

---

## 2. Current implementation audit

### 2.1 `BlueprintOperationV2` today

**File:** `src/lib/builder/blueprintOperationsV2.ts`

| Operation | Status | Notes |
|-----------|--------|-------|
| `updateComponent` | Implemented | Patches scoped by `ComponentPatchV2` |
| `setMaterialPalette` | Implemented | Partial palette keys |
| `setMaterialOverride` | Typed only | **Rejected** in `validatePlannerOperations` (`INVALID_OP_TYPE`) |
| `addComponent` | **Missing** | — |
| `removeComponent` | **Missing** | — |

**`ComponentPatchV2` supported fields:**

| Component | Patch fields | Applied in `applyBlueprintOperationsV2` |
|-----------|--------------|----------------------------------------|
| `room` | `width`, `depth`, `wallHeight` | Yes (clamped) |
| `roof` | `kind`, `layers`, `overhang`, `orientation` | Yes |
| `window_group` | `count`, `layout` | Yes |
| `porch` | `depth` only | Yes — **`widthMode` / `aroundDoor` not patchable** |
| `chimney` | `targetFace`, `placementHorizontal` | Yes (rewrites `attach.targetSurface`) |
| `door`, `step` | — | No `updateComponent` support |

### 2.2 `applyBlueprintOperationsV2`

**File:** `src/lib/builder/applyBlueprintOperationsV2.ts`

- Mutates blueprint via `structuredClone`.
- **`updateComponent`**: requires existing id + type match; no create/delete.
- **`setMaterialPalette` / `setMaterialOverride`**: palette/override with `CLASSIC_MATERIAL_KEYS` check.
- Returns `appliedLabels` strings consumed by tool results / activity.
- Error codes: `UNKNOWN_COMPONENT`, `TYPE_MISMATCH`, `UNSUPPORTED_FIELD`, `INVALID_VALUE`.

### 2.3 Planner validation

**Files:** `validatePlannerOperations.ts`, `buildAllowedOperationsSchema.ts`, `normalizePlannerOperation.ts`

- **`buildAllowedOperationsSchema`**: `allowedOpTypes: ["setMaterialPalette", "updateComponent"]` only.
- **Explicit unsupported list** includes: *"add or remove components"*, *"porch width changes"*, `setMaterialOverride`, metadata/constraints, voxels/ComponentPlan.
- **`validatePlannerOperations`**: per-op validation; unknown op → `INVALID_OP_TYPE`; `setMaterialOverride` hard-rejected.
- **`normalizePlannerOperation`**: coerces LLM aliases (`componentId`, hoisted patch fields); only knows `setMaterialPalette` / `updateComponent`.
- **`MAX_PLANNER_OPERATIONS`**: 3 (`plannerTypes.ts`).
- **Workers AI JSON schema** (`callWorkersAiJsonPlanner.ts`): `op` enum `setMaterialPalette` | `updateComponent` only.

### 2.4 `GenericBuildingBlueprintV2` component types

**File:** `src/lib/blueprints/types/genericBuildingV2.ts`

| Type | Authoring fields (high level) |
|------|-------------------------------|
| `room` | `width`, `depth`, `wallHeight`, `role`, … |
| `roof` | `targetRoom`, `kind`, `layers`, … |
| `door` | `attach.targetSurface`, `width`, `height` |
| `window_group` | `attach`, `count`, `layout`, `heightBand?` |
| `porch` | `attach`, `depth`, `widthMode`, `aroundDoor?` |
| `chimney` | `attach` |
| `step` | `attach.targetDoor` |

**Not in schema yet:** `sign`, `awning`, `balcony`, `dormer`, `stair`, `interior_zone`, extra rooms, second floor.

### 2.5 v2 validation (`validateGenericBuildingV2`)

**File:** `src/lib/blueprints/validateGenericBuildingV2.ts`

**Already enforced (relevant to add/remove):**

- Unique component ids (`duplicate_component_id`).
- Exactly one root `room` (error if 0 or >1).
- Surface refs must resolve (`main-room.{front,back,left,right,roof}`).
- **Porch:** `widthMode` `door_only` \| `full_facade`; `aroundDoor` required/forbidden per mode; depth 1–8; `aroundDoor` must reference a `door`.
- **Chimney:** attach required; **error** `chimney_on_front` if on front face.
- **Window_group:** count 0–12; capacity warnings/errors vs façade slots.
- **Step:** at most one step per door; `targetDoor` must exist and be `door`.
- Warnings: `no_door`, `no_windows` (allowed but warned).

**Not enforced today:** max one porch/chimney globally (policy belongs in **registry**, not validator, unless we add soft warnings).

### 2.6 v2 generation support

**File:** `src/lib/generation/components/v2/compileGenericBuildingV2Plan.ts`

Compiler already maps authoring types → internal plan:

- `window_group` → plan kind `window_group`
- `porch` → plan kind `porch`
- `chimney` → plan kind `chimney`

**Tests:** `compileGenericBuildingV2Plan.test.ts` — presets compile with these kinds.

**Implication:** Adding valid blueprint components is sufficient for preview updates; **no generator fork** required for initial milestone.

### 2.7 v2 preset component IDs

**File:** `src/lib/blueprints/sampleGenericBuildingBlueprintsV2.ts`

| Preset | Notable components |
|--------|-------------------|
| `simple_cabin_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, **`chimney`**, `front-step` — **no porch** |
| `stone_workshop_v2` | above room/roof/door; `front-windows`, `left-windows` — **no porch, no chimney** |
| `porch_house_v2` | + **`front-porch`** (`widthMode: full_facade`), `front-step` — **no chimney** |

Shared conventions: root room id **`main-room`**, front door **`front-door`**, primary front windows **`front-windows`**.

### 2.8 Builder chat / tool flow

| Piece | Role |
|-------|------|
| `/api/builder/chat` | Routes refine JSON turn vs stream/sync chat (`shouldRunRefinementTool`, `shouldUseGenerationJsonTurn`) |
| `planAndRefineBuildingPreview` | Classify prompt → deterministic map or LLM planner → apply → validate → generate |
| `classifyRefinementPrompt` | **Problem for this branch:** `add/remove porch|chimney|…` → **`structural`** → LLM path, but planner schema **still forbids** add/remove → graceful rejection only |
| `mapRefinementPromptToOperations` | Literal mechanical edits only (dimensions, materials, roof kind, porch **depth**, chimney move, window count on **existing** groups) |
| `planBlueprintOperationsWithLlm` | JSON planner + `validatePlannerJsonAndOperations` |
| Anti-hallucination | `guardNoToolChangeClaims`, `applyChatOnlyResponseSafety`, stream finalize guard |
| UI authority | `buildToolResultStatusBanner` — “Preview updated” / “Preview unchanged” from `toolResult` |

### 2.9 Gap summary

| Capability | Exists | Missing |
|------------|--------|---------|
| Patch room/roof/windows/porch depth/chimney face | Yes | Porch `widthMode`, `aroundDoor` patch |
| Add/remove components | No | `addComponent`, `removeComponent`, registry |
| Planner legal add/remove | No | Schema, prompt, validation, normalization |
| Deterministic “add a porch” | No | Mapper could delegate to registry later |
| Structural add/remove routing | Misaligned | Classifier treats as structural; planner rejects |
| Affordances in planner context | Partial (component list) | “can add porch”, “has chimney”, semantic descriptors |

---

## 3. First-principles architecture

```text
Level 0 — User intent (natural language)
  "make it more welcoming"

Level 1 — Planner operations (public, constrained JSON)
  addComponent(porch), updateComponent(front-windows, count+1), setMaterialPalette(accent warmer)

Level 2 — Authoring blueprint (GenericBuildingBlueprintV2)
  semantic components: room, roof, door, window_group, porch, chimney, step

Level 3 — Validation + normalization
  validateGenericBuildingV2, id/surface/dependency rules

Level 4 — Compiler IR (private)
  ComponentPlanV2 — NEVER exposed to LLM or API consumers

Level 5 — Output
  VoxelBlock[] → preview
```

**This branch expands Levels 1–2** (new ops + registry materialization) and **Level 3** (operation validation). It must **not** bypass Level 3–5 or edit Level 4 directly.

**Hierarchy example:**

| User says | Planner may emit | Blueprint change | Compiler |
|-----------|------------------|------------------|----------|
| “add a chimney” | `addComponent` intent → server builds `ChimneyComponentV2` | new `chimney` on `main-room.back` | existing chimney emitter |
| “make the porch wider” | `updateComponent` on `front-porch` patch `widthMode: full_facade` | porch authoring fields | existing porch emitter |
| “more welcoming” | combo: add porch + palette + windows (≤3 ops) | multiple components | unchanged pipeline |

---

## 4. Proposed operation model

### 4.1 Extended `BlueprintOperationV2`

Refine types in `blueprintOperationsV2.ts`:

```ts
export type BlueprintOperationV2 =
  | UpdateComponentOperation
  | SetMaterialPaletteOperation
  | SetMaterialOverrideOperation  // still optional for planner; keep rejected until needed
  | AddComponentOperation
  | RemoveComponentOperation;
```

### 4.2 Recommended: Option B — constrained add intent (planner-facing)

**Planner-facing** add operation (new type, not full component blob):

```ts
export type AddComponentIntentOperation = {
  readonly op: "addComponent";
  readonly componentType: AddableComponentKind; // allowlist
  readonly id?: string; // optional; server assigns if omitted
  readonly targetSurface?: RoomSurfaceRef; // e.g. main-room.front
  readonly placement?: "left" | "center" | "right";
  readonly options?: AddComponentOptions; // type-specific, constrained
};

export type AddComponentOptions =
  | { readonly kind: "porch"; readonly depth?: number; readonly widthMode?: PorchWidthModeV2 }
  | { readonly kind: "chimney"; readonly placementHorizontal?: "left" | "center" | "right" }
  | { readonly kind: "window_group"; readonly count?: number; readonly layout?: WindowLayoutV2 };
```

**Server-internal** after materialization (apply layer):

```ts
export type AddComponentOperation = {
  readonly op: "addComponent";
  readonly component: GenericBuildingComponentV2;
};
```

Flow: `normalizePlannerOperation` → validate intent → **`materializeAddComponent(intent, blueprint, registry)`** → canonical `AddComponentOperation` → append to `components[]`.

### 4.3 Remove operation

```ts
export type RemoveComponentIntentOperation = {
  readonly op: "removeComponent";
  readonly id: ComponentId;
};

// Internal: same shape; apply deletes by id after dependency checks
```

**Policy:** Only ids that exist and are **removable kinds** (initially `porch`, `chimney`, `window_group` — not `room`, `roof`, `door`, `step` unless explicit step policy).

### 4.4 Extend `updateComponent` (porch width)

Add to `ComponentPatchV2` for `porch`:

```ts
| { readonly type: "porch"; readonly depth?: number; readonly widthMode?: PorchWidthModeV2; readonly aroundDoor?: ComponentId | null }
```

Validation must mirror `validateGenericBuildingV2` rules when applying patches.

### 4.5 Why not Option A (full component from LLM)

| Risk | Option A | Option B |
|------|----------|----------|
| Invented fields / types | High | Low |
| Invalid `aroundDoor` / `widthMode` combos | High | Registry enforces |
| Stable IDs | LLM may collide | Server generates |
| Extensibility | Copy-paste per type | Registry entry |

**Recommendation:** **Option B** for planner JSON; server materialization is the only place that constructs full `GenericBuildingComponentV2`.

Option A may be used **only in tests** or internal fixtures, not in planner schema.

---

## 5. Component registry / defaults

**New module (proposed):** `src/lib/builder/componentOperationRegistry.ts`

```ts
export type AddableComponentKind = "porch" | "chimney" | "window_group";

export type RemovableComponentKind = AddableComponentKind; // phase 1

export type ComponentOperationSpec<K extends AddableComponentKind> = {
  readonly type: K;
  readonly canAdd: (blueprint: GenericBuildingBlueprintV2) => { ok: true } | { ok: false; reason: string };
  readonly defaultIntent: (ctx: MaterializeContext) => AddComponentIntentOperation;
  readonly materialize: (intent: AddComponentIntentOperation, blueprint: GenericBuildingBlueprintV2) => GenericBuildingComponentV2;
  readonly validateNew: (blueprint: GenericBuildingBlueprintV2, component: GenericBuildingComponentV2) => ValidationIssue[];
  readonly onRemove?: (blueprint: GenericBuildingBlueprintV2, id: ComponentId) => GenericBuildingBlueprintV2;
};
```

### 5.1 Stable unique IDs

Algorithm (server-only):

1. Base slug: `{type}-{face}` from target surface (`porch-front`, `chimney-back`, `windows-left`).
2. If collision, suffix `-2`, `-3`, …
3. Reject if id matches reserved roots (`main-room`, `main-roof`, `front-door`) or existing id.

Planner may suggest `id`; validator rejects unknown format / collision / reserved.

### 5.2 Default target surfaces

| Kind | Default `targetSurface` | Fallback logic |
|------|-------------------------|----------------|
| `porch` | `main-room.front` | Requires root room + front door for `door_only` default |
| `chimney` | `main-room.back` | If back invalid, try `right` / `left` (never `front` — validator error) |
| `window_group` | Parse prompt: left/right/back/front; else `main-room.front` if no group on front, else first free side |

Use `findRootRoom`, `findFrontDoor`, `findPorch`, `findChimney`, existing window groups by surface.

### 5.3 Duplicate prevention

| Kind | Phase-1 policy |
|------|----------------|
| `porch` | **At most one** porch per blueprint (`canAdd` fails if `findPorch`) |
| `chimney` | **At most one** chimney (`canAdd` fails if `findChimney`) |
| `window_group` | **Multiple allowed** on different surfaces; `canAdd` fails if group already on same surface |

### 5.4 Dependencies

| Scenario | Behavior |
|----------|----------|
| Porch `door_only` | Set `aroundDoor: front-door` when front door exists; else `full_facade` or reject add |
| Porch add on workshop | No porch today — add with `depth: 2`, `widthMode: door_only`, `aroundDoor: front-door` |
| Step on remove porch | **Keep step** (attached to door, not porch) — `porch_house_v2` pattern |
| Remove door | **Out of scope** — do not allow `removeComponent` on doors in phase 1 |
| Remove window_group | Allowed; warn if last window group removed (`no_windows` already warned) |
| Remove chimney | Allowed; no cascade |

### 5.5 `getBlueprintAffordancesForPlanner()` (recommended, small)

**New helper:** `src/lib/builder/getBlueprintAffordancesForPlanner.ts`

Returns compact facts for planner prompt + deterministic hints:

```ts
{
  hasPorch: boolean;
  hasChimney: boolean;
  surfacesWithWindows: RoomSurfaceRef[];
  canAdd: { porch: boolean; chimney: boolean; window_group: Record<face, boolean> };
  removableIds: { porch?: string; chimney?: string; windowGroups: string[] };
  descriptors?: string[]; // future: "no porch", "compact workshop"
}
```

**Recommendation:** Add in **Phase B** (registry design) — low cost, high value for Option B planner and for semantic multi-op plans (“more welcoming” → add porch if `canAdd.porch`).

---

## 6. Initial add/remove component behavior

### 6.1 Porch

**Add (defaults):**

- `targetSurface`: `main-room.front`
- `placement`: `center`
- `depth`: `2`
- `widthMode`: `door_only` if `front-door` exists, else `full_facade`
- `aroundDoor`: `front-door` when `door_only`
- `id`: `front-porch` or generated

**Remove:**

- Remove porch component only.
- Do not auto-remove `front-step`.

**Update (existing + extend patch):**

- `depth` — already supported
- **`widthMode`** — add patch support; `door_only` → `full_facade` for “wider porch” / “full width porch”
- When switching to `full_facade`, clear `aroundDoor` (validator requires)

**Deterministic mapper (optional Phase G):** literal “add a porch” → materialized `addComponent` without LLM.

### 6.2 Chimney

**Add:**

- Default `main-room.back`, `placement.horizontal: center`
- `id`: `chimney` if free, else `chimney-back`
- Reject if chimney already exists

**Remove:**

- Remove by id `chimney` or sole chimney component

**Update:** existing chimney face / horizontal patch unchanged

### 6.3 Window group

**Add:**

- `targetSurface` from prompt (`left`, `right`, `back`, `front`)
- `count`: `2`, `layout`: `even` (side) or `symmetric` (front)
- `heightBand`: inherit preset style (`mid` for workshop) or `auto`
- `id`: `left-windows`, `right-windows`, etc.

**Remove:**

- By explicit id from affordances, or “remove side windows” → remove `left-windows` if unambiguous
- Allow removing all groups (warning only)

**Update vs add:** If group exists on target surface, prefer `updateComponent` count/layout instead of second group (validator may allow two on same surface but registry should discourage — **policy: one group per surface**).

### 6.4 Semantic combo example (“more welcoming”)

Within `MAX_PLANNER_OPERATIONS = 3`:

1. `addComponent` porch (if `canAdd.porch`)
2. `updateComponent` `front-windows` count +1
3. `setMaterialPalette` accent/window warmer materials

If porch exists: swap (1) for porch `widthMode: full_facade` or depth bump.

---

## 7. Planner schema update

### 7.1 Allowed op types

```ts
allowedOpTypes: ["setMaterialPalette", "updateComponent", "addComponent", "removeComponent"]
```

Remove from **unsupported** list: “add or remove components”.  
Move “porch width changes” to **supported** via `updateComponent` porch `widthMode` patch.

### 7.2 Planner JSON examples (Option B)

**Add porch:**

```json
{
  "op": "addComponent",
  "componentType": "porch",
  "targetSurface": "main-room.front",
  "placement": "center",
  "options": { "kind": "porch", "depth": 2, "widthMode": "door_only" }
}
```

**Add chimney:**

```json
{ "op": "addComponent", "componentType": "chimney", "targetSurface": "main-room.back", "placement": "center" }
```

**Add side windows:**

```json
{
  "op": "addComponent",
  "componentType": "window_group",
  "targetSurface": "main-room.left",
  "options": { "kind": "window_group", "count": 2, "layout": "even" }
}
```

**Remove:**

```json
{ "op": "removeComponent", "id": "chimney" }
```

**Wider porch:**

```json
{
  "op": "updateComponent",
  "id": "front-porch",
  "componentType": "porch",
  "patch": { "type": "porch", "widthMode": "full_facade", "aroundDoor": null }
}
```

### 7.3 `PLANNER_SYSTEM_PROMPT` + affordances block

Update `buildPlannerPrompt.ts`:

- Document `addComponent` / `removeComponent` intent shapes.
- Inject `renderAffordancesText(getBlueprintAffordancesForPlanner(blueprint))`.
- List **removable ids** explicitly for `removeComponent`.
- Keep: no voxels, no ComponentPlan, max 3 ops, unsupported status.

### 7.4 Workers AI `PLANNER_RESPONSE_FORMAT`

Extend `callWorkersAiJsonPlanner.ts` JSON schema `op` enum and per-op property shapes (still loose `patch` object for update, constrained keys for add intent).

### 7.5 `classifyRefinementPrompt` alignment

**Change required:** Remove `add/remove porch|chimney` from `hasStructuralUnsupportedSignals` once ops exist.

| Class | Routing after change |
|-------|---------------------|
| “add a chimney” | **literal** or **semantic** → LLM/deterministic with legal ops |
| “add a second floor” | **structural** → unsupported |
| “make the porch wider” | **literal** if porch exists (widthMode patch) |

---

## 8. Operation validation and normalization

### 8.1 `normalizePlannerOperation`

- Map aliases: `component_type`, `target_surface`, nested `options`.
- Coerce `removeComponent` `componentId` → `id`.
- Do **not** accept full raw component blobs from LLM without passing through materializer.

### 8.2 `validatePlannerOperations`

New checks:

| Check | Code (proposed) |
|-------|-----------------|
| `addComponent.componentType` in allowlist | `INVALID_ADD_TYPE` |
| `canAdd` registry rule | `ADD_NOT_ALLOWED` |
| `targetSurface` matches `^.+\.(front\|back\|left\|right\|roof)$` and room exists | `INVALID_SURFACE` |
| `removeComponent.id` exists + removable kind | `NOT_REMOVABLE` / `UNKNOWN_COMPONENT_ID` |
| Materialized component passes `validateNew` | `ADD_VALIDATION_FAILED` |
| Porch patch `widthMode` + `aroundDoor` consistency | `UNSUPPORTED_PATCH_FIELD` |
| Unknown op keys | `UNSUPPORTED_PATCH_FIELD` |
| Op count ≤ 3 | `TOO_MANY_OPERATIONS` |

Pipeline:

```text
raw ops → normalizePlannerOperations → validateOperation (intent)
  → materializeAddComponents (per add op) → validateOperation (canonical)
  → validated BlueprintOperationV2[]
```

### 8.3 `applyBlueprintOperationsV2`

- Handle `addComponent`: append after uniqueness check.
- Handle `removeComponent`: filter out id; optional registry `onRemove` hook.
- Extend porch patch application for `widthMode` / `aroundDoor`.
- New error codes: `DUPLICATE_COMPONENT`, `ADD_NOT_ALLOWED`, `NOT_REMOVABLE`.

### 8.4 Post-apply invariant

Unchanged: `planAndRefineBuildingPreview` still runs `validateBlueprint` then `generateStructure`. Any blueprint-level error → failed tool result, preview unchanged.

---

## 9. Semantic material and build summary connection

**Not in scope:** full semantic material library.

**In scope (planning):**

- Document how future planner context will include **material descriptors** (rustic, sturdy, medieval) mapped to **palette ops** only.
- **`getBlueprintAffordancesForPlanner()`** supplies **structural affordances**: `canAdd.porch`, `hasChimney`, `surfacesWithWindows`, `no porch`.
- Optional **build descriptors** derived from summary (compact, squat, workshop-like) — read-only strings in prompt; no new ops.

**Connection:**

```text
Affordances + summary → LLM chooses legal add/remove/update
Material semantics → setMaterialPalette + update existing components only
```

---

## 10. API and orchestration

| Endpoint / module | Impact |
|-------------------|--------|
| `/api/builder/chat` | No route change; refine path uses expanded planner |
| `/api/builder/refine` | Same pipeline if shared with `planAndRefineBuildingPreview` |
| `planAndRefineBuildingPreview` | New apply paths; activity labels for add/remove |
| `mapRefinementPromptToOperations` | Optional: literal add/remove/wider porch without LLM |
| `formatToolResultForModel` | Include applied add/remove in `APPLIED_OPERATIONS` |
| Anti-hallucination | Unchanged — still keyed on `toolResult.ok` |

**Success path unchanged:**

```text
planner → normalize/validate → materialize → apply → validateBlueprint → generate → toolResult.ok
```

---

## 11. Activity events and UI

**New labels (server-authored, in `planAndRefineBuildingPreview` / apply):**

- Planned component addition
- Materialized porch component
- Added porch on front surface
- Removed chimney component
- Added window group on left surface
- Validated updated blueprint
- Regenerated voxel structure

**UI:** No redesign. Continue **`buildToolResultStatusBanner`** for preview updated/unchanged. Assistant text remains non-authoritative.

---

## 12. Testing plan

### 12.1 Unit tests (new/updated)

| Area | Cases |
|------|-------|
| Registry | `canAdd` porch/chimney/window; ID generation; defaults |
| Materialize | intent → full component; invalid surface |
| `applyBlueprintOperationsV2` | add porch to workshop; add when porch exists (fail); remove porch; add/remove chimney; add left windows; remove window group |
| Validation | duplicate id; invalid surface; not removable; dangling refs |
| Planner | schema includes add/remove; sample JSON validates; normalize aliases |
| Integration | apply → `validateBlueprint` → `generateStructure` succeeds |
| classify | “add a porch” not structural unsupported |

### 12.2 Commands

```bash
pnpm exec tsc --noEmit
pnpm test:generator
pnpm run build
```

### 12.3 Manual tests

1. Generate **stone workshop** (`stone_workshop_v2`).
2. “add a chimney” → preview updates, chimney visible.
3. “remove the chimney” → preview updates.
4. “add a porch” → porch on front.
5. “make the porch wider” → `widthMode` `full_facade` (porch house or after add).
6. “add windows on the left side” → `left-windows` group.
7. “remove the side windows” → group removed.
8. “make it more welcoming” → multi-op or unsupported with clear reason.
9. “add a second floor” → graceful unsupported, preview unchanged.

---

## 13. Cloudflare / runtime considerations

- No Cloudflare Agents, D1, R2, AI Gateway, persistence.
- Same Workers AI env vars; planner call pattern unchanged.
- All new logic **server-side deterministic** TypeScript.
- No route runtime changes.

---

## 14. Out of scope

- Multiple rooms, side rooms, second floors
- Interiors / zones
- Selected-region editing
- Canonical screenshots, image-aware planning
- Full free-form blueprint generation from LLM
- Raw voxel coordinates, `ComponentPlan` editing
- `door` / `step` add-remove (unless explicitly deferred sub-task)
- Persistence, auth, Cloudflare data plane
- New component types beyond porch / chimney / window_group in phase 1

---

## 15. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **A — Audit + operation design** | Finalize types (`AddComponentIntent`, canonical apply shape); porch `widthMode` patch spec; classifier changes doc |
| **B — Registry + defaults** | `componentOperationRegistry.ts`, `materializeAddComponent`, `getBlueprintAffordancesForPlanner` |
| **C — Validation + normalization** | `validatePlannerOperations`, `normalizePlannerOperation`, materialize pass |
| **D — applyBlueprintOperationsV2** | add/remove apply, porch patch extension, labels |
| **E — Planner schema + prompt** | `buildAllowedOperationsSchema`, `PLANNER_SYSTEM_PROMPT`, Workers AI JSON schema |
| **F — Activity + tool formatting** | Events, `appliedOperations`, banner detail strings |
| **G — Tests + docs** | Unit/integration tests; update `CHANGE.md`; optional deterministic mapper for literal add/remove |

---

## 16. Success criteria

- [x] `addComponent` and `removeComponent` exist as **general** operation types (not per-component tools).
- [x] **porch**, **chimney**, **window_group** work through registry + materialization.
- [x] LLM planner requests adds via **Option B** intent; server builds components.
- [x] Preview updates only after **validateBlueprint** + **generateStructure** succeed.
- [x] Existing chat, streaming, anti-hallucination, and refinement routing still work.
- [x] `pnpm exec tsc --noEmit`, `pnpm test:generator`, `pnpm run build` pass.

---

## 18. Long-term architecture (semantic layer above geometry)

`GenericBuildingBlueprintV2` components are the **semantic authoring layer**. They preserve architectural meaning for the LLM and user: porch, chimney, window_group, roof, room, and so on.

This branch expands the **semantic component operation framework** (`addComponent` / `removeComponent` registry). These components must **not** become permanent isolated generator islands.

**Intended long-term hierarchy:**

```text
User intent
  → semantic operations (constrained JSON)
  → GenericBuildingBlueprintV2 components
  → private ComponentPlanV2
  → reusable geometric primitives / shared emitters
  → validated VoxelBlock[]
```

Future geometric primitives may include volumes, wall segments, slabs, posts, roof planes, openings/cutouts, trim bands, stairs, and simple shape primitives. The LLM should edit **semantic components and operations**, not raw geometry, voxel coordinates, or `ComponentPlanV2`.

The phase-1 registry is an **extensible semantic layer** above that future reusable geometry — new component types register defaults and validation rather than new one-off API tools.

---

*Plan approved and implemented on `feature/builder-tool-expansion`.*
