# Builder LLM chat + image reference (Workers AI)

## Summary

Connected `/builder` to a real multimodal Workers AI model via `POST /api/builder/chat`. Users can send text-only messages or attach one reference image (png/jpeg/webp, ~3 MB cap). The center voxel preview stays static; mock Build activity remains a separate pipeline-facing checklist, not model reasoning.

## Added

- `src/app/api/builder/chat/route.ts` — Node route handler, validation, system prompt injection, safe errors
- `src/lib/builder/builderChatTypes.ts`, `builderSystemPrompt.ts`, `validateChatRequest.ts`, `callWorkersAiChat.ts`, `mockBuilderActivity.ts`
- `src/app/builder/components/BuilderActivityCard.tsx`
- `.env.example` — `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `WORKERS_AI_MODEL`, Meta license note

## Updated

- `PLAN.md` — multimodal chat + image reference scope
- `BuilderClient.tsx`, `BuilderChatPanel.tsx`, `BuilderMessage.tsx`, `BuilderPromptInput.tsx`, `BuilderWorkspace.tsx`, `mockBuilderData.ts`
- `docs/deployment/CLOUDFLARE.md`, `docs/deployment/README.md`

## Model

Default: `@cf/meta/llama-3.2-11b-vision-instruct` via `WORKERS_AI_MODEL`. One-time Meta license acceptance may be required (see `.env.example`).

## Out of scope (unchanged)

Blueprint generation, preview updates from chat, R2/storage, streaming, separate text/vision routes, canonical render capture.

## Verify

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
```

Manual: `pnpm dev` → `http://localhost:3000/builder` — text-only and image+text messages; preview unchanged.
