# Cloudflare Startup Program Notes for Project Development

## Current Situation

I have been approved for the Cloudflare for Startups program with:

* $100,000 in Cloudflare credits
* 1 year of access
* Credits applied automatically (not directly visible in dashboard)
* Billing attached to my personal credit card

Important:

* Services do NOT shut off automatically after credits expire
* After expiration, normal billing continues automatically to the attached payment method

---

# Main Goal

Use the Cloudflare ecosystem aggressively for learning and rapid development while ensuring:

* no accidental runaway costs
* no unexpected post-program charges
* no infrastructure overengineering

---

# Core Cloudflare Services Available

## Compute / Backend

### Workers

Serverless backend runtime.

Use for:

* APIs
* auth middleware
* orchestration
* lightweight backend logic
* AI routing
* edge compute

Benefits:

* globally distributed
* auto-scaling
* very low operational overhead
* request-based pricing

Implementation guidance:

* prefer Workers over managing servers whenever possible
* avoid long-running heavy compute inside Workers
* use stateless design when possible

---

## AI

### Workers AI

Hosted inference platform.

Use for:

* embeddings
* reranking
* text generation
* image generation
* speech models
* lightweight inference APIs

Important:

* $50k cap for Workers AI credits
* some partner/premium models may not be fully covered

Implementation guidance:

* start with open-source models
* cache responses aggressively
* generate embeddings once and reuse them
* avoid repeated inference on identical content
* add auth + rate limiting to public endpoints

Cost safety:

* never expose unrestricted public inference endpoints
* implement per-user quotas early
* log request counts

---

# Storage / Databases

## R2

S3-like object storage.

Use for:

* uploaded files
* PDFs
* datasets
* images
* logs
* checkpoints

Benefits:

* zero-egress-oriented pricing model
* integrates tightly with Workers

Important:

* $10k cap for R2 credits

Implementation guidance:

* use lifecycle cleanup for temporary files
* compress large uploads when possible
* avoid duplicate storage
* use signed URLs instead of proxying files through Workers

Potential cost risks:

* storing huge media archives
* repeated large downloads
* unbounded user uploads

---

## D1

SQLite-based serverless SQL database.

Use for:

* metadata
* user state
* project data
* lightweight relational data

Best for:

* moderate scale
* lightweight transactional workloads

Avoid:

* massive analytical workloads
* extremely write-heavy systems

---

## KV

Distributed key-value storage.

Use for:

* caching
* feature flags
* session state
* lightweight lookup tables

Implementation guidance:

* treat KV primarily as cache/config infrastructure
* avoid using KV as a primary relational database

---

## Vectorize

Vector database for embeddings + semantic search.

Use for:

* RAG
* semantic retrieval
* document search
* recommendation systems

Implementation guidance:

* batch embedding generation
* avoid regenerating embeddings unnecessarily
* cache retrieval results where possible

Potential cost risks:

* excessive embedding generation
* unnecessary re-indexing

---

# Frontend / Hosting

## Pages

Frontend deployment platform.

Use for:

* static frontend hosting
* React/Vue/Svelte apps
* documentation
* landing pages

Notes:

* `.pages.dev` URL is sufficient
* custom domain NOT required
* Enterprise domains are optional

---

# Enterprise Domains Clarification

Enterprise domains:

* are NOT free domain names
* apply only to domains I own
* are NOT required for Workers/AI/R2/etc.

I do NOT need:

* to buy a domain
* to configure nameservers
* to use enterprise plans

for normal project development.

`.pages.dev` deployments are sufficient.

---

# Biggest Cost Risks

## 1. Credits Expire Automatically

After 1 year:

* services continue running
* billing automatically charges attached card

Mitigation:

* calendar reminders:

  * 30 days before expiration
  * 7 days before expiration

---

## 2. Public AI Abuse

Most realistic runaway-cost scenario.

Danger:

* public endpoints
* inference spam
* bot abuse
* recursive requests

Mitigation:

* authentication
* rate limiting
* quotas
* request logging
* abuse monitoring

---

## 3. Infinite Background Loops

Danger:

* recursive queues
* workflows triggering themselves
* broken retry systems

Mitigation:

* max retry counts
* idempotency keys
* queue visibility logging
* dead-letter queues

---

## 4. Large Media Storage

Danger:

* huge uploads
* unlimited retention
* video-heavy systems

Mitigation:

* upload limits
* retention policies
* compression
* quotas

---

# Recommended Architecture Style

Prefer:

* serverless-first
* event-driven
* edge-native
* stateless APIs
* cached inference
* lightweight databases

Avoid:

* premature Kubernetes
* long-running servers
* unnecessary GPU infrastructure
* multi-cloud complexity early

---

# Recommended Development Strategy

## Phase 1 — Prototype Quickly

Use:

* Pages
* Workers
* D1
* KV
* R2

Goal:

* functional product quickly

---

## Phase 2 — Add AI + Retrieval

Use:

* Workers AI
* Vectorize
* R2 document storage

Goal:

* RAG/search/inference workflows

---

## Phase 3 — Operational Hardening

Add:

* auth
* quotas
* logging
* monitoring
* caching
* rate limiting

Goal:

* prevent abuse + runaway costs

---

# Operational Safety Checklist

## Immediately Configure

### Billing Alerts

Set very low thresholds initially:

* $5
* $20
* $50

---

## Protect Public APIs

Always add:

* auth
* rate limits
* quotas

Especially for:

* inference
* uploads
* scraping
* browser rendering

---

## Monitor Usage

Track:

* inference counts
* storage growth
* request rates
* queue volume

---

## Use Cleanup Policies

Automatically delete:

* temp files
* expired uploads
* stale embeddings
* unused artifacts

---

# Realistic Cost Expectations

For a student or early startup project:

* reaching $100k usage is extremely unlikely
* reaching $50k Workers AI cap is also unlikely

Most realistic danger:

* accidental abuse
* forgotten services after graduation
* public endpoints without rate limiting

---

# Key Insight

Cloudflare’s biggest advantage is integrated infrastructure:

* Workers
* AI
* Vector DB
* Storage
* Hosting
* CDN
* Security

all exist in one ecosystem.

This dramatically reduces:

* operational complexity
* egress costs
* deployment overhead
* infrastructure maintenance burden

For an early-stage project, this simplicity is often more valuable than micro-optimizing infrastructure pricing.

---

# Builder chat API (`/api/builder/chat`)

The `/builder` route uses a **Next.js Route Handler** (`src/app/api/builder/chat/route.ts`) that calls **Workers AI** over the REST API. Secrets stay server-side only.

**Environment variables** (see `.env.example`):

* `CLOUDFLARE_ACCOUNT_ID`
* `CLOUDFLARE_API_TOKEN` (Workers AI access)
* `WORKERS_AI_MODEL` (default `@cf/meta/llama-3.2-11b-vision-instruct`)

**Local:** `pnpm dev` with `.env.local` (never commit).

**Meta license:** First use of the vision model may require a one-time `{ "prompt": "agree" }` POST to the model run URL (documented in `.env.example`).

**Production on Pages:** Static-only Pages deploys do not run Next API routes until **OpenNext for Cloudflare** or a **Pages Function** is added. Local dev works with the Route Handler first.

**Not stored:** Reference images are sent inline per request only — no R2, no persistence.

---

# Final Practical Guidance

For now:

* build aggressively
* learn the ecosystem deeply
* optimize later

But:

* instrument usage early
* implement quotas early
* add billing alerts immediately
* remember credits expire automatically
