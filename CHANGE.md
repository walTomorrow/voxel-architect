# Change report — Builder v2 refinement layer

## Branch

`feature/builder-agent-tools` (refinement extension)

## Scope

Deterministic semantic edits on an active v2 blueprint: client stores full `activeBlueprint`, POSTs it on refinement turns, server maps phrases to `setMaterialPalette` / `updateComponent`, validates, and regenerates. No LLM-authored operations, no add/remove components, no persistence.

## Behavior

- **Refinement intent** (e.g. “make it taller”, “dark wood roof”, “more windows”, “deeper porch”): JSON chat response with `toolResult.toolKind: "refine"`; preview updates only when `toolResult.ok`.
- **Strong create** (e.g. “make me a workshop”) with an active blueprint: replaces build via existing generate path.
- **Wider porch**: unsupported — clear error, preview unchanged.
- **More windows**: front/primary `window_group` only.
- **`POST /api/builder/refine`**: standalone debug endpoint; `/api/builder/chat` calls the same `refineBuildingPreview` in-process.
- **Normal chat**: SSE streaming unchanged.

## Files created (refinement)

- `src/lib/builder/blueprintOperationsV2.ts` — operation types
- `src/lib/builder/blueprintComponentIndex.ts` — component lookup helpers
- `src/lib/builder/applyBlueprintOperationsV2.ts` — pure apply + clamp
- `src/lib/builder/mapRefinementPromptToOperations.ts` — phrase → operations
- `src/lib/builder/shouldRunRefinementTool.ts` — refinement + strong-create gates
- `src/lib/builder/refineBuildingPreview.ts` — map → apply → validate → generate
- `src/lib/builder/parseCurrentBlueprint.ts` — request blueprint validation
- `src/app/api/builder/refine/route.ts` — debug refine endpoint
- `src/lib/builder/__tests__/shouldRunRefinementTool.test.ts`
- `src/lib/builder/__tests__/mapRefinementPromptToOperations.test.ts`
- `src/lib/builder/__tests__/applyBlueprintOperationsV2.test.ts`
- `src/lib/builder/__tests__/refineBuildingPreview.test.ts`

## Files updated (refinement)

- `src/lib/builder/builderToolTypes.ts` — unified `BuilderToolResult` with `toolKind`
- `src/lib/builder/runBuilderChatTurn.ts` — refine → generate → stream orchestration
- `src/app/api/builder/chat/route.ts` — refinement branch
- `src/lib/builder/validateChatRequest.ts` — parse `currentBlueprint`
- `src/lib/builder/builderChatTypes.ts` — `currentBlueprint` on request body
- `src/lib/builder/formatToolResultForModel.ts` — refine vs generate context
- `src/lib/builder/builderSystemPrompt.ts` — refinement instructions
- `src/app/builder/mockBuilderData.ts` — `activeBlueprint` state
- `src/app/builder/BuilderClient.tsx` — store/resend blueprint, tool routing UX
- `src/app/builder/components/BuilderChatPanel.tsx` — header copy

---

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
