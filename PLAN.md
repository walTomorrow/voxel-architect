# PLAN — AI Builder UI Shell

## Summary

We are pivoting temporarily from deeper generator/compiler work toward a product-facing AI Builder interface.

The goal is to create a static/demo version of the eventual Voxel Architect AI workflow:

User starts a building chat → describes a building → sees a generated voxel preview → continues refining through conversation.

This branch should not implement real AI, Cloudflare integration, persistence, authentication, image processing, or GenericBuildingBlueprint v2. It should create the UI shell and mock interaction model that those systems can later connect to.

The result should feel like an actual AI building product, not a developer/debug lab.

Recommended branch name:

```bash
feature/ai-builder-ui-shell
```

## Product Goal

Create a ChatGPT-style building workspace where each conversation represents a different build.

The UI should support:

* starting a new building chat
* switching between mock build chats
* viewing a static generated building preview
* sending mock chat messages
* seeing canned assistant responses
* showing visual affordances for image attachment
* preserving future integration points for AI generation, blueprint operations, and persistence

The static preview should reuse an existing generic building preset and existing voxel viewer components where possible.

## Existing Context

Voxel Architect currently has:

* `/preview` for viewing generated structures
* `/generic-lab` for inspecting and editing generic building plans
* deterministic `generic_building` generation
* v1 generic building presets
* planned future `GenericBuildingBlueprint v2`
* planned future AI workflow:

  * prompt → structured blueprint
  * deterministic generation
  * conversational refinement

This branch should not rewrite those systems. It should create a new product-facing route that sits above them.

## Recommended Route

Create a new route:

```text
/builder
```

Rationale:

* Short and product-facing
* Clearer than `/ai-builder`
* Less developer-oriented than `/generic-lab`
* Can eventually become the main user entry point

Relationship to existing routes:

* `/preview` remains the technical preview/gallery route
* `/generic-lab` remains the developer/editing lab
* `/builder` becomes the product-facing AI interaction workspace

## Target UI Layout

The desired layout is similar to ChatGPT, adapted for voxel building generation.

### Desktop Layout

```text
┌───────────────────────────────────────────────────────────────┐
│ Left sidebar │ Main builder workspace                          │
│              │                                                 │
│ New build    │ ┌─────────────────────────────────────────────┐ │
│ Build chats  │ │ Header: build name / status / actions        │ │
│              │ ├─────────────────────────────────────────────┤ │
│              │ │                                             │ │
│              │ │ Large voxel building preview                 │ │
│              │ │                                             │ │
│              │ ├─────────────────────────────────────────────┤ │
│              │ │ Conversation messages                        │ │
│              │ │ Prompt input + image button                  │ │
│              │ └─────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Suggested Layout Choice

Use a left sidebar for build chats and a main workspace.

Inside the main workspace, use a vertical split:

1. top/primary area: voxel preview
2. lower/side area: conversation thread and input

Alternative acceptable layout:

* left sidebar: chats
* center: voxel preview
* right panel: conversation

Choose whichever fits the existing app styling better, but keep it product-facing and polished.

## UI Elements

### Sidebar

Should include:

* Voxel Architect / Builder branding
* “New build” button
* mock list of build chats
* selected chat highlight
* optional small metadata:

  * building type
  * last edited label
  * status such as “Draft” or “Preview ready”

Example mock chats:

* Cozy Stone Cottage
* Riverside Workshop
* Small Oak Cabin
* Empty New Build

### Main Workspace Header

Should include:

* selected build name
* short status text, e.g. “Static preview”
* optional actions:

  * Preview
  * Copy blueprint
  * Reset mock chat

These actions can be placeholders if needed.

### Preview Area

Should display a static generated building using an existing generic building preset.

Requirements:

* Reuse existing `VoxelViewer` or preview infrastructure where possible
* Do not create a new generator path
* Do not implement v2
* Do not make the preview depend on real AI output yet
* Use an existing preset such as `simple_rustic_cabin`

The preview should be visually dominant enough that this feels like a builder, not just a chat page.

### Conversation Panel

Should include:

* user and assistant message bubbles
* initial assistant greeting
* sample messages describing the build
* prompt input box
* send button
* image attach button or “add image” affordance
* visual placeholder for image input

Static behavior is enough.

### Input Behavior

For the static version:

* typing a message and pressing send should add a user message to local state
* the app may append a canned assistant response
* the preview does not need to change yet
* image button can be disabled, show a tooltip, or attach a fake placeholder object if simple

Example canned assistant responses:

```text
I can turn that into a structured building plan. For now, this demo keeps the preview static while we build the AI workflow.
```

```text
Got it — future versions will translate this request into blueprint edits and regenerate the voxel structure.
```

```text
I’ll eventually use this instruction to update the building components instead of placing blocks directly.
```

## Component Architecture

Recommended new files:

```text
src/app/builder/page.tsx
src/app/builder/BuilderClient.tsx
src/app/builder/mockBuilderData.ts
src/app/builder/components/BuilderSidebar.tsx
src/app/builder/components/BuilderWorkspace.tsx
src/app/builder/components/BuilderPreviewPanel.tsx
src/app/builder/components/BuilderChatPanel.tsx
src/app/builder/components/BuilderMessage.tsx
src/app/builder/components/BuilderPromptInput.tsx
```

Keep these components isolated under `/builder` for now.

Reuse existing components where practical:

```text
src/components/voxel/VoxelViewer.tsx
src/lib/blueprints/sampleGenericBuildingBlueprints.ts
src/lib/blueprints/validateBlueprint.ts
src/lib/generation/generateStructure.ts
```

Do not move or rewrite existing preview/lab components unless necessary.

## Mock Data Model

Create local mock types in `mockBuilderData.ts`.

Suggested shapes:

```ts
export type BuilderMessageRole = "user" | "assistant" | "system";

export interface BuilderMessage {
  id: string;
  role: BuilderMessageRole;
  content: string;
  createdAtLabel: string;
  attachments?: BuilderAttachment[];
}

export interface BuilderAttachment {
  id: string;
  type: "image";
  name: string;
  previewUrl?: string;
  status: "mock" | "pending" | "uploaded";
}

export interface BuilderChat {
  id: string;
  title: string;
  subtitle?: string;
  status: "empty" | "draft" | "preview_ready";
  presetId: string;
  messages: BuilderMessage[];
}
```

Future-facing optional fields:

```ts
blueprintId?: string;
blueprintVersion?: number;
lastOperationSummary?: string;
```

These fields should not require real functionality yet.

## Static Interaction Behavior

Implement these interactions:

1. Selecting a chat updates:

   * active chat
   * visible messages
   * header title
   * static preview label if applicable

2. New build button:

   * creates a local mock chat or selects a prebuilt empty chat
   * no persistence required

3. Sending a message:

   * adds a user message
   * clears the input
   * appends a canned assistant response
   * does not call a backend
   * does not change the generated preview

4. Image button:

   * visual affordance only
   * acceptable options:

     * disabled button with “Image input coming soon”
     * mock attachment chip
     * hidden file input with local-only preview, if easy
   * do not implement upload/backend storage

5. Reset:

   * optional
   * can restore active mock chat messages

## Visual Direction

The route should feel:

* polished
* product-facing
* focused on creation
* inspired by chat-based AI tools
* clearly connected to voxel building generation

Avoid:

* raw JSON as the main experience
* dense developer controls
* exposing ComponentPlan internals
* making this look like `/generic-lab`

Use existing Tailwind conventions and no new styling dependencies unless absolutely necessary.

Suggested copy:

```text
Build with conversation
Describe a structure, refine it step by step, and preview the generated voxel building.
```

```text
Static preview
This UI shell uses a fixed generic building preset while AI generation is being connected.
```

```text
Image input coming soon
Future versions will let you attach references for style and layout guidance.
```

## Future Integration Points

Design the files and types so future work can plug in:

### Cloudflare Workers AI

Future endpoint:

```text
POST /api/blueprint/generate
```

Purpose:

```text
prompt → GenericBuildingBlueprint candidate
```

### Refinement Operations

Future endpoint:

```text
POST /api/blueprint/refine
```

Purpose:

```text
current blueprint + user instruction → BlueprintOperationV2[]
```

### Validation and Repair

Future flow:

```text
model output
→ validateBlueprint()
→ if invalid, ask model to repair or show validation issue
→ generateStructure()
→ update preview
```

### Persistence

Future storage:

* chats
* messages
* blueprint versions
* generated previews
* image attachments

Likely later options:

* D1 for build/chat metadata
* R2 for image uploads
* KV for lightweight cache
* Vectorize only if retrieval/document memory is needed

### Image Input

Future image flow:

```text
user attaches reference image
→ store in R2
→ model receives image/reference metadata
→ generated or refined blueprint reflects visual intent
```

No part of this should be implemented in this branch.

## Implementation Phases

### Phase A — Static route and layout shell

Create `/builder` route.

Deliverables:

* page loads successfully
* left sidebar exists
* main workspace exists
* placeholder preview panel exists
* placeholder chat panel exists

No generator connection required yet.

### Phase B — Mock chat/build state

Deliverables:

* mock build chats
* selected chat state
* New build behavior
* message list rendering
* prompt input local state
* send message appends local user message
* canned assistant response appears

### Phase C — Connect static preview to existing preset

Deliverables:

* use existing generic building preset
* validate/generate structure using existing pipeline
* render with existing `VoxelViewer`
* handle validation/generation errors gracefully

Do not add new generator features.

### Phase D — Polish product experience

Deliverables:

* better empty states
* better sample conversations
* selected chat styling
* status labels
* image input placeholder
* responsive behavior

### Phase E — Prepare future interfaces

Deliverables:

* clear mock types
* comments showing where real AI calls will plug in
* no actual backend
* no Cloudflare integration yet

## Scope Control

Do not implement:

* real AI calls
* Cloudflare Workers
* authentication
* database persistence
* real upload/storage
* image understanding
* GenericBuildingBlueprint v2
* operation application
* blueprint version history
* import/export
* major generator changes

Do not remove or rewrite:

* `/preview`
* `/generic-lab`
* v1 generic building presets
* existing generator pipeline

Only touch shared files if required for safe reuse.

## Likely Files to Create

```text
src/app/builder/page.tsx
src/app/builder/BuilderClient.tsx
src/app/builder/mockBuilderData.ts
src/app/builder/components/BuilderSidebar.tsx
src/app/builder/components/BuilderWorkspace.tsx
src/app/builder/components/BuilderPreviewPanel.tsx
src/app/builder/components/BuilderChatPanel.tsx
src/app/builder/components/BuilderMessage.tsx
src/app/builder/components/BuilderPromptInput.tsx
```

## Likely Files to Edit

Possibly:

```text
src/app/page.tsx
```

Only edit this if adding a homepage link to `/builder` is simple and consistent.

Possibly:

```text
src/app/preview/page.tsx
src/app/generic-lab/page.tsx
```

Avoid editing unless adding lightweight navigation links makes sense.

## Design Decisions to Approve Before Implementation

Before implementing, confirm:

1. Route name:

   * recommended: `/builder`

2. Layout:

   * recommended: left sidebar + main preview/chat workspace

3. Preview behavior:

   * recommended: fixed `simple_rustic_cabin` or current default generic preset

4. New build behavior:

   * recommended: local-only mock chat

5. Image behavior:

   * recommended: visual placeholder only

6. Whether to add homepage navigation:

   * recommended: add a simple “Open Builder” link if the homepage currently has project navigation

## Validation Commands

After implementation, run:

```bash
pnpm lint
pnpm test:generator
pnpm exec tsc --noEmit
pnpm run build
```

## Success Criteria

This branch is successful when:

* `/builder` exists
* the UI looks like a real AI building workspace
* users can switch between mock build chats
* users can send mock messages
* the page shows a static voxel building preview
* existing `/preview` and `/generic-lab` still work
* no real AI/backend/persistence has been added
* validation commands pass

## Final Note

This UI shell is intentionally a bridge between the current deterministic generator and the future AI workflow.

It lets us demo the product vision now while continuing to build the underlying blueprint compiler and AI operation system in later branches.
