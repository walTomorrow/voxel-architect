# Plan: Generator Reliability Testing — Issue 1 (Vitest foundation + smoke test)

## 1. Current understanding

### Milestone

**Generator Reliability Testing** (`milestone/generator-reliability-testing`) builds a **small automated test foundation** for the deterministic pipeline:

**blueprint → `validateBlueprint()` → `ResolvedMedievalTower` → generator → `VoxelBlock[]`**

Future issues will assert invariants (non-empty structures, valid block IDs, no duplicate lattice coordinates, `maxBlockCount` respect, connectivity/grounding under a chosen adjacency rule). **This issue** only adds **Vitest**, **one smoke test**, and **documentation** — no invariant suite, no fixtures beyond what the smoke test needs.

### Focus

- **In scope:** Pure TypeScript tests in **Node** — no React, no browser, no Three.js canvas, no screenshots.
- **Out of scope for the milestone overall (and especially this issue):** aesthetics, architectural quality, snapshots, AI quality, strict semantic rules (“must have roof”), modular UI, tooltips.

### Current pipeline (reference)

- **Types:** `src/lib/blueprints/types.ts` (`MedievalTowerBlueprint`, `ResolvedMedievalTower`).
- **Validation:** `src/lib/blueprints/validateBlueprint.ts` → `BlueprintValidationResult` with `resolved` when `ok`.
- **Presets:** `src/lib/blueprints/sampleBlueprints.ts` — e.g. `SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`, `DEFAULT_MEDIEVAL_PRESET_ID`, `getMedievalTowerPreset`.
- **Generation entry:** `src/lib/generation/generateStructure.ts`:
  - `generateStructure(blueprint)` — validates then dispatches (throws if invalid).
  - `generateStructureFromResolved(resolved)` — **no re-validation**; used by UI after validation.

Smoking the **real** pipeline means calling **`validateBlueprint`** then **`generateStructureFromResolved`** with the resolved output (matches `/visualizer` flow without double validation). **Do not mock** `generateMedievalTower` or the registry.

### Repo state today

- **`package.json`:** No test runner; scripts: `dev`, `build`, `start`, `lint`.
- **`pnpm-lock.yaml`:** No Vitest/Jest.
- **`tsconfig.json`:** `"paths": { "@/*": ["./*"] }`, Next plugin; **`moduleResolution`: `"bundler"`** — Vitest’s resolver must honor `@/src/...` imports used across `src/lib`.
- **`next.config.ts`:** Minimal; no test-specific settings required for Vitest.
- **Existing tests:** None (`*.test.*`, Vitest config absent).

---

## 2. Proposed Vitest setup

### Dependencies

- Add **`vitest`** as a **devDependency** (pinned range consistent with repo, e.g. Vitest 3.x).

Optional later: `@vitest/coverage-v8` — **omit for Issue 1** to stay minimal.

### Config

- Add **`vitest.config.ts`** at repo root with:
  - **`test.environment: 'node'`** — no `happy-dom` / jsdom unless we later test DOM.
  - **`resolve.alias`** mirroring **`tsconfig`** `"@/*"` → project root (e.g. `@` → `path.resolve(__dirname, '.')`) so imports like `@/src/lib/...` resolve under Vitest’s bundler (`esbuild`/`vite`).
  - Optionally **`test.include`**/`exclude** — default `**/*.{test,spec}.?(c|m)[jt]s?(x)` is fine; can narrow with `pnpm test:generator` args if desired.

No separate `tsconfig.test.json` unless path resolution breaks — try root `tsconfig` + Vitest config first.

### Scripts

Add to **`package.json`**:

```json
"test:generator": "vitest run"
```

For Issue 1, either:

- Run **all** Vitest tests (only the smoke file exists), or  
- Scope the script: **`vitest run src/lib/generation/__tests__`** so future broader Vitest adoption does not accidentally run unrelated suites.

**Recommendation:** `vitest run src/lib/generation/__tests__` so **`pnpm test:generator`** stays generator-focused.

### Next.js interaction

Vitest runs **outside** `next build`; no change to **`next.config.ts`** required unless we discover conflicts (unlikely). Ensure test files live where ESLint can ignore them if needed (optional follow-up).

---

## 3. First smoke test

**Single file**, one **`describe`** / **`it`** (or equivalent):

1. **Blueprint:** `structuredClone(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT)` from `sampleBlueprints.ts` (or `getMedievalTowerPreset(DEFAULT_MEDIEVAL_PRESET_ID)` + clone — **Northwatch is enough**).
2. **`validateBlueprint(blueprint)`** → **`expect(result.ok).toBe(true)`**, **`expect(result.resolved).toBeDefined()`**.
3. **`generateStructureFromResolved(result.resolved!)`** → **`expect(blocks.length).toBeGreaterThan(0)`**.

**Do not mock** generator or validation. **Do not** assert connectivity, duplicates, or block IDs in Issue 1.

If **`structuredClone`** is undesirable in older Node CI, use a tiny clone helper — prefer **`structuredClone`** (Node 18+ aligns with Next 16 tooling).

---

## 4. File organization

**Recommended:** **`src/lib/generation/__tests__/generatorPipeline.smoke.test.ts`** (or `pipeline.smoke.test.ts`)

**Rationale:** The smoke ties **`validateBlueprint`** + **`generateStructureFromResolved`**; `generateStructure.ts` is the orchestration entry used by the app. Keeps tests next to the generation package without mixing into `blueprints/` or `voxel/` until more suites appear.

Alternatives (documented only if we pivot during implementation):

- `src/lib/blueprints/__tests__/` — skews toward validation-only tests later.
- `tests/generator/` — clean top-level mirror; requires same alias setup anyway.

---

## 5. Scope boundaries (Issue 1 — non-goals)

**Do not add:**

- Full invariant suite (duplicate coords, connectivity, grounded mass, strict block-ID registry checks).
- Edge-case blueprint fixtures beyond the default sample.
- Shared structure-analysis helpers (unless a one-liner is unavoidable — avoid).
- Snapshot tests, Playwright, React Testing Library, renderer/canvas tests.
- UI or blueprint schema changes.
- **Generator logic changes** unless an import/path bug blocks Vitest from loading modules (unlikely).

---

## 6. Verification (after implementation)

| Step | Purpose |
|------|--------|
| **`pnpm install`** | Pull Vitest after `package.json` / lockfile update |
| **`pnpm test:generator`** | Smoke passes |
| **`pnpm exec tsc --noEmit`** | App TS unchanged |
| **`pnpm run build`** | Next build still passes |

Manual optional: run **`pnpm dev`** — unchanged behavior.

---

## 7. CHANGE.md (after implementation)

Overwrite or append per milestone convention with:

- **Title:** Issue 1 — Vitest generator test foundation (or milestone slice title).
- **Branch:** `milestone/generator-reliability-testing`.
- **Files changed:** `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `src/lib/generation/__tests__/…`, **`CHANGE.md`**.
- **Vitest setup:** devDependency, Node environment, path alias for `@/`.
- **Script:** `pnpm test:generator`.
- **Smoke test:** preset → validate → `generateStructureFromResolved` → non-empty blocks; no mocks.
- **Deferred:** Full invariants, fixtures, connectivity helpers, coverage, CI wiring (unless already present).
- **Results:** `test:generator`, `tsc`, `build` outcomes.
- **Weaknesses / follow-up:** Expand tests under same folder; consider CI job running `pnpm test:generator`; optional coverage later.

---

## 8. Approval checkpoint

**Waiting for approval before implementation.**
