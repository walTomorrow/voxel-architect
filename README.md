## Live Demo

Voxel Architect is deployed here:

https://voxel-architect.pages.dev

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This repo uses **pnpm** (see `packageManager` in `package.json` for the pinned version used in CI and on Vercel).

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Other package managers may work, but deployments and local workflows assume pnpm.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Generator reliability tests

Structural/regression checks for the deterministic tower pipeline are documented in [`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md). Run:

```bash
pnpm test:generator
```

