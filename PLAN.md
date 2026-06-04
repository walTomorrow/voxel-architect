# Plan — OpenNext migration (Cloudflare)

**Branch:** `feature/opennext-migration`  
**Status:** Complete — live app at https://voxel-architect.wlc562.workers.dev/ (see `docs/deployment/CLOUDFLARE.md`).  
**Type:** Infrastructure migration — **not** a product feature branch.

**Goal:** Replace the deprecated `@cloudflare/next-on-pages` build/deploy path with the current **OpenNext Cloudflare adapter** (`@opennextjs/cloudflare`), while keeping the deployed app and existing routes working.

**Official references (verify before implementing):**

- [OpenNext — Cloudflare get started](https://opennext.js.org/cloudflare/get-started)
- [OpenNext — Cloudflare CLI](https://opennext.js.org/cloudflare/cli)
- [OpenNext — Cloudflare environment variables](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Cloudflare Workers — Next.js framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare blog — OpenNext on Workers](https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/)

**Live site:** https://voxel-architect.wlc562.workers.dev/ (Cloudflare **Workers** via OpenNext).

---

## 1. Summary

This branch migrates **how** Voxel Architect is built and run on Cloudflare. It does **not** change generator/blueprint logic, `/preview` behavior, `/generic-lab` editing, or builder product UX except where the platform requires it (e.g. removing unsupported Edge runtime exports).

The deprecated adapter warned in build logs:

```text
@cloudflare/next-on-pages@1.13.16: Please use the OpenNext adapter instead: https://opennext.js.org/cloudflare
```

**Current production workaround:** `/api/builder/chat` was made Edge-compatible under `next-on-pages` and deploys successfully. This migration addresses **long-term technical debt** before expanding Cloudflare infrastructure (bindings, caching, etc.).

**Success means:** same user-visible routes (`/builder`, `/preview`, `/generic-lab`), same builder chat behavior (streaming text, image prompts), secrets stay server-side, and the `next-on-pages` build command is gone from the deployment path.

---

## 2. Current state survey

### Package scripts (`package.json`)

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` (Node — not used on Cloudflare today) |
| `lint` | `eslint` |
| `test:generator` | `vitest run` |

- **Package manager:** `pnpm@10.33.3`
- **Was:** `@cloudflare/next-on-pages` only in the dashboard; **now:** `@opennextjs/cloudflare` and `wrangler` in `package.json`.
- **No** `setupDevPlatform()`, `getRequestContext`, or other `next-on-pages` references in source.

### Previous build (replaced)

| Setting | Was |
|---------|-----|
| Build command | `npx @cloudflare/next-on-pages@1` (deprecated) |
| Platform | Cloudflare Pages + Edge runtime |

**Now:** Workers Builds / `pnpm run deploy:cloudflare` → `.open-next/`.

### Wrangler / OpenNext config in repo

| File | Present? |
|------|----------|
| `wrangler.toml` | **No** |
| `wrangler.jsonc` | **No** |
| `open-next.config.ts` | **No** |
| `.dev.vars` | **No** (gitignored pattern may apply via `.env*`) |
| `public/_headers` | **No** |

### Next.js version

- **`next`:** `16.2.6` (App Router)
- OpenNext documents support for **Next.js 16** minor/patch versions via `@opennextjs/cloudflare`.

### `next.config.ts`

- Redirect: `/visualizer` → `/generic-lab`
- **No** OpenNext dev helper (`initOpenNextCloudflareForDev`) yet.

### App routes to preserve (no logic changes planned)

| Route | Role |
|-------|------|
| `/builder` | Product-facing AI builder UI (`src/app/builder/`) |
| `/preview` | Structure preview (`src/app/preview/`) |
| `/generic-lab` | Blueprint lab (`src/app/generic-lab/`) |
| `/api/builder/chat` | Workers AI chat API |

No `middleware.ts` in repo. No other `export const runtime = "edge"` besides the builder chat route.

### API route: `src/app/api/builder/chat/route.ts`

- **`export const runtime = "edge"`** — required for `next-on-pages`; **OpenNext docs require removing Edge runtime** (Node.js runtime on Workers instead).
- **POST** handler: JSON body validation → text-only **SSE streaming** or image **JSON** response.
- **Imports:** `@/src/lib/builder/callWorkersAiChat`, `validateChatRequest`, types.
- **No** filesystem, **no** `Buffer` in the route file.

### Builder chat library (`src/lib/builder/`)

| Module | Notes |
|--------|--------|
| `callWorkersAiChat.ts` | `process.env` for config; outbound `fetch` to Workers AI REST; streaming via `ReadableStream` |
| `workersAiSse.ts` | `TextDecoder` / `TransformStream` / string `lineBuffer` (not Node `Buffer`) |
| `validateChatRequest.ts` | JSON + base64 image size checks |
| Others | Guardrails, system prompt, types, mock activity (UI-only) |

### Environment variables (builder chat)

Documented in **`.env.example`** (placeholders only — safe to commit):

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Workers AI REST account segment |
| `CLOUDFLARE_API_TOKEN` | Bearer token (server-only secret) |
| `WORKERS_AI_MODEL` | Default `@cf/meta/llama-3.2-11b-vision-instruct` |

**`.env.local`:** exists locally for development; **do not** read, print, commit, or modify as part of this migration.

**Client exposure:** no `NEXT_PUBLIC_*` Cloudflare secrets in `src/` (grep confirms server-only names in builder lib).

### Deployment documentation in repo

- No root `CLOUDFLARE.md` in tree at plan time.
- `docs/deployment/README.md` was listed in tooling but is **not** present on disk — plan to add **`docs/deployment/CLOUDFLARE.md`** as the canonical deployment doc for this migration.

### Repo vs dashboard gap (historical)

A prior deploy failed when only `route.ts` was pushed without `src/lib/builder/` and `src/app/builder/`. This migration branch should ensure **full builder tree** is committed before any deploy test.

---

## 3. Migration decision

### Recommended target: **Cloudflare Workers via `@opennextjs/cloudflare`**

Official OpenNext and Cloudflare documentation describe deployment to **Cloudflare Workers** (Worker entry `.open-next/worker.js` + static assets in `.open-next/assets`), not a continued **`next-on-pages`** Pages Functions model.

| Option | Fit for this repo |
|--------|-------------------|
| **Workers + OpenNext** (recommended) | Matches official adapter; supports **Route Handlers**, **response streaming**, Next **16**; uses `nodejs_compat` instead of Edge-constrained runtime. |
| **Pages + OpenNext** | **Not** a supported target; production uses Workers + OpenNext only. |

### Least disruptive deployment *workflow*

1. **Keep** GitHub branch → preview → merge workflow.
2. **Change** build/deploy mechanics to OpenNext + Wrangler (Worker + assets binding).
3. **Host on Workers** at https://voxel-architect.wlc562.workers.dev/ (custom domain optional).

**Outcome:** Workers Builds / `wrangler deploy` replaces the deprecated Pages `next-on-pages` pipeline.

**Alternative bootstrap:** `npx @opennextjs/cloudflare migrate` automates dependency install, `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars`, scripts, `_headers`, `.gitignore`, and `initOpenNextCloudflareForDev()`. **Review the diff carefully** (it may create R2 cache resources if R2 is enabled on the account). Manual steps from the get-started guide are equivalent.

**Optional minimal OpenNext config:** `defineCloudflareConfig()` with **no** R2 incremental cache on first pass (defer R2 until caching is explicitly desired).

---

## 4. Files likely to change

**Create**

| File | Purpose |
|------|---------|
| `wrangler.jsonc` | Worker name, `main`, `assets`, `compatibility_date`, `nodejs_compat` (and flags per docs) |
| `open-next.config.ts` | `defineCloudflareConfig()` (minimal initially) |
| `.dev.vars` | `NEXTJS_ENV=development` for local Worker preview (no secrets committed) |
| `public/_headers` | Static asset cache headers for `/_next/static/*` |
| `docs/deployment/CLOUDFLARE.md` | Build/deploy/env instructions for the team |

**Edit**

| File | Purpose |
|------|---------|
| `package.json` | Add `@opennextjs/cloudflare`, `wrangler`; add `preview` / `deploy` / `upload` / `cf-typegen` scripts |
| `pnpm-lock.yaml` | Lockfile update |
| `next.config.ts` | `initOpenNextCloudflareForDev()` from `@opennextjs/cloudflare` |
| `.gitignore` | Ignore `.open-next/` |
| `src/app/api/builder/chat/route.ts` | **Remove** `export const runtime = "edge"` per OpenNext requirement |
| `README.md` | Update live URL / deploy instructions after cutover (optional, post-migration) |
| `.env.example` | Placeholders only if OpenNext/Wrangler docs add vars (e.g. `NEXTJS_ENV` note); **never** real secrets |
| `PLAN.md` | This document (replaced for migration) |

**Do not edit (unless build proves otherwise)**

- `src/lib/generation/**`, blueprint schemas, compiler
- `src/app/preview/**`, `src/app/generic-lab/**` (except forced build fixes)
- Builder **UX** beyond runtime export removal
- `.env.local`

---

## 5. Build command changes

### Previous (removed)

```bash
npx @cloudflare/next-on-pages@1
```

No longer used.

### Target (from official OpenNext + Cloudflare docs)

**Packages**

```bash
pnpm add @opennextjs/cloudflare@latest
pnpm add -D wrangler@latest
```

Wrangler **≥ 3.99.0** required.

**`package.json` scripts** (adapter invokes existing `build` → `next build`):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
  }
}
```

Use `pnpm exec opennextjs-cloudflare …` if the binary is not on PATH.

**What each step does**

| Command | Role |
|---------|------|
| `opennextjs-cloudflare build` | Runs `pnpm run build` (`next build`), then transforms output to `.open-next/` |
| `opennextjs-cloudflare preview` | Populates local cache + `wrangler dev` (production-like `workerd` runtime) |
| `opennextjs-cloudflare deploy` | Populates remote cache + deploys Worker (use `-- --keep-vars` if dashboard vars must persist) |
| `next dev` | Unchanged for day-to-day UI work |

**Local full build (no deploy)**

```bash
pnpm exec opennextjs-cloudflare build
```

**Output artifacts (do not commit)**

| Path | Role |
|------|------|
| `.open-next/worker.js` | Wrangler `main` entry |
| `.open-next/assets/` | Static assets (`assets.directory` in `wrangler.jsonc`) |

**Cloudflare CI / dashboard (Workers Builds or equivalent)**

- **Build + deploy command:** `pnpm install && pnpm run deploy` (or split build/upload per account conventions).
- **Not** a Pages “output directory” upload of `.next/` — the adapter produces `.open-next/`.
- Use **Workers Builds** (or `pnpm run deploy:cloudflare`) in the Cloudflare dashboard.

**Windows note:** OpenNext documents limited Windows support; prefer **WSL**, Linux CI, or deploy-only validation on Windows if `preview`/`build` fails locally.

---

## 6. Environment variables and secrets

### Local development

| File | Policy |
|------|--------|
| `.env.local` | **Do not** touch, print, inspect, or commit. User-managed secrets. |
| `.env.example` | Placeholders only; may add non-secret notes (`NEXTJS_ENV`, license curl hints). |
| `.dev.vars` | Commit **only** non-secret defaults, e.g. `NEXTJS_ENV=development`. **Do not** put API tokens in git. |

OpenNext recommends **Next.js `.env*` files** for vars available under `process.env` in both `next dev` and `wrangler dev` / deployed Worker. Existing `.env.local` pattern should continue to work for local `next dev`.

### Production / preview deployments

| Variable | Where to set | When needed |
|----------|--------------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Worker **environment variables** or **secrets** | **Runtime** (API route) |
| `CLOUDFLARE_API_TOKEN` | Dashboard **secrets** (preferred) | **Runtime** |
| `WORKERS_AI_MODEL` | Dashboard env var | **Runtime** (optional override) |

**Workers Builds:** If the CI build step runs `next build` only, builder secrets are primarily **runtime** vars. Follow [OpenNext env vars](https://opennext.js.org/cloudflare/howtos/env-vars): set **runtime** vars in the dashboard; use **Build variables and secrets** only if the build inlines env-dependent SSG (this app’s builder route is dynamic).

**Deploy preservation:** `opennextjs-cloudflare deploy -- --keep-vars` if dashboard-defined vars must survive deploys.

**Rules**

- No `NEXT_PUBLIC_*` for Cloudflare credentials.
- Tokens stay server-side (`process.env` in route handlers / lib only).

### Future improvement (out of scope unless trivial)

- **Workers AI binding** instead of REST `fetch` + API token — lower latency and no token in Worker env, but requires `wrangler.jsonc` AI binding and code changes in `callWorkersAiChat.ts`. Treat as **post-migration** unless docs show a zero-risk drop-in.

---

## 7. Runtime compatibility audit

Execute during implementation; **preserve behavior** — rewrite only if preview/deploy proves breakage.

### `/api/builder/chat` (`route.ts`)

| Check | Current state | OpenNext expectation |
|-------|---------------|----------------------|
| `runtime = "edge"` | Present | **Remove** — adapter uses Node.js runtime on Workers |
| Request body | `request.json()`, 4 MB limit | Standard Web APIs — OK |
| Responses | `Response.json`, SSE `ReadableStream` | [Supported — response streaming](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) |
| Dynamic route | No static generation of secrets | OK |

### `callWorkersAiChat.ts`

| Check | Current state |
|-------|---------------|
| `process.env.*` | Used for account/token/model |
| Outbound `fetch` | HTTPS to `api.cloudflare.com` — may need `global_fetch_strictly_public` in `wrangler.jsonc` per OpenNext template |
| Streaming | `fetch` with `stream: true`, pipe through `transformWorkersAiStreamToBuilderSse` |
| Image path | Non-streaming JSON body with top-level `image` + `messages` |
| Node `Buffer` / `fs` / `child_process` | **Not used** |

### `workersAiSse.ts`

| Check | Current state |
|-------|---------------|
| Streams | `TransformStream`, `TextEncoder`/`TextDecoder` |
| `lineBuffer` | JavaScript string, not Node Buffer |

### `validateChatRequest.ts`

| Check | Current state |
|-------|---------------|
| Parsing | Pure JSON validation, base64 size estimate |

### App pages (`/builder`, `/preview`, `/generic-lab`)

- Mostly client components + static/SSR Next patterns; **no** planned changes.
- **Three.js** / R3F bundles: watch **Worker bundle size** (gzip limit matters; Wrangler reports compressed size).

### Audit checklist (implementation phase)

- [ ] Grep for `runtime = "edge"` and remove per OpenNext docs
- [ ] Grep for `Buffer`, `fs`, `node:`, `child_process` under `src/app/api` and `src/lib/builder`
- [ ] Run `pnpm run preview` and exercise streaming + image paths
- [ ] Confirm `process.env` reads work in deployed Worker (dashboard vars)

---

## 8. Testing plan

### Baseline (before or after config, no deploy)

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
```

### OpenNext-specific (local)

```bash
pnpm run preview
```

Then verify in the **Worker runtime** (not only `next dev`):

| Check | How |
|-------|-----|
| `/builder` loads | Browser |
| Text-only chat | Send message → streaming tokens |
| Streaming | SSE `chunk` / `done` events; send disabled while in flight |
| Image prompt | Attach/paste image → JSON mode response (`X-Builder-Chat-Mode: json`) |
| `/preview` | Loads 3D preview |
| `/generic-lab` | Loads lab shell / v2 UI |
| Secrets | DevTools network: no `CLOUDFLARE_API_TOKEN` in client bundles or responses |
| Config missing | Temporarily unset vars locally → 503 CONFIG message (optional) |

### Deployed branch preview

Repeat the same browser checks on the **branch preview URL** after Cloudflare build succeeds.

### Regression guard

- `pnpm test:generator` must stay green (no generator edits planned).

---

## 9. Deployment plan

### Implementation sequence (after plan approval)

1. Branch `feature/opennext-migration` from latest main (or current production base).
2. Add dependencies and config (`wrangler.jsonc`, `open-next.config.ts`, scripts, `_headers`, `.gitignore`, `next.config.ts` dev helper).
3. Remove `export const runtime = "edge"` from `src/app/api/builder/chat/route.ts`.
4. Add `docs/deployment/CLOUDFLARE.md`.
5. Run baseline tests (Section 8).
6. Run `pnpm run preview` locally (WSL if Windows fails).
7. Configure **Cloudflare Workers** (or Workers Builds) for the repo:
   - Replace `npx @cloudflare/next-on-pages@1` with `pnpm install && pnpm run deploy` (or documented equivalent).
   - Set **runtime** env vars / secrets for the three `CLOUDFLARE_*` / `WORKERS_AI_MODEL` vars.
8. Deploy **branch preview**; run deployed checklist (Section 8).
9. Merge to production branch only when branch preview passes.
10. README and `docs/deployment/CLOUDFLARE.md` point to https://voxel-architect.wlc562.workers.dev/

### Rollback plan

- Revert the migration PR / reset branch to pre-migration commit.
- Re-enable the previous `next-on-pages` build in dashboard history only if absolutely necessary (deprecated).
- **Do not** mix generator features, blueprint v2, or UI overhauls into this branch.

---

## 10. Out of scope

Do **not** implement on this branch:

- Cloudflare Agents
- Durable Objects
- D1 persistence
- R2 uploads (except optional default R2 cache bucket created by `migrate` — prefer minimal config without R2 first)
- AI Gateway
- Workers AI **binding** migration (unless proven necessary for deploy)
- Blueprint generation / v2 schema / compiler changes
- Canonical render self-evaluation
- UI feature changes beyond forced platform fixes
- Generator / `test:generator` logic changes
- GenericBuildingBlueprint v2 product plan (previous `PLAN.md` topic)

---

## 11. Risks / things to confirm during implementation

Answer these while executing the migration (not all are knowable from the repo alone):

| # | Question | Where to confirm |
|---|----------|------------------|
| 1 | **Pages vs Workers:** Does the team migrate the existing Pages project to Workers, or create a new Worker + Workers Builds? | Cloudflare dashboard + account |
| 2 | **Next.js 16.2.6:** Any OpenNext pin or adapter version caveats for this exact patch? | OpenNext releases / changelog |
| 3 | **App Router + route handler + streaming:** Any known gaps with SSE through Route Handlers? | `pnpm run preview` + branch deploy |
| 4 | **Env vars after migration:** Same dashboard fields, or separate Build vs Runtime secrets? | [OpenNext env vars](https://opennext.js.org/cloudflare/howtos/env-vars) |
| 5 | **Worker build settings:** Confirm Workers Builds command and env vars | Cloudflare project settings |
| 6 | **`nodejs_compat` + `compatibility_date`:** Minimum date and extra flags (`global_fetch_strictly_public`)? | `wrangler.jsonc` template in OpenNext get-started |
| 7 | **`runtime = "edge"` removal:** Does chat still stream correctly under default Node route runtime? | Local preview + deploy |
| 8 | **Worker size:** Does the Three.js client bundle + Next server bundle exceed paid/free compressed limits? | Wrangler deploy size line |
| 9 | **Windows dev:** Does `opennextjs-cloudflare build` work on the primary dev OS, or only in CI/WSL? | OpenNext Windows note |
| 10 | **Custom domain:** Optional; attach in Cloudflare DNS / Workers routes if desired | Cloudflare dashboard |
| 11 | **R2 cache:** Skip R2 on first deploy or accept `migrate`-created bucket? | Account R2 enabled? |
| 12 | **License flow:** Meta `{"prompt":"agree"}` still works unchanged via REST? | One manual curl per env |

---

## 12. Success criteria

The migration is **done** when:

- [x] Deprecated `@cloudflare/next-on-pages` is **not** used in Cloudflare build settings or repo scripts
- [x] `@opennextjs/cloudflare` + `wrangler` are configured (`wrangler.jsonc`, `.open-next` gitignored)
- [x] `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:generator`, `pnpm run build` pass
- [x] Cloudflare Worker deployment succeeds
- [x] Live URL: https://voxel-architect.wlc562.workers.dev/
- [x] `/builder`, streaming chat, image prompts, `/preview`, `/generic-lab` verified on Worker deploy
- [x] No Cloudflare secrets exposed via `NEXT_PUBLIC_*` or client bundles
- [x] No unrelated generator/blueprint/product diffs in the migration PR

---

## Appendix — `wrangler.jsonc` starter (from OpenNext docs; adjust `name` / dates)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "voxel-architect",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

Optional `services` / `r2_buckets` / `images` blocks from the full get-started template should only be added when those features are intentionally enabled.
