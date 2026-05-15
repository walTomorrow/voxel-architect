# Change log — document generator reliability rules

## Title of this issue

**Document generator reliability rules** (Generator Reliability Testing — Issue 5)

## Branch name

`milestone/generator-reliability-testing`

**Docs layout:** `GENERATION_DESIGN_PRINCIPLES.md` and `VISION.md` moved from repo root to **`docs/`** (`docs/GENERATION_DESIGN_PRINCIPLES.md`, `docs/VISION.md`). Updated relative links in `docs/generation/GENERATOR_RELIABILITY.md`, `docs/blueprints/BLUEPRINT_JSON_FORMAT.md`, `docs/GENERATION_DESIGN_PRINCIPLES.md`, and the parity hint in `src/lib/blueprints/validateBlueprint.ts`.

## Files changed

| File | Change |
|------|--------|
| `docs/generation/GENERATOR_RELIABILITY.md` | **New:** Reliability overview for maintainers (pipeline, suites, invariants, grounding/connectivity, out-of-scope, commands, future work). |
| `README.md` | **Small:** “Generator reliability tests” subsection with link to the doc + `pnpm test:generator`. |
| `docs/GENERATION_DESIGN_PRINCIPLES.md` | **Small:** Purpose cross-link to `GENERATOR_RELIABILITY.md` vs readability principles (lives under `docs/`). |
| `docs/VISION.md` | Moved from repo root into `docs/`. |
| `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` | Link target updated for design-principles path. |

## Documentation added

**[`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md)** explains:

- Why structural reliability tests exist (developer infra, not user feature).
- Pipeline: `MedievalTowerBlueprint` → `validateBlueprint()` → `generateStructureFromResolved()` → `VoxelBlock[]` → `analyzeVoxelStructure(blocks)`.
- Covered suites: smoke, structure-analysis unit tests, curated preset invariants, edge-case invariants, shared `testUtils` assertions.
- Hard geometric invariants (including **`connectedComponentCount26 === 1`** scoped to current single-building presets/fixtures).
- **26-neighbor** connectivity (face / edge / corner).
- **Structure-relative grounding** (`y === minY` on unique cells) and caveats for future world-space / towns / floating designs.
- Fixture coverage: `MEDIEVAL_TOWER_PRESETS` + edge-case fixture IDs.
- Explicit **non-goals** (aesthetics, golden counts, screenshots, AI, strict semantics, multi-building/floating unless separately tested).
- Commands: `pnpm test:generator`, `pnpm exec tsc --noEmit`, `pnpm run build`.
- Future directions (CI, invalid blueprint tests, regressions, optional `/visualizer` diagnostics, blueprint-aware policies).

Tone: concise; **passing ≠ beautiful**.

## README / design-principles links

- **README:** [`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) + `pnpm test:generator`.
- **`docs/GENERATION_DESIGN_PRINCIPLES.md`:** Link after Purpose clarifies Vitest structural checks vs composition/readability guidelines.

`BLUEPRINT_JSON_FORMAT.md` was updated only for the cross-link path to design principles.

## Intentionally deferred

- New tests, fixtures, generator/validator/UI changes.
- CI workflow, screenshots, visual diagnostics panel.
- Large README rewrite.

## Test / build / typecheck results

| Check | Result |
|-------|--------|
| `pnpm test:generator` | **Passed** (20 tests) |
| `pnpm exec tsc --noEmit` | **Passed** (exit 0) |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## Remaining follow-up ideas

- Wire **`pnpm test:generator`** into CI when ready.
- Keep **`GENERATOR_RELIABILITY.md`** in sync when invariant lists or generator scope changes.
