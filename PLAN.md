# Plan: Generator Reliability Testing — Issue 4 (edge-case blueprint fixtures)

## 1. Current understanding

### Milestone

**Generator Reliability Testing** hardens the path:

**`MedievalTowerBlueprint` → `validateBlueprint()` → `generateStructureFromResolved()` → `VoxelBlock[]`**

with **Vitest**, **`analyzeVoxelStructure()`**, and **structural** checks (IDs, duplicates, single 26-connected grounded mass, `maxBlockCount`). Aesthetic quality, snapshots, and visuals are **out of scope**.

### Prior issues

| Issue | Deliverable |
|-------|-------------|
| 1 | Smoke pipeline test |
| 2 | `structureAnalysis.ts` + unit tests |
| 3 | `MEDIEVAL_TOWER_PRESETS` invariant suite |

### This issue

Add a **small set of hand-authored, valid edge-case blueprints** that stress **validator normalization** and **generator boundary behavior** (clamps, limits, dense parameters), then run the **same geometric invariants** as the preset tests. No new invalid-blueprint tests—fixtures must **`validateBlueprint().ok === true`**. Not aesthetic tests or visual snapshots.

---

## 2. Fixture location

**Preferred:** **`src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts`**

- Co-locates with generation tests; **`vitest.config.ts`** already includes `src/lib/generation/__tests__/**/*.test.ts` (fixtures folder does not need its own glob).
- Export **`readonly EdgeCaseBlueprintFixture[]`** (or similar), each item **`{ id, label, blueprint }`** mirroring **`MedievalTowerPreset`** shape so tests and optional helpers stay uniform.
- **TypeScript objects** typed **`as const satisfies MedievalTowerBlueprint`** (same pattern as internal preset literals in `sampleBlueprints.ts`). **No** blueprint JSON import/envelope files unless we later need huge data—unnecessary here.

---

## 3. Fixture design principles

- **`validateBlueprint()`** must return **`ok: true`** with **`resolved`** (implementer runs locally; adjust numbers if estimate or `entranceHeight` rules fail).
- **Unusual but allowed** under inspected rules—favor **validator notes** (clamp / parity hints) and **parameter extremes** that presets do not cover.
- **Minimal / readable:** short metadata `description`/`notes` per fixture explaining the edge.
- **Materials:** only keys present in **`CLASSIC_BLOCK_PACK`** (reuse palette from presets, e.g. `cobblestone`, `oak_planks`, `glass`, …).
- **Deterministic** authoring fields only—no randomness.
- **Do not duplicate** curated **`MEDIEVAL_TOWER_PRESETS`** (e.g. avoid copy-paste of `northwatch` / `compact_guard`); combinations can differ by footprint, T, roof, clamps, or window counts.
- **Not golden “beautiful” towers**—purpose is boundary coverage.

---

## 4. Proposed edge-case fixtures (5–6)

Grounded in **`validateBlueprint.ts`** (inspected):

| Rule | Implication for fixtures |
|------|---------------------------|
| `width`/`length` integers **≥ 5** | Smallest square footprint is **5×5** (already used by `compact_guard` preset—edge suite uses **other** minima or different stresses). |
| `height` integer **≥ 8** | Tight vertical budget stresses **body-layer clamp** when `foundation + body + roofLayers` would exceed `height`. |
| `hollowInterior` | Requires **`width` and `length` ≥ `2·wallThickness + 2`**. |
| `openings.entranceWidth` | **≤ `max(1, W - 2·T - 2)`**; **≥ 1**. |
| `openings.entranceHeight` | **≥ 2** and **≤ resolved `bodyLayers`** (after height clamp). |
| `roof.overhang` | Clamped to **`[0, 2]`**; authoring **> 2** yields a note. |
| `maxBlockCount` | **`estimateTowerBlocks` ≤ max**; validator may **reduce `roofLayers`** in a loop while estimate too high. |
| Symmetry / windows | **`front_only` + `enforceSymmetry`** yields an informational note only. |

**Planned fixtures (ids are suggestive—implementer may rename):**

1. **`height_budget_body_clamp`**  
   - **Goal:** Force **body layer reduction** so `foundation + body + roof` fits **`dimensions.height`** (validator `notes` about clamped body).  
   - **Sketch:** `height: 8`, relatively large **`levels.floorCount`**, **`roof.style: "stepped_pyramid"`** with **`roof.height`** multi-layer, **`verticalEmphasis: "tall"`** so nominal body wants more layers than fit.  
   - **Care:** After clamp, **`entranceHeight` ≤ final `bodyLayers`** and **≤ `height` budget**—pick modest door height or high enough body remainder.

2. **`wide_entrance_footprint`**  
   - **Goal:** **`entranceWidth === max(1, W - 2·T - 2)`** (widest legal door for shell).  
   - **Sketch:** e.g. **`width/length: 11`**, **`wallThickness: 2`**, **`entranceWidth: 5`**, valid door height.  
   - **Distinction:** Curated **`gothic_stone`** is 11×11 but **does not** use max-width door.

3. **`authoring_overhang_clamp`**  
   - **Goal:** **`roof.overhang > 2`** in authoring → validator **clamps to 2** + note (generator must accept resolved overhang).  
   - **Sketch:** modest **7×7** or **9×9** tower, **`overhang: 5`**, otherwise vanilla.

4. **`thick_shell_medium_footprint`**  
   - **Goal:** High **`wallThickness`** with narrow interior void (still hollow-compliant).  
   - **Sketch:** **`width: 9`**, **`wallThickness: 3`** (inner 3×3 air). **Preset `northwatch`** uses **T=2**; **`fortified_gate`** is **13×13**—this is a **different** (9×9, T=3) corner.

5. **`window_density_wide`**  
   - **Goal:** High **`windowsCountPerSide`** with **`windowsFloors: "all"`** on a wider footprint—stress façade placement without matching **`dark_wizard`** (9×9, 4/side).  
   - **Sketch:** **`width: 11` or `13`**, **`windowsCountPerSide: 5` or `6`**, **`windowsPlacement: "symmetric"`**.

6. **`tight_max_block_count`** *(optional if numbers calibrate easily)*  
   - **Goal:** **`constraints.maxBlockCount`** low enough that validator **`Reduced roof layers`** note fires **once or more**, but **`ok: true`** after reduction.  
   - **Implementer:** tune **`maxBlockCount`** against **`estimateTowerBlocks`** for the chosen authoring blueprint (or skip if flaky—prefer 5 fixtures without this).

**Defer / avoid for this issue:** invalid blueprints, **`allowFloatingBlocks: true`**, multi-building towns, presets duplicated as “fixtures.”

---

## 5. Test strategy

new file **`src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts`**

For **each** exported edge fixture:

1. **`structuredClone(fixture.blueprint)`**
2. **`validateBlueprint(blueprint)`** → assert **`ok`** + **`resolved`**
3. **`generateStructureFromResolved(resolved)`**
4. **`analyzeVoxelStructure(blocks)`**
5. Assert **same hard invariants** as **`generatorPresetInvariants.test.ts`:**

   - `blocks.length > 0`
   - `analysis.blockCount === blocks.length`
   - `analysis.uniqueBlockCount > 0`
   - `analysis.invalidBlockTypeIds.length === 0`
   - `analysis.duplicateCoordinateCount === 0`
   - `analysis.connectedComponentCount26 === 1`
   - `analysis.ungroundedBlockCount26 === 0`
   - `analysis.allBlocksGroundedConnected26 === true`
   - `blocks.length <= resolved.constraints.maxBlockCount`

**Scope guard:** If a candidate fixture **cannot** satisfy **single 26-component grounded mass** (or any invariant above), **do not** add it in this issue—adjust authoring or drop the fixture.

**Curated presets:** **Do not remove** Issue 3 tests or fixtures; edge suite is **additive**.

---

## 6. Shared test helper consideration

**Current duplication:** **`generatorPresetInvariants.test.ts`** embeds ~15 lines of assertions + **`invariantContext`** keyed to **`MedievalTowerPreset`**.

**Recommendation:** add **`src/lib/generation/__tests__/testUtils.ts`** (or `generatorInvariantAssertions.ts`) with:

- **`assertGeneratedStructureHardInvariants(args)`** where `args` includes **`fixtureId`**, **`fixtureLabel`**, **`blocks`**, **`analysis`**, **`maxBlockCount`** (and optionally **`validationErrors`** string for early failure).
- **`formatGeneratorInvariantDiagnostics(...)`** — same pipe-separated fields as today (id, label, counts, bounds, invalid IDs, duplicate keys, component counts, maxBlockCount).

**Refactor** **`generatorPresetInvariants.test.ts`** to call the shared helper **only if** the diff stays small (preset test passes **`preset.id` / `preset.label`**). Avoid layers of abstraction beyond one function.

**Alternative:** copy-paste assertions once into edge test if helper churn is undesirable—acceptable only if we accept drift; **prefer one helper** after Issue 3 duplication.

---

## 7. Diagnostics / failure messages

Match Issue 3 style:

- **Fixture `id`** and **`label`** (or metadata name) in every failure string.
- On validation failure, include **`validation.errors`** / **`notes`** when useful.
- Include **block count**, **unique count**, **`bounds`**, **`invalidBlockTypeIds`**, **`duplicateCoordinates`**, **`connectedComponentCount26`**, **`ungroundedBlockCount26`**, **`maxBlockCount`**.

No custom Vitest reporters.

---

## 8. What not to add

- **`validateBlueprint` failure** tests (invalid blueprints) — separate issue.
- Import/export JSON envelope tests, regression dumps from old bugs (unless they fit edge-case goal—prefer fresh minimal TS fixtures).
- Snapshots, screenshots, Playwright, RTL, UI diagnostics.
- Generator / **`filterGrounded`** / blueprint schema **changes**.
- Aesthetic scoring; strict roof/door/window semantics.
- Multi-building / **town** fixtures; intentionally **floating** structures (`allowFloatingBlocks: true` or ungrounded designs).

---

## 9. Verification (after implementation)

| Command | Purpose |
|---------|--------|
| **`pnpm test:generator`** | Smoke + analysis units + presets + edge cases |
| **`pnpm exec tsc --noEmit`** | Types |
| **`pnpm run build`** | Next build |

Expect **no** `vitest.config` / **`package.json`** changes unless file layout moves outside current glob.

---

## 10. CHANGE.md (after implementation)

Overwrite **`CHANGE.md`** with Issue 4:

- Title, branch **`milestone/generator-reliability-testing`**
- Files: `fixtures/edgeCaseBlueprints.ts`, `generatorEdgeCaseInvariants.test.ts`, optional **`testUtils.ts`**, and touched **`generatorPresetInvariants.test.ts`** if refactored
- Table: **fixture id → short description**
- **Invariants** (bullet list same as presets)
- **Diagnostics** approach
- **Deferred** items (invalid blueprints, visual tests, multi-mass generators, etc.)
- **Results:** test / tsc / build
- **Follow-ups:** more fixtures; per–structure-type invariant flags when multi-component generators exist

---

## 11. Approval checkpoint

**Waiting for approval before implementation.**
