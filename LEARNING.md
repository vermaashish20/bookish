# Bookish — Engineering Learnings

Practical lessons from building the Bookish multi-agent writing platform. Use this as a reference before changing agent behavior, retrieval logic, prompts, or frontend streaming.

---

## 1. Knowledge Architecture

Bookish has more than one knowledge surface. Agents must understand the difference — "knowledge base" is not a single black box.

| Surface | Storage | Best For | Agent Behavior |
|---------|---------|----------|---------------|
| Source assets | MongoDB `user_assets` | Initial brief, plot, outlines, uploaded docs | Exact-read first when user asks about original/source material |
| Formal memory | MongoDB `character_bible`, `entity_bible` | Promoted characters, locations, orgs, world facts | Use exact reads for known records and duplicate checks |
| Narrative | MongoDB `chapters` + Chroma index | Chapter text, summaries, story-so-far continuity | Exact-read known chapters; semantic search for targeted passages |
| Artifacts | MongoDB `artifacts` + Chroma index | Agent outputs, drafts, research notes | Search when previous agent outputs matter |
| RAG index | Chroma `project_knowledge` | Small chunks, semantic lookup, targeted facts | Not the only source for whole uploaded documents |

The KB layer (`app/knowledge/`) hides raw database details behind agent-facing tools. Agents should not call Mongo or Chroma directly.

---

## 2. Retrieval Decisions

Pick retrieval based on the shape of the question:

| User Need | Preferred Tool | Why |
|-----------|---------------|-----|
| "What did I upload?" | Persistent read/list | User wants exact source material, not a semantic guess |
| "What is the initial plot?" | Persistent source read | Initial plot may be long and unpromoted |
| "Who are the characters from my brief?" | Persistent source read first | Formal character count can be zero before promotion |
| "What did chapter 2 say?" | Exact chapter read | Known record, exact text needed |
| "Find where the cursed ledger was mentioned" | RAG semantic search | Targeted passage lookup |
| "Does this draft contradict canon?" | Persistent reads + RAG | Exact records first, semantic search for supporting passages |

**Key rule:** A zero count in formal memory means "not promoted yet," not "does not exist." Source assets may still contain canon.

---

## 3. Agent Prompting Lessons

- Prompts must name tools by **purpose**, not just by tool name. "Search assets" was not enough — agents need to know when persistent exact reads beat RAG.
- RAG should be framed as **semantic lookup over chunks**, not the full project memory.
- Persistent reads should be framed as **source-of-truth access to full records**.
- Planner direct answers should **preserve retrieved context**. Regenerating the answer from lightweight metadata can lose facts that were just retrieved.
- Agent nodes need the **same retrieval policy as the planner** — delegated tasks run in their own prompt context.
- Prompts should define role, task, lightweight state, available tools, retrieval policy, and output contract. Agents should not expose internal reasoning to the user.

---

## 4. Frontend and Artifact Lessons

- Chat responses and artifacts need **separate intent**. Short conversational confirmations stay in chat; long drafts, reports, bibles, and edited content belong in the preview/artifact flow.
- The backend should communicate **artifact intent explicitly** — the frontend should not infer from wording alone.
- Agents should decide from **user intent**, not only keywords like "create" or "write."
- The frontend treats **MongoDB project state as canonical** and uses SSE only for responsiveness. After a run completes, the `done` event triggers a full project state reconciliation.

---

## 5. SSE Event Contract

These are the public events the frontend relies on:

| Event | Purpose |
|-------|---------|
| `chat_message` | Assistant chat text (token stream) |
| `document_stream` | Long artifact/chapter/research preview |
| `agent_status` | Lightweight progress metadata |
| `user_confirmation` | HITL interrupt — approve/reject payload |
| `sync_event` | Mongo-derived UI update (chapter upserted, memory saved) |
| `done` | Final project state reconciliation snapshot |
| `error` | Failure with message |

Do not rely on wording inside `chat_message` to determine if an artifact should be shown — use explicit `document_stream` or `sync_event` signals.

---

## 6. HITL Write Policy

| Write Type | Policy |
|-----------|--------|
| Artifact draft / report | Auto-save |
| Chapter draft | Auto-save as draft |
| Character / entity / world fact | HITL required — interrupt + approve before Mongo write |
| Timeline / agent event | Auto-save |

HITL flow: agent proposes write → `interrupt()` suspends the graph → client shows approval UI → `Command(resume=...)` continues → KB layer writes to Mongo → SSE `sync_event` updates the frontend → Chroma index updated in background.

---

## 7. Architecture Principles

### Knowledge layer (do this)
```
Agent → Knowledge Layer → MongoDB + ChromaDB
```

### Direct DB access (avoid this)
```
Agent → MongoDB directly
Agent → ChromaDB directly
```

Raw DB tools put schema burden and unsafe write power on the LLM. The KB layer owns retrieval, ranking, permissions, source tracking, chunking, and context assembly.

### Retrieval standard

Use the production pattern:

```
lightweight base context
+ LLM-selected retrieval tools
+ retrieval grading
+ query rewrite loop
+ hard budgets
+ retrieval logs
```

Recommended budgets:
- Normal agents: max 2 retrieval rounds
- Researcher / continuity-heavy editor: max 3 rounds
- Max 5 documents per tool call
- Log every query, result, score, and selected source

---

## 8. Known Gaps (as of last update)

- Chroma collections are too broad (`project_knowledge` mixes entities, assets, research, and facts).
- Retrieval tools (`search_project`, `read_project`) are not business-level enough — should expose named KB operations.
- No retrieval grading loop yet.
- No retrieval log collection yet.
- Editor mostly relies on state handoff instead of active style/continuity retrieval.
- Style guide exists as a vector collection but is not strongly enforced in writer/editor prompts.
- `entity_bible` is doing too much — locations, objects, organizations, and world facts should become distinct collections.

---

## 9. Agentic System Fundamentals

### State vs Memory vs Knowledge

```
State   = current run (what is happening right now)
Memory  = persistent learning (what survives across runs)
Knowledge = external truth source (documents, DB records)
```

### Context engineering rule

> Agent quality often depends more on context quality than raw model quality.

Always ask before adding to context:
- Is this information needed now?
- Is it trustworthy and recent?
- Is it specific enough, or should it be retrieved later?

### Common context failures

- Too much irrelevant history
- Missing business rules
- Retrieved chunks with no source metadata
- Tool output copied in full when a summary is enough
- No distinction between facts, guesses, and instructions

### HITL design questions

Before any autonomous write, ask:
- Who approves?
- What exactly do they see?
- Can they edit the proposal?
- Is the approval logged?
- What happens if nobody responds?

### Production anti-patterns to avoid

- Building an agent when a deterministic workflow is enough
- Putting all business logic in prompts
- Giving agents direct database access without a knowledge layer
- No evals, no trace logs, no retry limits
- No structured state
- Treating vector search as magic
- Multi-agent architecture when one agent would work
- Deploying before defining success metrics
