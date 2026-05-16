# Voxel Architect — Vision & System Design

## Overview

Voxel Architect is an AI-powered conversational system for generating constraint-aware voxel architecture from prompts and images.

The project is inspired by Minecraft-style voxel building systems, but is intended as a broader exploration of AI-assisted spatial and architectural design.

Voxel Architect is being built as a Stanford CS 153: Frontier Systems project.

---

# Core Idea

Voxel Architect allows users to:

- describe structures conversationally
- upload reference images for inspiration
- iteratively refine designs
- generate voxel-based architectural representations
- visualize structures interactively in 3D
- understand how real-world architectural ideas translate into constrained voxel systems

The system is not intended to perform perfect 3D reconstruction.

Instead, it acts as an intelligent translation system between:

- human intent
- visual inspiration
- architectural features
- voxel constraints

---

# Long-Term Product Vision

The long-term goal is to create a conversational architectural design assistant capable of:

1. Understanding prompts and visual references
2. Translating them into structured architectural plans
3. Generating buildable voxel representations
4. Explaining simplifications and tradeoffs
5. Supporting iterative conversational refinement

Example prompts:

- "Generate a gothic cathedral inspired by Notre Dame."
- "Make it taller and darker."
- "Simplify this for survival-mode Minecraft."
- "Use more fantasy-inspired materials."

---

# Why This Is Interesting

Most AI generation systems produce:

- images
- meshes
- concepts

Voxel Architect instead focuses on:

- constrained systems
- discrete geometry
- buildability
- architectural abstraction
- interactive refinement

The system demonstrates how AI can:

- reason about constraints
- simplify complex structures
- produce actionable outputs
- bridge creativity and engineering

---

# Product Principles

## 1. Constraint-Aware Generation

The system should understand:

- voxel limitations
- scale limitations
- material constraints
- architectural approximation

Example:

"This curved detail cannot be represented directly, approximating with stair blocks."

---

## 2. Conversational Iteration

Users should refine structures naturally through dialogue.

The product should feel collaborative rather than one-shot.

---

## 3. Visual First

The project should prioritize:

- interactive visualization
- 3D previews
- camera controls
- layer views
- cutaway views

before advanced AI features.

---

## 4. Structured Generation

AI models should generate **structured blueprint intent**—dimensions, materials, openings, massing, and someday floor-plan / interior semantics—not raw per-voxel placement lists.

Procedural **generators** should turn validated blueprints into **`VoxelBlock[]`** (including partial shapes such as **panes** where the pipeline supports them). That separation keeps outputs **deterministic**, **testable**, and aligned with [`generation/GENERATOR_RELIABILITY.md`](generation/GENERATOR_RELIABILITY.md).

**Principle:** conversational AI may propose “add a forge room and storage zone” or “narrow glass windows” as **blueprint-level** requests (once interior schema exists for rooms); it should **not** normally emit **`{ x, y, z, blockTypeId }`** streams as the primary authoring path. See [`generation/GENERATION_DESIGN_PRINCIPLES.md`](generation/GENERATION_DESIGN_PRINCIPLES.md) §1.3–§1.4 for the AI boundary and future floor-plan note.

---

# Technical Architecture

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- App Router
- React Three Fiber
- Three.js
- drei

Frontend responsibilities:

- chat interface
- prompt input
- image upload
- 3D visualization
- camera controls
- layer/cutaway controls
- build previews

---

## Backend / Infrastructure

Planned infrastructure:

- Cloudflare Workers
- Workers AI
- R2
- Queues
- Vectorize

Additional services:

- Supabase (database/auth)
- Vercel (frontend hosting during MVP)

---

## AI Architecture

Planned AI orchestration:

- LangGraph
- Claude API
- Workers AI models
- vision-language models

AI responsibilities:

- prompt understanding
- architectural feature extraction
- blueprint generation
- simplification reasoning
- conversational refinement

---

# Rendering System

The voxel renderer should:

- support large structures efficiently
- eventually use InstancedMesh rendering
- support layer-by-layer rendering
- support cutaway views
- support material grouping
- support export formats

The renderer should remain deterministic and procedural whenever possible.

---

# Development Philosophy

## Build vertically

Prioritize complete vertical slices over scattered features.

Example:

Prompt → Blueprint → Voxels → 3D Preview

before:

- auth
- complex infra
- advanced agent systems

---

## Prefer deterministic systems

Use AI for:

- reasoning
- interpretation
- planning

Use code for:

- geometry
- rendering
- voxel placement
- exports

---

## Keep the MVP focused

The MVP goal is NOT:

- perfect architecture generation
- photorealism
- infinite structure support

The MVP goal IS:

- convincing conversational generation
- strong visual presentation
- interactive voxel previews
- constraint-aware reasoning

---

# MVP Milestones

## Milestone 1
Hardcoded voxel renderer with camera controls.

## Milestone 2
Prompt → structured blueprint generation.

## Milestone 3
Blueprint → procedural voxel generation.

## Milestone 4
Interactive chat refinement.

## Milestone 5
Image-guided generation.

## Milestone 6
Layer views / cutaway tools.

## Milestone 7
Persistence and saved builds.

---

## Interior exploration (future-facing)

Explorable **interiors** (walking inside generated buildings) depend on intentional voids, room structure, circulation, and eventually objects—those capabilities start as **blueprint-level floor-plan intent** and **generator-level realization**, not as raw voxel coordinate dumps from AI (see [`generation/GENERATION_DESIGN_PRINCIPLES.md`](generation/GENERATION_DESIGN_PRINCIPLES.md) §1.4).

---

# Future Possibilities

Potential future directions:

- Minecraft schematic export
- Roblox export
- procedural cities
- level design tools
- architectural concept generation
- collaborative building systems
- AI-assisted game environment generation

---

# Current Development Status

Implementation evolves on active Git branches; treat the repository as the source of truth for branch names and milestones.

**As of this documentation revision:**

- **Blueprints:** **`MedievalTowerBlueprint`** / JSON v1 exchange describe **semantic intent**, not voxel grids (`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`).
- **Generation:** Validated blueprints resolve to **`generateMedievalTower()`** → **`VoxelBlock[]`**; partial shapes include **cube / slab / pane / post**, with **pane** windows when the window material allows (**material metadata**).
- **Interiors:** Towers may use hollow shells and sparse interior floors; a **full floor-plan / room system** remains **future work** (see [`generation/GENERATION_DESIGN_PRINCIPLES.md`](generation/GENERATION_DESIGN_PRINCIPLES.md) §1.4).

Block-system follow-ups (connection-aware blocks, richer shapes, textures) are tracked separately in [`blocks/BLOCK_SYSTEM_BACKLOG.md`](blocks/BLOCK_SYSTEM_BACKLOG.md).

---

# Historical note

Earlier drafts of this file referenced a fixed branch name; branch strategy may change. Prefer **`git status`** / repo docs for the live branch.