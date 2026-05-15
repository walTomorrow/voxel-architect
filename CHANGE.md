# Change log — Three.js renderer deprecation audit

## Title

Three.js renderer deprecation audit (`milestone/blueprint-portability`)

## Files changed

**None** for this audit commit. Findings are documentation-only; no safe source-level fix for the `THREE.Clock` warning without upgrading or patching dependencies.

| Area | Result |
|------|--------|
| `src/` | No `THREE.Clock` or other audited deprecated APIs in application code. |
| `src/components/voxel/VoxelViewer.tsx` | Already uses `shadows={{ type: THREE.PCFShadowMap }}` (prior QA fix). |

## Clock usage in our source

**Not found.** Searched `src/`, `src/app/`, `src/components/`, `src/lib/` for:

- `THREE.Clock`, `new Clock`, `Clock(`, `useFrame`, custom clock wiring, Clock imports from `three`

`VoxelViewer` uses R3F `Canvas`, lights, geometry, materials, and orbit controls only — no direct clock or animation loop.

## Where the `THREE.Clock` warning comes from

**Dependency-originated:** `@react-three/fiber` initializes its internal store with:

```js
clock: new THREE.Clock(),
```

(see `node_modules/@react-three/fiber/dist/events-*.js`, store default state).

`three@0.184.0` deprecates `Clock` in **r183** and logs on construction:

`Clock: This module has been deprecated. Please use THREE.Timer instead.`

(`node_modules/three/src/core/Clock.js`).

`@react-three/drei@10.7.7` does **not** reference `THREE.Clock` in its package sources (grep).

R3F does **not** yet use `THREE.Timer` in the installed build (no `Timer` usage in fiber dist for the frameloop clock).

## Installed versions (lockfile)

| Package | Version |
|---------|---------|
| `three` | **0.184.0** |
| `@react-three/fiber` | **9.6.1** |
| `@react-three/drei` | **10.7.7** |

## Other deprecated API audit (our source)

| Pattern | In `src/`? |
|---------|------------|
| `PCFSoftShadowMap` | **No** (Canvas uses `PCFShadowMap`) |
| `THREE.Clock` / `Clock` | **No** |
| `WebGLMultipleRenderTargets` | **No** |
| Legacy `Geometry` | **No** |
| `WebGPURenderer` | **No** |
| `outputEncoding` / `sRGBEncoding` | **No** |
| `physicallyCorrectLights` | **No** |

No additional source fixes required from this audit.

## What we did **not** do

- No `console.warn` suppression
- No `node_modules` edits or monkeypatches
- No major dependency upgrades (R3F / Three) to chase `Timer` adoption upstream
- No experimental R3F releases

## TypeScript and build

| Check | Result |
|-------|--------|
| `pnpm exec tsc --noEmit` | **Passed** |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## `pnpm dev` observation

- **`THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated`** — should remain **gone** on `/visualizer` thanks to explicit `PCFShadowMap` on `Canvas`.
- **`THREE.Clock: … Please use THREE.Timer instead`** — expected to **remain** once per Canvas mount until `@react-three/fiber` stops constructing `THREE.Clock`. Non-fatal; rendering and blueprint import/export are unaffected.
- Voxel shadows, `/preview`, and lab workflows unchanged by this audit (no code diff).

## Remaining follow-up

- Watch **@react-three/fiber** releases for migration from `THREE.Clock` to `THREE.Timer` (or equivalent) in the root store.
- Optional future: bump `three` + R3F together when upstream documents compatible versions — out of scope for this small audit commit.
