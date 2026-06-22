# Bookish Product Specification (Marketing Source)

Last updated: 2026-06-22  
Scope: Current implemented product across `client/` and `server/` code.

---

## 1) Product Summary

Bookish is an AI-assisted long-form writing workspace for books.  
It combines:

- A public marketing + reading experience (`/`, `/explore`, `/read/[id]`)
- An authenticated author workspace (`/workspace`, `/book/[id]`)
- A FastAPI + LangGraph backend with human-in-the-loop approval
- Persistent project memory (chapters, assets, characters, world entities, artifacts)

Core promise:
- You provide the idea and direction.
- Agents help plan, draft, and maintain continuity.
- You approve before canonical writes are committed.

---

## 2) Primary User Segments

- **Solo author**: Wants help planning and drafting books faster.
- **Editorial lead / editor**: Wants consistency across chapters and canonical memory.
- **Content studio / team**: Wants repeatable workflows for multiple long-form projects.
- **Public reader**: Wants to browse and read published books.

---

## 3) User-Facing Surfaces

### Public

- `/` Home page (marketing + prompt entry + conversion sections)
- `/explore` Public shelf of books
- `/read/[id]` Public reader (chapter list + chapter content)
- `/login` Demo login page

### Authenticated

- `/workspace` Project dashboard (list/create/delete/open books)
- `/book/[id]` Book workspace with tabs:
  - Agent
  - Book
  - Memory
  - Settings

---

## 4) End-to-End Product Flows

### Flow A: New user to first project

1. User lands on `/`
2. Enters idea in hero composer
3. Redirected to `/login` if unauthenticated
4. After login, redirected to `/workspace?create=1&prompt=...`
5. Create modal opens prefilled with prompt
6. User creates project and lands in `/book/[id]`

### Flow B: Existing user project lifecycle

1. User opens `/workspace`
2. Sees projects, status, and metadata
3. Opens project in `/book/[id]`
4. Uses Agent tab to generate plan/drafts
5. Approves/rejects proposed writes
6. Views manuscript in Book tab
7. Reviews canonical memory in Memory tab
8. Adjusts model routing in Settings tab

### Flow C: Public reading

1. Reader opens `/explore`
2. Chooses a book card
3. Reads published chapters on `/read/[id]`

---

## 5) Feature Inventory (Frontend)

## 5.1 Auth and access

- Demo auth using hardcoded credentials (`demo` / `bookish`)
- Session persisted in localStorage
- Route protection for `/workspace` and `/book/*`
- Redirect-preserving login flow (`?redirect=...`)
- Public nav + authenticated nav states

## 5.2 Project dashboard and creation

- Project listing with metadata and loading/error/empty states
- Create project modal with:
  - title
  - genre
  - brief
  - optional `.txt`/`.md` file upload
- Deep-link creation from prompt funnel (`create=1`, `prompt=...`)
- Delete project action with confirmation
- Refresh projects action

## 5.3 Agent workspace

- Streaming chat UI with user + assistant messages
- Quick prompt suggestions
- Live status/checkpoint updates
- HITL approval UI (approve/reject) for write proposals
- Artifact preview panel and document preview
- Thread list, create new thread, switch thread

## 5.4 Manuscript and chapters

- Book outline (front matter, body chapters, back matter)
- Chapter status badges (draft/published/completed, etc.)
- Paginated manuscript-style chapter rendering
- Word count and page navigation
- Static front/back matter pages
- Glossary section from memory entities
- References section from uploaded assets

## 5.5 Memory and canon

- Memory tab with:
  - Sources timeline
  - Project knowledge
- Knowledge display for:
  - project voice
  - characters
  - world entities
  - chapter content
- Selected item preview panel

## 5.6 Settings and model routing

- Per-project model configuration for:
  - planner model
  - writer model
  - world builder model
- Provider support in UI:
  - Ollama
  - Gemini
  - Claude
  - OpenAI
  - OpenRouter
  - Sarvam
  - Nvidia
  - Custom endpoint

## 5.7 Public shelf and marketing

- Marketing home with hero + conversion sections
- Explore page with compact book grid
- Public reader with left chapter TOC and center content
- Demo showcase books + API-backed published books
- Footer/navigation components shared across public routes

---

## 6) Feature Inventory (Backend + API)

## 6.1 Project APIs

- `GET /api/projects` list project summaries
- `POST /api/projects` create project + initial brief asset
- `GET /api/projects/{id}` unified workspace payload
- `DELETE /api/projects/{id}` hard delete project and related data

## 6.2 Settings and artifacts APIs

- `GET /api/projects/{id}/settings`
- `POST /api/projects/{id}/settings`
- `GET /api/projects/{id}/artifacts/{artifact_id}`

## 6.3 Asset APIs

- `POST /api/projects/{id}/assets`:
  - JSON text assets
  - multipart uploads for markdown/text files

## 6.4 Chat thread APIs

- `GET /api/projects/{id}/chat-threads`
- `POST /api/projects/{id}/chat-threads`
- `GET /api/projects/{id}/messages`
- `DELETE /api/projects/{id}/chat-threads/{thread_id}/messages`

## 6.5 Agent APIs

- `POST /api/agent/threads` create agent thread
- `POST /api/agent/threads/{thread_id}/runs/stream` SSE streaming run + HITL resume

---

## 7) Core Data Domains

- **Projects**: metadata, settings, status, summary fields
- **Chapters**: number, title, content, summary, status, word count
- **User assets**: prompts/guidelines/source material
- **Character bible**: canonical character entries
- **Entity/world bible**: locations/objects/orgs/concepts
- **Artifacts**: run outputs and draft artifacts
- **Chat messages**: per-thread conversation log
- **Agent runs**: run-level execution trace
- **Vector index (Chroma)**: semantic retrieval over project knowledge
- **LangGraph store/checkpoints**: run state + episodic/callback memory

---

## 8) AI/Agent Capabilities

- Intent classification routes each message to specialist path
- Specialist paths:
  - planner
  - writer
  - world builder
- Tooling available to agents:
  - semantic search over project data
  - exact record reads
  - note recall and note persistence
- HITL write flow:
  - propose write
  - interrupt for approval
  - commit only on approve
  - emit project update event after commit

---

## 9) Product Differentiators (For Positioning)

- **Long-form memory-first workflow** (not just one-off text generation)
- **HITL approvals before canon writes** (editorial control)
- **Multi-agent specialist architecture**
- **Integrated manuscript + memory + settings in one workspace**
- **Public shelf + reader loop for published chapters**
- **Bring-your-own-model routing per specialist**

---

## 10) Current Commercial/Packaging Signals

Homepage currently presents plan framing for:
- Starter
- Pro
- Studio

Use these as marketing placeholders unless billing is implemented.

---

## 11) Claims Guardrails (Important for Marketing)

Use these confidently:

- AI-assisted planning and drafting
- Story memory across characters, worlds, and plot threads
- Human approval loop for writes
- Public reading experience for published content
- Per-agent model configuration

Use cautiously or label as roadmap if mentioned:

- Team collaboration (UI messaging exists; full team product not complete)
- Billing/subscription checkout (pricing marketing exists; checkout not implemented)
- PDF export (mentioned in copy, no complete user flow in current UI)
- Full production auth/multi-tenant security (current auth is demo/local)

---

## 12) Messaging Building Blocks (Feature -> Benefit)

### Prompt-to-project funnel
- Feature: Hero prompt -> prefilled create modal
- Benefit: Faster time-to-first-chapter

### Persistent story memory
- Feature: Memory tab + structured canon domains
- Benefit: Fewer continuity breaks across long manuscripts

### HITL approvals
- Feature: approve/reject write proposals before commit
- Benefit: Editorial control remains with human authors

### Specialist routing
- Feature: planner/writer/world-builder separation + model routing
- Benefit: Better quality per task type

### Public shelf
- Feature: explore + read pages powered by published chapter state
- Benefit: Built-in distribution surface for finished work

---

## 13) Suggested Marketing Guide Topics (Derived from Product)

1. Prompt-to-book onboarding guide
2. Story memory and continuity guide
3. HITL editorial workflow guide
4. Long-form chapter production guide
5. Public publishing and reader journey guide
6. Model routing optimization guide
7. Solo author vs team studio use-case guide

---

## 14) Source Notes

This file is based on current code in:
- `client/app/*`, `client/features/workspace/*`, `client/components/*`
- `server/app/api/*`, `server/app/agent/*`, `server/app/repositories/*`, `server/app/schemas/*`

It is intended as a stable internal source for:
- Marketing pages
- Sales collateral
- Positioning docs
- Feature launch narratives
