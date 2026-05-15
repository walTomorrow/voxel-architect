# Plan: Generator Reliability Testing — Issue 3 (preset invariant tests)

## 1. Current understanding

### Milestone

**Generator Reliability Testing** automates checks on the deterministic path:

**authoring blueprint → `validateBlueprint()` → `generateStructureFromResolved()` → `VoxelBlock[]`**

It targets **geometric / structural reliability** (non-empty output, valid IDs, no duplicate lattice cells, respect for `maxBlockCount`, single grounded 26-connected mass), not aesthetics, screenshots, or semantic rules like “must have a roof.”

### Prior issues

| Issue | Deliverable |
|-------|--------------|
| **1** | Vitest, `pnpm test:generator`, smoke test on default blueprint → validate → generate → `blocks.length > 0`. |
| **2** | `analyzeVoxelStructure()` and helper unit tests (`structureAnalysis.ts`). |

### This issue

Add **preset-level invariant tests** that run the **real** pipeline against **every curated medieval tower preset** from the existing registry, then assert **hard geometric invariants** via `analyzeVoxelStructure()` on the generated blocks.

Tests are **structural only** — no golden counts/bounds/material ratios, no visual or AI assertions.

---

## 2. Proposed test location

**File:** **`src/lib/generation/__tests__/generatorPresetInvariants.test.ts`**

**Rationale:** Lives with the smoke test under `generation/__tests__/`, already picked up by `vitest.config.ts` (`src/lib/generation/__tests__/**/*.test.ts`). Imports blueprints from `sampleBlueprints`, generation from `generateStructure`, analysis from `structureAnalysis` — no new Vitest include changes required unless file placement changes.

---

## 3. Presets to test

**Source of truth:** **`MEDIEVAL_TOWER_PRESETS`** in **`src/lib/blueprints/sampleBlueprints.ts`** — `readonly MedievalTowerPreset[]` with `id`, `label`, `blueprint`.

**Inspected list (6 presets, order = registry order):**

| `id` | `label` (for messages) |
|------|-------------------------|
| `northwatch` | Northwatch Spire (default) |
| `tall_watchtower` | Tall Watchtower |
| `fortified_gate` | Fortified Gate Tower |
| `gothic_stone` | Gothic Stone Tower |
| `compact_guard` | Compact Guard Tower |
| `dark_wizard` | Dark Wizard Tower |

**Mechanics:**

- **`for (const preset of MEDIEVAL_TOWER_PRESETS)`** — no inlined duplicate JSON.
- **`structuredClone(preset.blueprint)`** before `validateBlueprint` (same pattern as smoke test; avoids accidental mutation).

**Out of scope for this issue:** custom edge-case blueprints, malformed imports, presets not in `MEDIEVAL_TOWER_PRESETS`.

---

## 4. Real pipeline (no mocks)

For **each** preset:

1. `const blueprint = structuredClone(preset.blueprint)`
2. `const validation = validateBlueprint(blueprint)`
3. Assert **`validation.ok === true`** and **`validation.resolved`** is defined (fail with preset **`id`** / **`label`** if not).
4. `const blocks = generateStructureFromResolved(validation.resolved)` — real **`generateMedievalTower`** dispatch.
5. `const analysis = analyzeVoxelStructure(blocks)` — real registry lookups via **`getBlockDefinition`** inside analysis.

Do **not** mock validation, generators, registry, or `analyzeVoxelStructure`.

---

## 5. Hard invariants to enforce

After generation, assert for **each** preset:

| Assertion | Notes |
|-----------|--------|
| `blocks.length > 0` | Non-empty structure. |
| `analysis.blockCount === blocks.length` | Consistency of analysis vs input length. |
| `analysis.uniqueBlockCount > 0` | Occupied lattice (implies `bounds !== null` in practice). |
| `analysis.invalidBlockTypeIds.length === 0` | All emitted `blockTypeId` values resolve in the registry. |
| `analysis.duplicateCoordinateCount === 0` | No duplicate `(x,y,z)` in output. |
| `analysis.connectedComponentCount26 === 1` | Single 26-neighbor component on unique cells. |
| `analysis.ungroundedBlockCount26 === 0` | Every unique cell 26-reachable from `y === minY` seeds. |
| `analysis.allBlocksGroundedConnected26 === true` | Redundant with above + single component + non-empty; cheap sanity check matching Issue 2 semantics. |

**Budget (inspected resolved shape):**

- **`ResolvedMedievalTower`** includes **`constraints: BlueprintConstraints`** with **`maxBlockCount`** (same shape as authoring blueprint; see **`src/lib/blueprints/types.ts`**).
- Assert: **`blocks.length <= validation.resolved.constraints.maxBlockCount`** (and/or `analysis.blockCount <= …` — equal when no duplicates).

If validation ever normalizes `maxBlockCount`, the **resolved** value is authoritative for generation.

---

## 6. Failure messages / debugging

Keep reporting **lightweight** — no custom Vitest reporters.

**Recommended patterns:**

- **`test(\`preset ${preset.id} …\`, …)`** or **`it.each(MEDIEVAL_TOWER_PRESETS)(…)`** with title including **`preset.id`**.
- On failure, a **small local helper** (e.g. `formatPresetInvariantContext({ preset, blocks, analysis })`) returning a string or object logged via **`expect`’s second message** or **`console.log` before expect** is optional; prefer **one string** appended to critical expects, e.g.  
  `expect(analysis.duplicateCoordinateCount, \`${preset.id}: …\`).toBe(0)`.

**Include when useful:**

- Preset **`id`** and **`label`**
- `blocks.length`, `analysis.uniqueBlockCount`
- `analysis.bounds`
- `analysis.invalidBlockTypeIds`, `analysis.duplicateCoordinates` (capped list from analyzer)
- `analysis.connectedComponentCount26`, `analysis.ungroundedBlockCount26`
- `resolved.constraints.maxBlockCount` if budget fails

---

## 7. What not to test yet

Do **not** assert:

- Exact `blocks.length` or material histograms
- Exact `bounds` or footprint numbers
- Roof / door / window presence or style
- Snapshot of `VoxelBlock[]`, screenshots, or pixel diffs
- Architectural beauty or readability
- AI quality (N/A for current deterministic generator)

---

## 8. Original smoke test: keep or remove?

**Recommendation: keep `generatorPipeline.smoke.test.ts`.**

| Reason | Detail |
|--------|--------|
| **Fast mental model** | Single file shows the minimal happy path without looping presets. |
| **Low cost** | One extra test; runtime dominated by full preset suite anyway. |
| **Overlap** | Smoke uses **`SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`**, which is the **same object** as the **`northwatch`** preset’s `blueprint` — **`northwatch` is tested twice**. That redundancy is acceptable unless we want to trim later; **do not delete smoke** unless we explicitly rename smoke to “documentation-only” and drop it — not justified here. |

Preset invariants **add** coverage for the other five presets and systematic checks the smoke test does not perform.

---

## 9. Scope boundaries (non-goals)

Do **not** add:

- Edge-case / regression blueprint fixtures beyond `MEDIEVAL_TOWER_PRESETS`
- Snapshot, visual, Playwright, or RTL tests
- UI diagnostics panel
- Changes to generator output, **`filterGrounded`**, or blueprint schema
- Aesthetic scoring or strict semantic requirements (roof/door/window)

---

## 10. Verification (after implementation)

| Command | Purpose |
|---------|--------|
| **`pnpm test:generator`** | Smoke + voxel helpers + new preset invariants |
| **`pnpm exec tsc --noEmit`** | Types |
| **`pnpm run build`** | Next.js build |

No **`vitest.config`** change expected unless tests move outside current `include` globs.

---

## 11. CHANGE.md (after implementation)

Overwrite **`CHANGE.md`** with Issue 3 notes:

- **Title:** e.g. “Add generator invariant tests for curated presets”
- **Branch:** `milestone/generator-reliability-testing`
- **Files changed:** e.g. `generatorPresetInvariants.test.ts` (+ smoke kept as-is)
- **Presets covered:** all entries in **`MEDIEVAL_TOWER_PRESETS`** (list ids)
- **Invariants enforced:** bullet list matching §5
- **Diagnostics:** how failure context is surfaced (preset id, key analysis fields)
- **Deferred:** exact counts, visuals, more blueprints, CI-only policies
- **Results:** `pnpm test:generator`, `tsc`, `build`
- **Follow-ups:** optional dedupe of smoke vs `northwatch`; future `allowFloatingBlocks: true` presets would need different invariants

---

## 12. Approval checkpoint

**Waiting for approval before implementation.**
