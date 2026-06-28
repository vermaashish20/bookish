# Bookish — Product Specification

Last updated: 2026-06-28
Scope: Current implemented product across `client/` and `server/`.

---

## 1. Product Summary

Bookish is an AI-assisted long-form writing workspace for books. It combines:

- A public marketing + reading experience (`/`, `/explore`, `/read/[id]`)
- An authenticated author workspace (`/workspace`, `/book/[id]`)
- A FastAPI + LangGraph backend with human-in-the-loop approval
- Persistent project memory (chapters, assets, characters, world entities, artifacts)
- Clerk-based authentication with per-user project isolation

Core promise:
- You provide the idea and direction.
- Agents help plan, draft, and maintain continuity.
- You approve before canonical writes are committed.

---

## 2. Primary User Segments

- **Solo author**: Wants help planning and drafting books faster.
- **Editorial lead / editor**: Wants consistency across chapters and canonical memory.
- **Content studio / team**: Wants repeatable workflows for multiple long-form projects.
- **Public reader**: Wants to browse and read published books.

---

## 3. User-Facing Surfaces

### Public

- `/` — Home page (marketing + prompt entry + conversion sections; personalized greeting when signed in)
- `/explore` — Public shelf of books
- `/read/[id]` — Public reader (chapter list + chapter content)
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/login` — Legacy alias, renders Clerk sign-in

### Authenticated

- `/workspace` — Project dashboard (list/create/delete/open books)
- `/book/[id]` — Book workspace with tabs:
  - **Agent** — Chat, HITL approval, artifact preview
  - **Book** — Manuscript, chapters, outline
  - **Memory** — Knowledge, characters, world entities
  - **Settings** — Per-agent model routing

---

## 4. End-to-End Product Flows

### Flow A: New user to first project

1. User lands on `/`
2. Signs up via Clerk → `user.created` webhook fires → default "My First Book" project provisioned
3. Enters idea in hero composer
4. Redirected to `/sign-in` if unauthenticated
5. After sign-in, redirected to `/workspace?create=1&prompt=...`
6. Create modal opens prefilled with prompt
7. User creates project and lands in `/book/[id]`

### Flow B: Existing user project lifecycle

1. User opens `/workspace` or sees projects directly below the hero (home page, authenticated)
2. Opens project in `/book/[id]`
3. Uses Agent tab to generate plan/drafts
4. Approves/rejects proposed writes
5. Views manuscript in Book tab
6. Reviews canonical memory in Memory tab
7. Adjusts model routing in Settings tab

### Flow C: Public reading

1. Reader opens `/explore`
2. Chooses a book card
3. Reads published chapters on `/read/[id]`

---

## 5. Feature Inventory — Frontend

### 5.1 Auth and access

- Clerk authentication (sign-in, sign-up, sign-out, UserButton in nav)
- `AuthProvider` wraps Clerk's `useUser`/`useClerk` — exposes `useAuth()` hook across the app
- `ClerkTokenSync` wires Clerk JWT into all API calls (Bearer token)
- Route protection via `RequireAuth` component redirecting to `/sign-in`
- Public nav with `Show when="signed-out"` / `Show when="signed-in"` Clerk components
- Workspace + explore links visible when signed in

### 5.2 Home page (authenticated state)

- Personalized hero heading with time-based greeting ("Good morning, [Username]")
- Prompt chips for quick project starts
- **Active workspaces** section — user's project cards with cover color, genre, chapter count, status
- **Get Inspired** section — public books grid with "Browse all" CTA

### 5.3 Project dashboard and creation

- Project listing with metadata and loading/error/empty states
- Create project modal: title, genre, brief, optional `.txt`/`.md` file upload
- Deep-link creation from prompt funnel (`create=1`, `prompt=...`)
- Delete project with confirmation
- Default project auto-created on signup via Clerk webhook

### 5.4 Agent workspace

- Streaming chat UI with user + assistant messages
- Quick prompt suggestions
- Live status/checkpoint updates via SSE
- HITL approval UI (approve/reject) for write proposals
- Artifact preview panel and document preview
- Thread list, create new thread, switch thread

### 5.5 Manuscript and chapters

- Book outline (front matter, body chapters, back matter)
- Chapter status badges (draft/published/completed)
- Paginated manuscript-style chapter rendering
- Word count and page navigation
- Glossary section from memory entities
- References section from uploaded assets

### 5.6 Memory and canon

- Memory tab: Sources timeline + Project knowledge
- Knowledge display for project voice, characters, world entities, chapter content
- Selected item preview panel

### 5.7 Settings and model routing

Per-project model configuration for planner, writer, and world builder. Provider support: Ollama, Gemini, Claude, OpenAI, OpenRouter, Sarvam, Nvidia, Custom endpoint.

### 5.8 Public shelf and marketing

- Marketing home with hero + six conversion sections
- Explore page with compact book grid
- Public reader with left chapter TOC and center content
- Demo showcase books + API-backed published books

---

## 6. Feature Inventory — Backend & API

### 6.1 Project APIs (auth-protected, user-scoped)

- `GET /api/projects` — list summaries for authenticated user
- `POST /api/projects` — create project (stores `userId` from Clerk JWT)
- `GET /api/projects/{id}` — unified workspace payload (ownership check)
- `DELETE /api/projects/{id}` — hard delete (ownership check)

### 6.2 Settings and artifacts APIs

- `GET /api/projects/{id}/settings`
- `POST /api/projects/{id}/settings`
- `GET /api/projects/{id}/artifacts/{artifact_id}`

### 6.3 Asset APIs

- `POST /api/projects/{id}/assets` — JSON text assets or multipart file uploads

### 6.4 Chat thread APIs

- `GET /api/projects/{id}/chat-threads`
- `POST /api/projects/{id}/chat-threads`
- `GET /api/projects/{id}/messages`
- `DELETE /api/projects/{id}/chat-threads/{thread_id}/messages`

### 6.5 Agent APIs

- `POST /api/agent/threads` — create LangGraph thread
- `POST /api/agent/threads/{thread_id}/runs/stream` — SSE streaming run + HITL resume

### 6.6 Webhook

- `POST /api/webhooks/clerk` — verified via Svix; `user.created` → provisions default project

---

## 7. Core Data Domains

- **Projects**: metadata, `userId`, settings, status, summary — `projects` collection
- **Chapters**: number, title, content, summary, status, word count — `chapters`
- **User assets**: prompts, guidelines, source material — `user_assets`
- **Character bible**: canonical character entries — `character_bible`
- **Entity/world bible**: locations, objects, orgs, concepts — `entity_bible`
- **Artifacts**: agent run outputs and drafts — `artifacts`
- **Chat messages**: per-thread conversation log — `chat_messages`
- **Agent runs**: run-level execution trace — `agent_runs`
- **Vector index**: semantic retrieval over project knowledge — ChromaDB `project_knowledge`
- **LangGraph checkpoints**: run state + episodic memory — MongoDB checkpointer

---

## 8. AI/Agent Capabilities

- Intent classification routes each message to specialist path (planner, writer, world builder)
- Planner decomposes requests into ordered task lists and delegates to specialists
- HITL write flow: propose → interrupt for approval → commit only on approve → emit project update
- Semantic search over chapters, characters, entities, style guides
- Per-project model routing (any provider/model per specialist)
- Langfuse tracing for all LLM and agent spans

---

## 9. Product Differentiators

- **Long-form memory-first workflow** (not just one-off text generation)
- **HITL approvals before canon writes** (editorial control stays with author)
- **Multi-agent specialist architecture** (planner + researcher + world builder + writer)
- **Integrated manuscript + memory + settings in one workspace**
- **Public shelf + reader** for published chapters
- **Bring-your-own-model routing** per specialist
- **Per-user project isolation** with Clerk JWT + user-scoped MongoDB queries

---

## 10. Claims Guardrails

**Use confidently:**
- AI-assisted planning and drafting
- Story memory across characters, worlds, and plot threads
- Human approval loop for writes
- Public reading experience for published content
- Per-agent model configuration
- Secure per-user authentication and project isolation (Clerk)

**Use cautiously / label as roadmap:**
- Team collaboration (UI messaging exists; full multi-tenant product not complete)
- Billing/subscription checkout (pricing UI exists; checkout not implemented)
- PDF export (mentioned in copy; no complete user flow)
