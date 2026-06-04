# Builder refinement routing — LLM-primary for semantic edits

**Status:** Implemented  
**Scope:** Routing refactor only — no new operation types, no add/remove components, no persistence/Agents/D1/R2/AI Gateway/canonical screenshots/image-aware planning.

## Problem

`auto` mode currently runs **deterministic mapper first**, then LLM on miss. Recent tactical regex additions (`less squat`, `sturdier`, `brighter`, `dominate silhouette`) make tests pass but fight the product goal: **the LLM planner should interpret design intent** into safe, validated operations.

The durable path is already in place:

```
planner JSON → normalizePlannerOperation → validatePlannerOperations
  → applyBlueprintOperationsV2 → validateBlueprint → generateStructure
```

This refactor changes **who plans first**, not the validation pipeline.

---

## Stepping stone: future semantic material library

This routing refactor is a **stepping stone** toward richer semantic planning — not the final form.

**Now (this refactor):** semantic/stylistic/design requests go to the LLM planner using the **existing** inputs:

- compact blueprint summary (`summarizeBlueprintForPlanner`)
- allowed operation schema (`buildAllowedOperationsSchema`)
- planner system prompt + JSON schema

**Later (out of scope here):** the planner should receive richer semantic metadata, for example:

| Category | Examples |
|----------|----------|
| Material descriptors | rustic, medieval, sturdy, bright, heavy, warm, refined |
| Build-level descriptors | compact, squat, tall, utilitarian, cozy, workshop-like |
| Component affordances | has porch, has chimney, roof kind, window distribution |
| Style/material compatibility hints | e.g. slate + workshop, cobblestone + sturdy |

That semantic material library and higher-level build summaries will **plug into** `buildPlannerUserPrompt` / `summarizeBlueprintForPlanner` without changing the routing contract established here: literal → deterministic; semantic/structural → LLM → normalize → validate → apply.

**Do not implement** the semantic material library in this refactor. Document only.

---

## Target behavior

| Request class | Planner path | Example |
|---------------|--------------|---------|
| Literal mechanical | Deterministic (fast path) | "make it taller" |
| Semantic / stylistic / design | LLM only (skip deterministic) | "make it less squat" |
| Structural (unsupported) | LLM → structured `unsupported` | "add a second floor" |
| Design feedback / opinion | Chat only — no refine tool | "what do you think of the build?" |

`deterministic` and `llm` modes remain for debug/API; `auto` becomes **classification-driven**.

---

## Classification precedence (exact order)

Classification spans two layers. **Layer 1** runs before the refine tool is invoked; **Layer 2** runs inside `resolveRefinementPlan` after the refine tool is chosen.

### Layer 1 — Chat vs refine tool (`shouldRunRefinementTool.ts`)

**A. Design feedback / opinion only → do not refine.**

Handled by existing `looksLikeDesignFeedback()` — chat stream with build context, no tool.

Examples: "what do you think of the build?", "how does this look?"

No changes to core responsibility; audit only to ensure opinion prompts stay out of refinement.

### Layer 2 — Planner routing (`classifyRefinementPrompt.ts`, used in `auto` mode)

After the refine tool is selected, classify the prompt. **Order matters — literal porch edits must not be swallowed by structural rules.**

**B. Supported literal mechanical edit → deterministic first.**

Examples: "make it taller", "make the porch deeper", "extend the porch", "make the roof oak"

→ `mapRefinementPromptToOperations`; on hit → `plannerPath: deterministic`.  
→ On miss only: fall through to LLM (typo / edge-case tolerance).

**C. Semantic / stylistic / design language → LLM planner (skip deterministic).**

Examples: "make it less squat", "make it sturdier", "make it more medieval", "make it more rustic"

→ Skip deterministic entirely → `planBlueprintOperationsWithLlm`.

**D. Structural but unsupported → LLM planner (structured unsupported).**

Examples: "add a second floor", "add a side room", "remove the porch", "add a porch", "make the porch wider"

→ Skip deterministic → LLM returns `{ status: "unsupported", unsupportedReason: "..." }` → `PLANNER_UNSUPPORTED`.

### Precedence within Layer 2 (first match wins)

```
1. Literal mechanical signals  → class: literal     (B)
2. Semantic / stylistic signals → class: semantic    (C)
3. Structural unsupported signals → class: structural (D)
4. Default                     → class: literal     (B, try deterministic then LLM fallback)
```

**Critical:** Step 1 runs **before** step 3 so supported literal porch depth edits are never classified as structural.

**Combined prompts:** If both literal and semantic signals appear, **semantic wins** (LLM handles the full intent).

Example: "make it taller and sturdier" → **semantic / LLM** (style language present).

---

## Porch classification (boundary rules)

Porch handling is the highest-risk boundary. Explicit expected behavior:

| Prompt | Class | Path | Outcome |
|--------|-------|------|---------|
| make the porch deeper | literal | deterministic | porch `depth + 1` (when porch exists) |
| extend the porch | literal | deterministic | porch `depth + 1` (depth extension, not new component) |
| make the porch wider | structural* | LLM | likely `PLANNER_UNSUPPORTED` (porch width not supported) |
| add a porch | structural | LLM | `PLANNER_UNSUPPORTED` (add component not supported) |
| remove the porch | structural | LLM | `PLANNER_UNSUPPORTED` (remove component not supported) |

\* "wider porch" may also match semantic if phrased aesthetically; either way → LLM, not deterministic.

### Literal porch signals (check **before** structural)

When blueprint has a porch component:

- `\bporch\b` + `\b(deeper|more deep|shallower|less deep)\b`
- `\bextend the porch\b` / `\bextend porch\b` (interpret as depth + 1, not add-component)

### Structural porch signals (only when literal porch depth did **not** match)

- `\b(add|remove|delete)\b` + `\bporch\b`
- `\b(wider|narrower)\b` + `\bporch\b` / `\bporch wider\b`
- `\badd a porch\b`, `\bremove the porch\b`

Same pattern applies to chimney: move left/right/back = literal; add/remove chimney = structural → LLM.

---

## Keep deterministic mapper small

### Explicitly remove or demote these semantic hard rules

These were tactical band-aids and **must be removed** from `mapRefinementPromptToOperations.ts`:

- `less squat` / `not so squat` / `less stocky` (from taller regex)
- `sturdier` / `more sturdy` / `heavier` / `more solid` / `more stone` / `stone building`
- `brighter` / `lighter look` / `more light`
- `dominate` / `dominant` / `prominent` + roof/silhouette block
- bare `light wood` (without explicit slot + material command)
- any `more rustic` / `medieval` / `cozy` style rules if present

Also **remove early deterministic hard-rejects** for add/remove porch/chimney/wider porch — those become structural → LLM unsupported.

### Deterministic mapper retains **only** explicit mechanical commands

| Category | Allowed patterns |
|----------|------------------|
| Room dimensions | taller, shorter, wider, narrower, deeper, shallower, larger, smaller |
| Roof | kind switch (gable/shed), layer count (steeper/flatter/more layers) |
| Front windows | more/fewer windows (count ± 1) |
| Porch depth | deeper/shallower; extend the porch |
| Chimney | move left / right / back |
| Materials | **explicit slot + material** only ("make the roof oak", "stone walls", "slate roof", "glass windows") |

No aesthetic inference in the deterministic layer.

---

## `planAndRefineBuildingPreview` routing (`auto` mode)

```
class = classifyRefinementPrompt(prompt)

if class === "semantic" || class === "structural":
  activity: "Semantic edit — using LLM planner"
  → planBlueprintOperationsWithLlm (skip deterministic)

if class === "literal":
  mapped = mapRefinementPromptToOperations(...)
  if mapped.ok:
    activity: "Matched deterministic edit"
    → plannerPath: deterministic
  else:
    activity: "Semantic edit — using LLM planner"   // fallback only
    → planBlueprintOperationsWithLlm
```

`deterministic` mode: mapper only (unchanged).  
`llm` mode: LLM only (unchanged).

---

## Validation pipeline (unchanged, mandatory)

No changes to:

- `normalizePlannerOperation.ts`
- `validatePlannerOperations.ts`
- `applyBlueprintOperationsV2`
- `validateBlueprint` / `generateStructure`

Planner output remains **untrusted** until validated.

---

## Activity labels (explicit)

| Event id | When | Label |
|----------|------|-------|
| `plan-class` | Semantic or structural class; literal fallback to LLM | `Semantic edit — using LLM planner` |
| `plan-det` | Literal deterministic hit | `Matched deterministic edit` |
| `plan-llm` | LLM request issued | `Planned semantic edit with LLM` |
| `plan-valid` | LLM JSON passed validation | `Validated operation plan` |
| `plan-reject` | `PLANNER_UNSUPPORTED` | `Rejected unsupported edit: {reason}` |
| `plan-reject` | Validation / upstream | `Rejected: {CODE} — {detail}` |

Implement via branch in `planAndRefineBuildingPreview` and/or `formatRejectionActivityLabel` for unsupported vs validation rejects.

---

## Tests (no live Workers AI)

### Existing hooks

- `setLlmPlannerForTests(fn)` in `planBlueprintOperationsWithLlm.ts`

### New / updated test files

| File | Purpose |
|------|---------|
| `classifyRefinementPrompt.test.ts` | Classification unit tests |
| `mapRefinementPromptToOperations.test.ts` | Literal mapper only; remove semantic band-aid tests |
| `planAndRefineBuildingPreview.test.ts` | End-to-end routing with mocked LLM |
| `shouldRunRefinementTool.test.ts` | Confirm design feedback stays chat-only |

### Boundary cases (required)

| Prompt | Expected classification | Expected routing | LLM mock? |
|--------|-------------------------|------------------|-----------|
| make the porch deeper | literal | deterministic | not called |
| extend the porch | literal | deterministic (porch exists) | not called |
| make the porch wider | structural | LLM → unsupported | called |
| add a porch | structural | LLM → unsupported | called |
| remove the porch | structural | LLM → unsupported | called |
| what do you think of the build? | n/a (Layer 1) | chat only, no refine | n/a |
| make it taller and sturdier | semantic | LLM | called |
| make the roof oak | literal | deterministic | not called |
| make it more rustic | semantic | LLM | called |
| make it taller | literal | deterministic | not called |
| make it less squat | semantic | LLM | called |
| add a second floor | structural | LLM → unsupported | called |

**Routing test pattern:**

```ts
let llmCalled = false;
setLlmPlannerForTests(async () => {
  llmCalled = true;
  return { ok: true, operations: [...], rationaleSummary: "mock" };
});
// literal: expect plannerPath === "deterministic" && !llmCalled
// semantic/structural: expect plannerPath === "llm" && llmCalled
```

**Unsupported structural mock:**

```ts
setLlmPlannerForTests(async () => ({
  ok: false,
  unsupportedReason: "Adding a porch is not supported yet.",
  rejectionCode: "PLANNER_UNSUPPORTED",
}));
// expect activity label includes "Rejected unsupported edit"
```

---

## Manual test matrix (post-deploy)

| Prompt | Expected `plannerPath` | Activity highlight |
|--------|------------------------|-------------------|
| make it taller | deterministic | Matched deterministic edit |
| make it less squat | llm | Semantic edit → Planned semantic edit with LLM |
| make the roof dominate the silhouette | llm | Semantic edit → Planned semantic edit with LLM |
| make it brighter | llm | Semantic edit → Planned semantic edit with LLM |
| make the workshop sturdier | llm | Semantic edit → Planned semantic edit with LLM |
| make the porch deeper | deterministic | Matched deterministic edit |
| extend the porch | deterministic | Matched deterministic edit |
| make the porch wider | llm | Rejected unsupported edit |
| add a porch | llm | Rejected unsupported edit |
| add a second floor | llm | Rejected unsupported edit |
| make the roof oak | deterministic | Matched deterministic edit |
| make it more rustic | llm | Planned semantic edit with LLM |
| what do you think of the build? | n/a | Chat stream, no tool activity |

---

## Files touched (implementation checklist)

| File | Change |
|------|--------|
| `src/lib/builder/classifyRefinementPrompt.ts` | **New** — precedence-aware classifier |
| `src/lib/builder/mapRefinementPromptToOperations.ts` | Remove semantic band-aids; add `extend the porch`; remove structural hard-rejects; narrow materials |
| `src/lib/builder/planAndRefineBuildingPreview.ts` | Classification-driven `auto` routing; activity labels |
| `src/lib/builder/plannerRejection.ts` | Optional: `formatUnsupportedEditActivityLabel` |
| `src/lib/builder/__tests__/classifyRefinementPrompt.test.ts` | **New** — boundary matrix |
| `src/lib/builder/__tests__/mapRefinementPromptToOperations.test.ts` | Literal-only tests |
| `src/lib/builder/__tests__/planAndRefineBuildingPreview.test.ts` | Routing + mock LLM matrix |
| `src/lib/builder/__tests__/shouldRunRefinementTool.test.ts` | Design feedback regression |
| `CHANGE.md` | Short entry after implementation |

**Out of scope:** semantic material library, new op types, planner prompt overhaul beyond existing JSON examples, infrastructure expansion.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| "extend the porch" misclassified as structural add | Literal porch-depth check runs before structural; explicit `extend the porch` pattern |
| LLM malformed ops | Keep `normalizePlannerOperation`; dev diagnostics |
| Literal misclassified as semantic | Unit tests for boundary prompts; default class is literal |
| Combined literal + semantic | Semantic wins → LLM handles full intent |
| Wider porch hits deterministic | Remove wider-porch hard-reject; classify as structural → LLM |

---

## Approval gate

**Do not implement until final approval.**

After approval:

1. Add `classifyRefinementPrompt` + boundary tests  
2. Trim deterministic mapper (remove semantic band-aids)  
3. Rewire `auto` routing + activity labels  
4. Run `pnpm test:generator` + `pnpm run build`  
5. Manual retest with matrix above  
