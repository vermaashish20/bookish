# Bookish — Agent Architecture

Authoritative reference for the Bookish multi-agent system. Update this file when changing graph topology, agent roles, tool schemas, or HITL behavior.

---

## 1. Graph Overview

```
START
  → load_store_memory
  → planner
  → execute_next ──┬→ writer
                   └→ world_builder
                         ↓
                   persist_memory
                         ↓
                   approve_write? → commit_write
                         ↓
                   execute_next → END
```

| Component | Path |
|-----------|------|
| Graph entry / router | `app/agent/agent.py` |
| State definition | `app/agent/utils/state.py` |
| Agent nodes | `app/agent/utils/nodes/` |
| Tools | `app/agent/utils/tools.py` |
| Context builder | `app/agent/utils/context_schema.py` |
| Prompts (source of truth) | `app/prompts/` |

---

## 2. Agents

### Planner

- Receives the user message + lightweight project context + store memory
- Decides: direct reply (fast path) or task delegation (specialist path)
- If delegating: decomposes the request into an ordered task list → HITL interrupt for plan approval
- Tools: `search_project`, `read_project`

### Writer

- Receives a single delegated task from the planner
- Reads existing chapters and project knowledge via tools
- Drafts or revises prose
- Proposes `chapter_create` or `chapter_update` via HITL before any Mongo write
- Tools: `search_project`, `read_project`, `save_artifact`

### World Builder

- Receives world-building tasks from the planner
- Uses tools to read existing canon and check for duplicates
- Creates or updates characters, entities, and lore
- Saves world-building artifacts; durable memory writes go through HITL
- Tools: `search_project`, `read_project`, `save_artifact`, `propose_memory_update`

---

## 3. Workflows

### Chat (direct reply)
```
message → load_store_memory → planner → direct response stream → finalize
```
Used when the planner classifies the message as a simple question or conversational reply.

### New chapter
```
message → planner (delegates writer task) → writer (reads context, drafts prose)
        → propose chapter_create → HITL → commit_write → sync_event → finalize
```

### Revise chapter
```
message → planner (delegates writer task with chapter reference)
        → writer (reads chapter via read_project tool, drafts revision)
        → propose chapter_update → HITL → commit_write → sync_event → finalize
```

### World bible / character creation
```
message → planner (delegates world_builder task)
        → world_builder (reads canon, builds artifact)
        → propose_memory_update → HITL → save_approved_memory → sync_event → finalize
```

### HITL resume
```
POST /api/agent/threads/{thread_id}/runs/stream  { "command": { "resume": "approve" | "reject" } }
→ graph continues from LangGraph checkpoint
```

---

## 4. Tool Access by Agent

| Agent | Primary Reads | Primary Writes |
|-------|-------------|---------------|
| Planner | summaries, high-level memory, plot | planner decision |
| Writer | narrative, characters, world, plot, continuity, style | draft artifact, chapter |
| World Builder | characters, world, entities, continuity | proposed/approved memory |

All tools are backed by the Knowledge Base layer (`app/knowledge/`). Agents never call Mongo or Chroma directly.

---

## 5. Tool Schemas

Tools are bound to agents as typed LangChain tools. Current tools:

| Tool | Description |
|------|-------------|
| `search_project` | Semantic search over project knowledge (Chroma `project_knowledge`) |
| `read_project` | Exact Mongo reads — chapters, assets, characters, entities |
| `save_artifact` | Persist a run output as an artifact |
| `propose_memory_update` | Propose a durable write (triggers HITL) |

### Tool design rules

- Tools are narrow and named by purpose
- Typed arguments — avoid vague string commands
- Tool output includes result, status, source metadata
- Destructive or durable writes require HITL confirmation
- Every tool call is logged to Langfuse

---

## 6. State Schema (`BookishAgentState`)

Key fields (see `app/agent/utils/state.py` for the full typed definition):

```python
messages          # LangGraph messages list (conversation + tool calls)
project_id        # Bookish project ID
context           # BookishContext (project metadata, book summary, memory brief)
task_queue        # Ordered list of specialist tasks from the planner
current_task      # Task being executed
artifacts         # Artifacts created in this run
hitl_payload      # Pending HITL proposal (type + content)
store_memory      # Loaded from LangGraph store (cross-run memory brief)
```

---

## 7. HITL Policy

| Write | Policy |
|-------|--------|
| Chapter draft | Auto-save as draft |
| Character / entity / world fact | HITL — interrupt → approve before Mongo write |
| Artifact | Auto-save |
| Agent event / run log | Auto-save |

**Implementation:** `interrupt()` inside node → graph suspends at checkpoint → client sends `Command(resume=...)` → graph continues → KB layer writes Mongo → `sync_event` SSE → background Chroma index update.

Pending approvals survive server restart because the graph state is persisted in MongoDB via LangGraph checkpointer.

---

## 8. Streaming Contract

The agent endpoint streams LangGraph v2 stream parts over SSE. Frontend events:

| Event | Trigger | Frontend action |
|-------|---------|----------------|
| `chat_message` | Token from model | Append to chat |
| `document_stream` | Long artifact/chapter | Show in preview panel |
| `agent_status` | Node transitions | Update status indicator |
| `user_confirmation` | HITL interrupt | Show approve/reject card |
| `sync_event` | Mongo write committed | Refresh book/memory tab |
| `done` | Run complete | Full project state reconciliation |
| `error` | Any failure | Show error message |

---

## 9. Memory Model

| Type | Storage | Lifetime | Purpose |
|------|---------|---------|---------|
| **Run state** | LangGraph checkpoint (MongoDB) | Per run | Task progress, HITL status, intermediate results |
| **Store memory** | LangGraph store | Cross-run per project | Memory brief loaded at run start |
| **Episodic / narrative** | MongoDB `chapters`, `artifacts`, `chat_messages` | Permanent | Source of truth for the book |
| **Formal canon** | MongoDB `character_bible`, `entity_bible` | Permanent (HITL-gated) | Characters, world entities |
| **Vector index** | Chroma `project_knowledge` | Derived (auto-rebuilt) | Semantic retrieval over all project content |

---

## 10. Knowledge Layer Architecture

Preferred call chain:
```
Agent tool call
  → app/knowledge/service.py   (business-level KB API)
  → app/repositories/          (Mongo CRUD)
  → app/infrastructure/vector/ (Chroma search + indexing)
```

Business-level KB operations (what agents should call):
- `search_knowledge(query, scopes, intent, max_results)`
- `read_chapter(chapter_id | chapter_number)`
- `read_character(name | id)`
- `read_world_entity(name | id)`
- `save_artifact(type, content, metadata)`
- `propose_memory_update(type, payload)`

Agents should never call `mongo_find`, `mongo_update`, or `chroma_query` directly.

---

## 11. Observability

All LLM calls and agent spans are traced via **Langfuse**. Each trace includes:
- Model name and provider
- Prompt version
- Token usage and cost
- Tool calls and results
- Run ID and project ID

To add a trace manually:

```python
from app.core.telemetry import langfuse_attributes, with_langfuse_callbacks
# see app/core/telemetry.py for helpers
```

---

## 12. Prompt Management

Prompts live in `app/prompts/` as Python modules — they are the source of truth. Do not edit agent behavior in docs or scattered strings.

Each prompt follows this structure:
```
ROLE
TASK
LIGHTWEIGHT STATE (project title, genre, tone, current chapter)
AVAILABLE KNOWLEDGE TOOLS (with retrieval policy)
RETRIEVAL POLICY (when to retrieve, budget, what to do on miss)
OUTPUT CONTRACT (schema, what not to expose)
```

---

## 13. Future Roadmap (Known Gaps)

- Split `project_knowledge` Chroma collection into typed scopes: `narrative`, `characters`, `world`, `timeline`, `style`, `assets`
- Add retrieval grading loop (relevance scoring + query rewrite)
- Add `retrieval_logs` collection for debugging missed context
- Expose business-level KB tools (`search_knowledge` with scopes) instead of generic `search_project`
- Strengthen editor prompts with active style/continuity retrieval instead of state handoff only
- Separate `entity_bible` into `characters`, `locations`, `organizations`, `objects`, `world_facts`
