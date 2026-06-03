# AI Builder Agent Activity Notes

## Purpose

This document records the intended direction for the AI Builder experience in Voxel Architect.

The builder UI should eventually feel like a conversational AI workspace where the user describes a building, the system creates or edits a structured blueprint, validates it, generates a voxel preview, and reports progress back to the user.

The key idea is to show a **transparent agent activity panel** rather than exposing a model's hidden chain of thought.

**Related docs:**

- [`../../PLAN.md`](../../PLAN.md) — static `/builder` UI shell (layout, mock chat, preview)
- [`GENERIC_BUILDING_V2.md`](GENERIC_BUILDING_V2.md) — component authoring model and planned v2 operations
- [`../../CLOUDFLARE.md`](../../CLOUDFLARE.md) — future Cloudflare Pages / Workers / Agents infrastructure

---

## Important Distinction

Do **not** build the product around showing the model's private chain of thought.

Instead, show user-facing activity events that explain what the system is doing.

Good (pipeline-owned activity):

```text
✓ Parsed building request
✓ Drafted component blueprint
✓ Validated blueprint
✓ Generated 306 blocks
✓ Updated preview
```

Avoid:

```text
Here is the model's private reasoning chain...
```

The product should feel transparent and Cursor-like, but transparency comes from **explicit system events**, tool steps, validation results, and generation milestones — not from hidden model reasoning.

---

## Activity vs Assistant Messages

Make this distinction explicit in the UI and in event design:

| Layer | Role | Source |
|-------|------|--------|
| **Activity log** | Factual system/pipeline steps | Product code, validators, generator, future agent tools |
| **Assistant message** | Natural-language response or summary for the user | Model or templated summary after work completes |
| **Hidden model reasoning** | Not shown | Never surfaced as “thinking” |

**Example — activity (checklist under assistant turn):**

```text
Build activity
✓ Parsed building request
✓ Drafted component blueprint
✓ Validated blueprint
✓ Generated voxel preview
```

**Example — assistant (separate bubble):**

```text
Here’s a starting cottage preview. I created a compact room, gable roof, front door, window group, chimney, and step.
```

The activity log must **never** pretend to be the model’s private reasoning. It is generated only from known product/pipeline events.

---

## Builder UI Placement (`/builder`)

The `/builder` route uses a **3-column product layout**:

| Column | Role |
|--------|------|
| **Left** | Build chats / sidebar |
| **Center** | Hero voxel preview (layers, block breakdown drawer) |
| **Right** | Conversation panel |

**Decision:** The activity log lives in the **right conversation panel**, not in the center preview area.

**Preferred display:**

- Inline **under the assistant message** that triggered or summarizes the work
- Rendered as a compact, **collapsible** card
- Suggested titles: **“Build activity”**, **“Generation steps”**, or **“Builder activity”**

The center column stays focused on the voxel preview only.

---

## Default Activity Style

**First implementation:** use a **checklist-style timeline** (✓ / spinner / error per step). This is the default UI — not a numbered “thought process” or plan list.

```text
Build activity
✓ Parsed request
✓ Drafted component blueprint
✓ Validated blueprint
✓ Generated 306 blocks
✓ Updated preview
```

A numbered **“Plan”** (1. Create room, 2. Add roof, …) may be explored later as a separate UX pattern. It is **out of scope** for the first activity implementation. If the doc or mocks show both styles, treat checklist activity as canonical for Phase 1.

---

## Internal Compiler IR (Do Not Expose)

The activity log must **never** expose raw **ComponentPlan**, **ComponentPlan v2**, or **VoxelBlock[]** dumps as user-facing explanation.

Allowed summaries:

- pipeline milestones (parsed, drafted, validated, generated)
- validation results (success, warnings, errors)
- block counts
- high-level component-level changes (“Added front window group”)

Compiler IR and block arrays remain internal.

---

## Blueprint Target (AI Path)

**Long-term AI target:** **GenericBuildingBlueprint v2** — not v1. V2 is more versatile and aligned with component-level create/refine and semantic operations.

**Staged implementation:**

1. **Now / Phase 1:** Mock activity in `/builder`; preview may still use **v1 presets** temporarily (UI shell only).
2. **Next:** Bare-minimum v2 path needed for meaningful AI create/refine (validation, generation, presets).
3. **Then:** AI **create** produces or selects **GenericBuildingBlueprint v2**.
4. **Then:** AI **refinement** uses semantic **v2 operations** (`BlueprintOperationV2[]` → apply → validate → generate).

V1 may remain as a **temporary static preview or fallback** during the shell phase only. Real AI generation and refinement should not be designed around v1 as the end state.

See [`GENERIC_BUILDING_V2.md`](GENERIC_BUILDING_V2.md) for operations and constraints.

---

## Event-Based Architecture

The builder should eventually stream structured events from the backend or agent layer to the frontend. Events drive the checklist UI (status per step).

### Activity status and kind (conceptual)

Not final TypeScript — intent for UI and future emitters:

```ts
type BuilderActivityStatus =
  | "pending"
  | "running"
  | "success"
  | "warning"
  | "error";

type BuilderActivityKind =
  | "request_parsed"
  | "blueprint_drafted"
  | "blueprint_validated"
  | "validation_failed"
  | "repair_attempted"
  | "repair_succeeded"
  | "repair_failed"
  | "generation_started"
  | "generation_completed"
  | "preview_updated";
```

Each checklist row combines **kind**, **status**, and a **label** (and optional **detail**). Examples:

- Normal progress: `request_parsed` → `running` → `success`
- Warning: `blueprint_validated` → `warning` (“2 placement notes”)
- Failure + repair: `validation_failed` → `error`; then `repair_attempted` → `running`; then `repair_succeeded` or `repair_failed`

### Example event record (conceptual)

```ts
type BuilderActivityEvent = {
  id: string;
  kind: BuilderActivityKind;
  status: BuilderActivityStatus;
  label: string;
  detail?: string;
  blockCount?: number;
  blueprintId?: string;
};
```

Render as a checklist timeline in the conversation panel (collapsible card under the relevant assistant turn).

---

## Future Streaming Envelope (Design Only)

When Cloudflare Agent / Worker streaming is added, prefer **one structured envelope** rather than unrelated channels (separate sockets for chat vs activity vs blueprint).

Conceptual shape:

```ts
type BuilderStreamEvent =
  | { kind: "assistant_delta"; text: string }
  | { kind: "activity"; event: BuilderActivityEvent }
  | { kind: "blueprint_updated"; blueprintId: string; version: number }
  | { kind: "preview_updated"; blockCount: number };
```

**Do not implement** streaming infrastructure in the first activity pass. This is for later alignment with [`CLOUDFLARE.md`](../../CLOUDFLARE.md).

---

## Future Cloudflare Role

Cloudflare remains the primary product/backend path for the near future:

- Pages (frontend)
- Workers / Workers AI (APIs, model calls)
- Agents + Durable Objects (sessions)
- D1 (chat/build metadata), R2 (images), KV (cache)
- Stream **`BuilderStreamEvent`** (or equivalent) to `/builder`

```text
/builder frontend
  → Cloudflare Worker or Agent
  → model call
  → tool steps:
      - draft blueprint (v2)
      - validate blueprint
      - repair if needed (emit repair_* activity kinds)
      - generate voxel preview
      - persist chat/build state
  → stream assistant_delta + activity + blueprint_updated to UI
```

Cloudflare does not provide a Cursor-style thought UI. We design the activity checklist and emit explicit events ourselves.

---

## Modal Role

Modal = optional heavy compute later (custom hosting, GPU, batch jobs). Not first-choice product backend.

```text
Cloudflare = product/backend/agent infrastructure
Modal = optional heavy compute backend later
```

---

## Recommended Implementation Sequence

### Phase 1 — Mock activity timeline (immediate next step)

**This is the follow-up to the static `/builder` shell** — not a rewrite of the builder.

**Task:** Add a mock activity timeline to the existing `/builder` UI.

Phase 1 should:

- Use **mock** `BuilderActivityEvent` rows (checklist style)
- Render them in the **right conversation panel**, under the assistant message for that turn
- Use a collapsible card (“Build activity” / “Generation steps”)
- Optionally **animate or reveal** steps after the user sends a message
- Keep the **preview static** (no blueprint change on send)
- **Not** call any backend, AI, or Cloudflare

Canned step examples:

```text
✓ Parsed request
✓ Drafted component blueprint
✓ Validated blueprint
✓ Generated preview (demo — static preset)
```

See [`../../PLAN.md`](../../PLAN.md) for what the shell already provides (mock chat, v1 preview, layers, breakdown).

### Phase 2 — Real local pipeline activity

Connect activity events to **real** in-app behavior (still no AI):

- validation started / succeeded / warnings / failed
- repair attempted / succeeded / failed (when repair loop exists)
- generation started / completed
- block count available
- preview updated

Emit the same checklist UI from actual pipeline hooks.

### Phase 3 — Cloudflare Agent integration

Backend session, model calls, `BuilderStreamEvent` envelope, persistence — per [`CLOUDFLARE.md`](../../CLOUDFLARE.md). Out of scope until explicitly planned.

### Phase 4 — Tool-based v2 refinement

```text
User: Make the porch wider.
→ identify component
→ BlueprintOperationV2[]
→ applyOperations()
→ validateBlueprint()
→ generateStructure()
→ preview_updated + activity rows
```

---

## Out of Scope (First Activity Implementation)

Do **not** add as part of Phase 1 (or unless a separate plan explicitly requests it):

- Real AI / LLM calls
- Cloudflare Agents or Workers endpoints
- Database persistence (D1, etc.)
- Authentication
- Real image upload or image understanding
- Schema, validator, compiler, or generator changes
- Operation application (`BlueprintOperationV2` execution)
- Real streaming infrastructure
- Exposing ComponentPlan / block dumps in the activity UI

---

## Cursor Guidance

When implementing builder activity:

```text
Add a mock checklist-style “Build activity” card in the /builder conversation panel,
under assistant messages. Show pipeline-style steps, not model chain-of-thought.
Phase 1 only — no backend, no AI, static preview unchanged.
```

Do not implement Cloudflare, Modal, persistence, auth, or real image upload unless requested in a separate plan.

---

## Product Principle

The user should feel a clear building process:

```text
understand request
→ propose structured intent (v2 blueprint)
→ validate
→ generate
→ preview
→ refine (v2 operations)
```

Source of truth: **structured blueprint + deterministic generator** — not raw model reasoning or raw voxel placement.
