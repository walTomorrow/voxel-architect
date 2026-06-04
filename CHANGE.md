# Change report — Builder agent tools (deterministic bridge)

## Branch

`feature/builder-agent-tools`

## Scope

Connect `/builder` chat to the existing deterministic v2 preset → validate → generate pipeline. Server controls when the tool runs and which preset is used; the model only summarizes tool results. No Cloudflare Agents, D1, R2, or LLM-authored blueprint JSON.

## Behavior

- **Generation intent** (e.g. “make me a small stone cottage”): non-streaming JSON chat response with `toolResult`; preview updates only when `toolResult.ok`.
- **Normal chat**: existing SSE streaming unchanged.
- **Image-only** prompts: chat-only (no tool) unless text includes generation verbs.
- **`modify_current`**: returns a clear not-available-yet error via `POST /api/builder/generate` or tool path.

## Files created

- `src/lib/blueprints/clonePresetBlueprint.ts` — v2 preset clone helper
- `src/lib/builder/builderToolTypes.ts` — tool request/result types
- `src/lib/builder/shouldRunGenerationTool.ts` — server intent gate
- `src/lib/builder/resolvePresetFromPrompt.ts` — keyword → v2 preset id
- `src/lib/builder/generateBuildingPreview.ts` — deterministic tool
- `src/lib/builder/builderActivityFromTool.ts` — real activity steps
- `src/lib/builder/formatToolResultForModel.ts` — tool context for Workers AI
- `src/lib/builder/runBuilderChatTurn.ts` — generation chat orchestration
- `src/app/api/builder/generate/route.ts` — standalone tool endpoint
- `src/lib/builder/__tests__/shouldRunGenerationTool.test.ts`
- `src/lib/builder/__tests__/resolvePresetFromPrompt.test.ts`
- `src/lib/builder/__tests__/generateBuildingPreview.test.ts`

## Files updated

- `src/app/api/builder/chat/route.ts` — generation turns → JSON + tool
- `src/lib/builder/builderSystemPrompt.ts` — tool result rules
- `src/lib/builder/builderChatTypes.ts` — `BuilderChatWithToolSuccessResponse`
- `src/lib/builder/mockBuilderActivity.ts` — chat-only activity alias
- `src/app/builder/mockBuilderData.ts` — v2 default preset, `generatedStructure`
- `src/app/builder/BuilderClient.tsx` — apply tool results to preview state
- `src/app/builder/components/BuilderPreviewPanel.tsx` — generated vs default preset
- `src/app/builder/components/BuilderWorkspace.tsx` — header copy, warnings prop
- `src/app/builder/components/BuilderActivityCard.tsx` — error step styling

## Preset mapping (server)

| User intent (keywords) | v2 preset |
|------------------------|-----------|
| workshop / forge / smith | `stone_workshop_v2` |
| porch / veranda | `porch_house_v2` |
| cottage / cabin / default | `simple_cabin_v2` |

## Verification

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:generator
pnpm run build
```

Manual: `/builder` → “Make me a small stone cottage” → preview updates, activity shows real steps; casual chat still streams.
