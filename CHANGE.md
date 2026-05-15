# Change log — Vitest generator test foundation

## Title of this issue

**Add Vitest generator test foundation** (Generator Reliability Testing — Issue 1)

## Branch name

`milestone/generator-reliability-testing`

## Files changed

| File | Change |
|------|--------|
| `package.json` | Added `vitest` devDependency and `test:generator` script. |
| `pnpm-lock.yaml` | Lockfile updated for Vitest and transitive deps. |
| `vitest.config.ts` | **New:** Node environment, `@` path alias, include pattern for generation tests. |
| `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts` | **New:** One smoke test for validate → generate pipeline. |

## Vitest setup

- **`vitest@^3.2.4`** (devDependency).
- **`vitest.config.ts`** at repo root:
  - `test.environment: "node"` (no browser / Three.js).
  - `resolve.alias["@"]` → project root (matches `tsconfig` `"@/*"`).
  - `test.include`: `src/lib/generation/__tests__/**/*.test.ts`.

## Test command added

```bash
pnpm test:generator
```

Runs: `vitest run src/lib/generation/__tests__` (generator-scoped).

## Smoke test behavior

**File:** `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts`

1. **`structuredClone(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT)`** — default Northwatch sample blueprint.
2. **`validateBlueprint(blueprint)`** — asserts `ok === true` and `resolved` is defined.
3. **`generateStructureFromResolved(resolved)`** — real generator dispatch (no mocks).
4. Asserts **`blocks.length > 0`**.

Does not call React, the visualizer, or `generateStructure()` (which re-validates); matches the app path after validation.

## Intentionally deferred

- Full invariant suite (duplicate coordinates, valid block IDs, `maxBlockCount`, connectivity/grounding).
- Edge-case blueprint fixtures and shared structure-analysis helpers.
- Snapshot / visual / Playwright / RTL tests.
- Coverage reporting and CI wiring.
- UI, blueprint schema, or generator logic changes.

## Test / build / typecheck results

| Check | Result |
|-------|--------|
| `pnpm install` | **Done** (Vitest 3.2.4 added) |
| `pnpm test:generator` | **Passed** (1 test) |
| `pnpm exec tsc --noEmit` | **Passed** |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## Remaining weaknesses / follow-up ideas

- Add invariant tests in the same `__tests__` folder (Issue 2+).
- Run `pnpm test:generator` in CI on pull requests.
- Optional: `vitest watch` script for local dev; `@vitest/coverage-v8` when coverage is needed.
