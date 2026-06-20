# Agent orchestration

## Graph

```text
START → planner → should_continue_tasks ─┬→ researcher ─┐
                                         ├→ world_builder ┤
                                         ├→ writer ────────┤→ … → finalize → END
                                         └→ editor ────────┘
```

| Component | Path |
|-----------|------|
| Graph / router | `app/agent/agent.py` |
| State | `app/agent/utils/state.py` |
| Nodes | `app/agent/utils/nodes/` |
| Tools | `app/agent/utils/tools.py` |

## Agents

`planner`, `researcher`, `world_builder`, `writer`, `editor`.

**Prompts (source of truth):** `app/prompts/*.py`

| Module | Role |
|--------|------|
| `planner.py` | Plan or direct reply |
| `researcher.py` | RAG + research report |
| `world_builder.py` | Character / entity JSON |
| `writer.py` | Prose draft |
| `editor.py` | Continuity, tone, polish + publish |

Tools are exposed through `app/agent/utils/tools.py` and backed by the project knowledge service.

## Workflows

**Chat:** message → planner → (HITL plan approval) → specialists → finalize.

**Typical chapter chain:** researcher → writer → editor.

| Step | Agent | Persists |
|------|-------|----------|
| Research | researcher | `researchNotes` |
| Draft | writer | chapter `draft`, `draftContent` |
| Publish | editor | chapter `published`, `bookSummary` |

**World bible:** world_builder → artifact → review in workspace.

**HITL:** plan approval uses LangGraph `interrupt()` and resumes through `/api/agent/threads/{thread_id}/runs/stream`.

## State handoff

| Field | Set by | Read by |
|-------|--------|---------|
| `researchNotes` | researcher | writer, editor |
| `draftContent` | writer | editor |
| `editedContent` | editor | — |

Planner tasks are routed by `app/agent/utils/routing.py` and hand off through graph state fields.

## Vector search (Chroma)

| Collection | Content |
|------------|---------|
| `chapters` | Chapters and draft artifacts |
| `characters` | Character bible |
| `world_system` | Entities, research, assets |
| `book_style_guide` | Style / prompt assets |

Indexing: `app/services/indexing.py` · Retrieval: `app/services/retrieval.py`
