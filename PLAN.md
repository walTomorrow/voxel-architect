# Plan: Generator Reliability Testing — Issue 5 (document reliability rules)

## 1. Current understanding

### Milestone

**Generator Reliability Testing** adds **developer-facing automation** around the deterministic medieval tower pipeline: blueprint validation, voxel generation, and **pure structural analysis** of outputs (`analyzeVoxelStructure`). Issues **1–4** delivered Vitest, analysis helpers, preset invariant tests, edge-case fixtures, and shared assertion helpers (**no user-visible product feature**).

### Meaning of “reliability” today

**Reliability** means **geometric / structural sanity** for **deterministic, single-building** tower generation:

- Output exists and respects lattice bookkeeping (unique coordinates, registry-backed block IDs).
- Output forms **one** 26-connected, ground-reachable mass under the current analysis rules.
- Output stays within **`resolved.constraints.maxBlockCount`**.

This **does not** mean beauty, architectural correctness in an aesthetic sense, or parity with screenshots.

### Audience / infra stance

Documentation targets **future contributors and maintainers**. Tests guard regressions in core geometry—not marketing claims about quality.

---

## 2. Proposed documentation location

### Primary doc

**Path:** **`docs/generation/GENERATOR_RELIABILITY.md`**

**Actions:**

- Create directory **`docs/generation/`** (currently only **`docs/blueprints/`** exists — inspected).
- Add **`GENERATOR_RELIABILITY.md`** as the canonical reliability overview.

### Optional cross-links (minimal edits elsewhere)

| Location | Change |
|----------|--------|
| **`README.md`** | Add **one short subsection or bullet** (e.g. under Getting Started): generator reliability tests → link to **`docs/generation/GENERATOR_RELIABILITY.md`**, **`pnpm test:generator`**. **Do not** expand README into a full rewrite. |
| **`GENERATION_DESIGN_PRINCIPLES.md`** | After the opening **Purpose** block (~lines 3–11), add **one sentence + markdown link** to **`GENERATOR_RELIABILITY.md`** clarifying that **automated structural checks** are documented there separately from readability philosophy. |

**Do not** heavily edit **`BLUEPRINT_JSON_FORMAT.md`** or **`BLUEPRINT_FEATURE_CATALOG.md`** unless adding a single “See also” line fits naturally—prefer keeping blueprint docs scoped to exchange/feature catalogs.

---

## 3. Documentation contents (`GENERATOR_RELIABILITY.md`)

Suggested outline (concise, accurate to repo):

1. **Purpose** — Why these tests exist: catch structural regressions early; document what “good geometry” means **mechanically** for current towers.

2. **Pipeline** (verbatim-ish):

   ```text
   MedievalTowerBlueprint
     → validateBlueprint()
     → generateStructureFromResolved()   // ResolvedMedievalTower in practice
     → VoxelBlock[]
     → analyzeVoxelStructure(blocks)
   ```

3. **What tests currently cover** (point to files):

   | Suite | File(s) |
   |-------|---------|
   | Smoke | `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts` |
   | Structure helpers | `src/lib/voxel/structureAnalysis.ts`, `src/lib/voxel/__tests__/structureAnalysis.test.ts` |
   | Curated presets | `generatorPresetInvariants.test.ts`, fixtures from **`MEDIEVAL_TOWER_PRESETS`** (`sampleBlueprints.ts`) |
   | Edge cases | `generatorEdgeCaseInvariants.test.ts`, `fixtures/edgeCaseBlueprints.ts` |
   | Shared assertions | `src/lib/generation/__tests__/testUtils.ts` (`assertGeneratedStructureHardInvariants`) |

   Mention **`vitest.config.ts`** **`include`**: `src/lib/generation/__tests__/**/*.test.ts`, `src/lib/voxel/__tests__/**/*.test.ts`; **`pnpm test:generator`** runs **`vitest run`** (**inspected `package.json`**).

4. **Hard invariants** (mirror **`assertGeneratedStructureHardInvariants`**):

   - `blocks.length > 0`
   - `analysis.blockCount === blocks.length`
   - `analysis.uniqueBlockCount > 0`
   - `analysis.invalidBlockTypeIds.length === 0`
   - `analysis.duplicateCoordinateCount === 0`
   - `analysis.connectedComponentCount26 === 1` — **scoped** to current single-building tower presets/fixtures; **not** a universal rule for future towns / multi-mass outputs.
   - `analysis.ungroundedBlockCount26 === 0`
   - `analysis.allBlocksGroundedConnected26 === true`
   - `blocks.length <= resolved.constraints.maxBlockCount`

5. **Connectivity (26-neighbor)** — Offsets `(dx, dy, dz) ∈ {-1,0,1}³ \ {(0,0,0)}`; adjacency if neighbor cell occupied (analysis operates on **unique** lattice positions).

6. **Grounding** — Seeds: **`y === minY`** over **unique** occupied coordinates (structure-relative “floor”). Good fit for current towers (**foundation typically at bottom layer**). Note caveat: **world-space or vertically stacked structures** may need different policies later.

7. **Fixture coverage**

   - **Curated:** all presets in **`MEDIEVAL_TOWER_PRESETS`**.
   - **Edge-case IDs** (from **`EDGE_CASE_BLUEPRINT_FIXTURES`**): `height_budget_body_clamp`, `wide_entrance_max`, `authoring_overhang_clamp`, `thick_shell_narrow_void`, `window_density_wide`, `tight_max_block_count_roof_trim`.

8. **Out of scope / not tested** — Bullet list matching milestone intent: aesthetics; golden counts/bounds/material mixes; snapshots/visual/AI quality; strict semantic “must have roof/door/windows”; towns, compounds; **`allowFloatingBlocks`** / intentional floaters.

9. **How to run** — **`pnpm test:generator`**, **`pnpm exec tsc --noEmit`**, **`pnpm run build`** (common local sanity).

10. **Future directions** — CI wiring for **`pnpm test:generator`** (separate issue unless trivial); invalid blueprint tests; regression corpus from bugs; optional **`/visualizer`** diagnostics; blueprint-aware invariant policies for multi-component or floating designs.

---

## 4. Tone and audience

- **Maintainers / contributors**: practical, scannable, no aesthetic overclaims.
- **Explicit disclaimer**: passing tests ≠ proof of visual quality (aligns with **`GENERATION_DESIGN_PRINCIPLES.md`** §2.2 “valid geometry necessary but not sufficient” — may reference that phrase briefly).

---

## 5. Scope boundaries (this issue)

**Do not:**

- Add or change tests, fixtures, generator, validator, UI, CI workflows, screenshots.
- Rewrite **`README.md`** beyond a **small** reliability pointer.
- Expand unrelated docs.

---

## 6. Verification (after implementation)

Even though changes are documentation-only, run:

| Command | Purpose |
|---------|--------|
| **`pnpm test:generator`** | Confirm suite still green |
| **`pnpm exec tsc --noEmit`** | Types unchanged |
| **`pnpm run build`** | Ensure no accidental breakage |

---

## 7. CHANGE.md (after implementation)

Overwrite **`CHANGE.md`** with Issue 5 summary:

- Title: document generator reliability rules
- Branch: `milestone/generator-reliability-testing`
- Files: **`docs/generation/GENERATOR_RELIABILITY.md`** (+ optional **`README.md`**, **`GENERATION_DESIGN_PRINCIPLES.md`** touch)
- What the doc explains + cross-links added
- Deferred: CI, new tests, UI diagnostics
- Results table: test / tsc / build
- Follow-ups: keep doc in sync when invariants or suites change

---

## 8. Approval checkpoint

**Waiting for approval before implementation.**
