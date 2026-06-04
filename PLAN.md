# PLAN — Builder LLM Chat + Image Reference Input (Workers AI)

## Status

| Milestone | State |
|-----------|--------|
| `/builder` UI shell (3-column layout, static v1 preview) | **Done** |
| Real multimodal LLM chat + optional image reference | **Done** |
| Mock build activity checklist | **Done** |
| Blueprint generation / preview updates from model | **Out of scope** |

**Branch:** `feature/ai-builder-ui-shell` (or `feature/builder-llm-chat`)

---

## Goal

Users chat with a **real multimodal LLM** in the `/builder` right-hand conversation panel. They can send **text-only** messages or attach **one image** as a visual reference (`user_reference`). The **center voxel preview stays static**. The model only responds in chat — it does not generate blueprints, modify previews, apply operations, or update the building.

---

## Model

**Default (configurable):**

```bash
WORKERS_AI_MODEL=@cf/meta/llama-3.2-11b-vision-instruct
```

One multimodal Workers AI model for text chat and user reference images in the same thread. Later we may split `TEXT_MODEL` / `VISION_MODEL` or test stronger multimodal models — **not in this branch**.

**Why this model:** Cost/capability balance for testing — text chat, reference image interpretation, and (future) canonical render screenshot evaluation.

**License:** Meta license requires a one-time `{ "prompt": "agree" }` request to the model endpoint. Document in errors; optional server-side retry is not required for v1.

**Local env:** Values live in `.env.local` (never commit). Placeholders only in `.env.example`.

---

## Endpoint

`POST /api/builder/chat`

### Request

```ts
{
  messages: { role: "user" | "assistant"; content: string }[];
  attachment: {
    type: "image";
    source: "user_reference";  // canonical_render reserved for future
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    dataBase64: string;          // raw base64, no data: URI prefix
    name: string;
  } | null;
}
```

**Constraints:**

- One image per request (current user turn only)
- MIME: png, jpeg, webp
- Max decoded size 4 MB (dev testing band ~2–4 MB)
- Dev guardrails: max 20 messages / 10k total text per request; disable Send while pending; friendly 429/upstream errors (not production rate limiting)
- No storage, R2, persistence, or image logging
- No secrets in browser

### Response

**Text-only (streaming):** `text/event-stream` with builder SSE events:

- `event: chunk` — `{ text: string }` (incremental assistant text)
- `event: done` — `{ model: string }`
- `event: error` — `{ error: string; code: string }`

Server sends `stream: true` to Workers AI (`messages` only, no `image`). If upstream returns JSON instead of SSE, the route emits one chunk + `done` as a fallback.

**Image reference (non-streaming):** JSON `{ message: string; model?: string }` — vision requests use `stream: false` because multimodal image+text streaming is not relied on in this branch.

**Errors (JSON or SSE):** `{ error: string; code?: "CONFIG" | "UPSTREAM" | "VALIDATION" | "LICENSE" }`

---

## Workers AI payload

Server-only REST:

```http
POST https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{WORKERS_AI_MODEL}
```

- **Text-only:** `{ messages, max_tokens, stream: true }` → SSE from Workers AI, proxied to browser
- **With image:** `{ messages, max_tokens, stream: false, image: "data:{mime};base64,..." }` (non-streaming JSON response)

Confirm via [Cloudflare model docs](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/) and Cursor Cloudflare plugin when debugging.

---

## System prompt (server-only)

- AI building assistant for Voxel Architect
- Preview is **static** — do not claim the building changed
- Can discuss attached **reference images** and translate visible features into building intent
- Semantic components: room, roof, door, window group, porch, chimney, step, materials, constraints
- No raw voxel coordinates; no direct block placement; no chain-of-thought

---

## UI (`/builder`)

- 3-column layout unchanged; preview static
- Send text and/or one image (local file picker, preview chip, remove before send)
- Text-only replies **stream** into the assistant bubble; image messages use full JSON response
- Send disabled while streaming; clear errors
- **Build activity:** mock checklist under assistant turn — not LLM reasoning

### Image UX

- Local preview only; no upload/R2/persistence
- png / jpeg / webp; 4 MB cap; one image per send
- `BuilderImageSource`: `user_reference` | `canonical_render` (only `user_reference` implemented)

---

## Files

**Create:** `src/app/api/builder/chat/route.ts`, `src/lib/builder/*`, `BuilderActivityCard.tsx`, `.env.example`

**Edit:** `BuilderClient.tsx`, `BuilderChatPanel.tsx`, `BuilderMessage.tsx`, `BuilderPromptInput.tsx`, `mockBuilderData.ts`, `docs/deployment/CLOUDFLARE.md`

---

## Out of scope

Blueprint generation, preview changes, v2 compiler, operations, Agents/DO, persistence, auth, R2, canonical renders, self-evaluation loop, AI Gateway, separate text/vision routes, image+text streaming.

---

## Success criteria

- [x] Text-only chat via Workers AI (streaming)
- [x] One image reference per message with same model (non-streaming JSON)
- [ ] Static preview unchanged
- [ ] Mock build activity; no secrets in client
- [ ] `tsc`, `lint`, `test:generator`, `build` pass

---

## Related docs

- [`docs/plans/AI_BUILDER_AGENT_ACTIVITY.md`](docs/plans/AI_BUILDER_AGENT_ACTIVITY.md)
- [`docs/deployment/CLOUDFLARE.md`](docs/deployment/CLOUDFLARE.md)
