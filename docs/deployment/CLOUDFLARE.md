# Cloudflare deployment (OpenNext on Workers)

Voxel Architect is built and deployed with [**@opennextjs/cloudflare**](https://opennext.js.org/cloudflare). The deprecated `@cloudflare/next-on-pages` adapter is no longer used.

---

## Current deployment

| Item | Value |
|------|--------|
| **Platform** | Cloudflare **Workers** (OpenNext bundle) |
| **Live URL** | https://voxel-architect.wlc562.workers.dev/ |
| **Worker entry** | `.open-next/worker.js` |
| **Static assets** | `.open-next/assets/` |
| **Deploy** | `pnpm run deploy:cloudflare` (or Workers Builds with the same command) |

A custom domain is optional and not required for this project.

Earlier versions were deployed through Cloudflare Pages using the deprecated `next-on-pages` adapter; production now runs only on the Worker URL above.

---

## Prerequisites

- Node.js + **pnpm** (`packageManager` in `package.json`)
- Cloudflare account with Workers deploy permission
- Wrangler **≥ 3.99** (repo uses `wrangler` devDependency)

---

## Local development

| Command | Use |
|---------|-----|
| `pnpm dev` | Day-to-day UI work (Next.js dev server). Secrets: **`.env.local`** (never commit). |
| `pnpm run preview:cloudflare` | Production-like test on the **Workers** runtime (`workerd`). |

For `preview:cloudflare`, copy non-secret defaults only:

```bash
cp .dev.vars.example .dev.vars
```

**Do not** put `CLOUDFLARE_API_TOKEN` in `.dev.vars` (gitignored). For Worker preview, either:

- Rely on Next.js env loading via `.env.local` (OpenNext documents `process.env` from `.env*` in `wrangler dev` when configured), or  
- Set runtime vars in the Cloudflare dashboard for remote-only testing.

See [OpenNext — environment variables](https://opennext.js.org/cloudflare/howtos/env-vars).

---

## Build and deploy

```bash
# Transform Next build for Workers (runs `pnpm run build` / `next build` first)
pnpm exec opennextjs-cloudflare build

# Build + local Worker preview
pnpm run preview:cloudflare

# Build + deploy to Cloudflare Workers
pnpm run deploy:cloudflare
```

To preserve dashboard-defined env vars across deploys:

```bash
pnpm exec opennextjs-cloudflare deploy -- --keep-vars
```

---

## Cloudflare dashboard / CI

Use a **Workers** project (Workers Builds or `pnpm run deploy:cloudflare`), not a Pages `next-on-pages` pipeline.

1. Link the repository to **Workers Builds** (or deploy from CI).
2. **Build/deploy command:** `pnpm install && pnpm run deploy:cloudflare` (or `pnpm exec opennextjs-cloudflare build` plus a separate deploy step).
3. **Runtime environment variables / secrets** (required for `/api/builder/chat`):

   | Name | Secret? |
   |------|---------|
   | `CLOUDFLARE_ACCOUNT_ID` | No (still server-only) |
   | `CLOUDFLARE_API_TOKEN` | **Yes** |
   | `WORKERS_AI_MODEL` | No (optional override) |

4. Do **not** set `NEXT_PUBLIC_*` for these values.

See `.env.example` for placeholders and Meta license curl notes.

---

## Configuration files (repo)

| File | Role |
|------|------|
| `wrangler.jsonc` | Worker name, `main`, static `assets`, `nodejs_compat` |
| `open-next.config.ts` | Minimal OpenNext Cloudflare config (no R2 cache in this migration) |
| `public/_headers` | Long-cache headers for `/_next/static/*` |
| `.dev.vars.example` | Non-secret template for Wrangler dev; copy to **gitignored** `.dev.vars` |

---

## Windows / OneDrive note

`pnpm exec opennextjs-cloudflare build` may fail on native Windows with `EPERM: operation not permitted, symlink` when bundling server functions (pnpm layout + symlink privileges). OpenNext warns that Windows is not fully supported.

**Workarounds:** use **WSL**, **Linux CI** (Workers Builds), or enable Windows Developer Mode / elevated symlink rights. `pnpm run build` (`next build`) still validates the app on Windows; run the full OpenNext transform on Linux before merge if local Windows build fails.

---

## Verification checklist

After deploy to https://voxel-architect.wlc562.workers.dev/ (or a preview Worker URL):

- [ ] `/builder` loads  
- [ ] Text chat streams (SSE)  
- [ ] Image prompt returns JSON response  
- [ ] `/preview` and `/generic-lab` load  
- [ ] No Cloudflare secrets in client bundles or network responses  

Local gates before merge:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
pnpm exec opennextjs-cloudflare build
```

---

## Out of scope

AI Gateway, Agents, Durable Objects, D1, R2 incremental cache, Workers AI bindings (REST remains), blueprint/generator/UI changes.

---

## References

- [OpenNext Cloudflare — Get started](https://opennext.js.org/cloudflare/get-started)
- [OpenNext Cloudflare — CLI](https://opennext.js.org/cloudflare/cli)
- [Cloudflare Workers — Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
