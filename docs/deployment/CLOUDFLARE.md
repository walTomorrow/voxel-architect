# Cloudflare deployment (OpenNext on Workers)

Voxel Architect is built and deployed with [**@opennextjs/cloudflare**](https://opennext.js.org/cloudflare), not the deprecated `@cloudflare/next-on-pages` adapter.

---

## Deployment target and URL cutover (read this first)

| | **Before (legacy)** | **After (this migration)** |
|---|---------------------|----------------------------|
| **Platform** | Cloudflare **Pages** | Cloudflare **Workers** (OpenNext bundle) |
| **Typical public URL** | `https://voxel-architect.pages.dev` | `https://voxel-architect.<account>.workers.dev` (or a **custom domain** you attach to the Worker) |
| **Build command** | `npx @cloudflare/next-on-pages@1` | `pnpm install && pnpm run deploy:cloudflare` (or Workers Builds equivalent) |
| **Output** | Pages / Functions layout from `next-on-pages` | `.open-next/worker.js` + `.open-next/assets/` |

**Important:** Completing this migration does **not** automatically keep serving traffic at **`voxel-architect.pages.dev`**. That hostname belongs to the **Pages** project. The OpenNext app runs as a **Worker** and gets a **different default URL** unless you:

1. Deploy the Worker (`pnpm run deploy:cloudflare` or Workers Builds), then  
2. **Cut over** traffic by attaching your production hostname (custom domain) to the **Worker**, or updating links/README to the new `workers.dev` URL.

Until cutover, the old Pages deployment may still respond at `*.pages.dev` if that project is left connected—treat it as **legacy** and avoid changing its build settings back to `next-on-pages` once the Worker is production.

Document the **actual** production URL in the repo README after cutover.

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

(`deploy:cloudflare` script can be extended with `--keep-vars` once confirmed in your account.)

---

## Cloudflare dashboard / CI

### Workers Builds (recommended for Git push → deploy)

1. Create or use a **Workers** project linked to this repository (not the legacy Pages `next-on-pages` pipeline).
2. **Build command:** `pnpm install && pnpm run deploy:cloudflare` (or `pnpm exec opennextjs-cloudflare build` + separate deploy step per your setup).
3. **Runtime environment variables / secrets** (required for `/api/builder/chat`):

   | Name | Secret? |
   |------|---------|
   | `CLOUDFLARE_ACCOUNT_ID` | No (still server-only) |
   | `CLOUDFLARE_API_TOKEN` | **Yes** |
   | `WORKERS_AI_MODEL` | No (optional override) |

4. Do **not** set `NEXT_PUBLIC_*` for these values.

See `.env.example` for placeholders and Meta license curl notes.

### Legacy Pages project

If a **Pages** project still exists for this repo:

- **Stop** using `npx @cloudflare/next-on-pages@1` there once the Worker is live.
- Expect **`voxel-architect.pages.dev`** to remain on Pages until you disable that project or repoint DNS—**that is a different deployment** than the Worker URL.

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

After deploy to a **Worker** URL (not assumed to be `pages.dev`):

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

## Out of scope on this migration

AI Gateway, Agents, Durable Objects, D1, R2 incremental cache, Workers AI bindings (REST remains), blueprint/generator/UI changes.

---

## References

- [OpenNext Cloudflare — Get started](https://opennext.js.org/cloudflare/get-started)
- [OpenNext Cloudflare — CLI](https://opennext.js.org/cloudflare/cli)
- [Cloudflare Workers — Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
