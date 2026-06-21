# Agent orchestration

## Graph

```text
START → load_store_memory → planner → execute_next ─┬→ writer ──────────┐
                                                     └→ world_builder ──┤
                                                                        ↓
                                                              persist_memory
                                                                        ↓
                                                              approve_write? → commit_write
                                                                        ↓
                                                              execute_next → END
```

| Component | Path |
|-----------|------|
| Graph / router | `app/agent/agent.py` |
| State | `app/agent/utils/state.py` |
| Nodes | `app/agent/nodes/` |
| Tools | `app/agent/utils/tools.py` |

## Agents

`planner`, `writer`, `world_builder`.

**Prompts (source of truth):** `app/prompts/*.py`

| Module | Role |
|--------|------|
| `planner.py` | Plan or direct reply; uses `search_project` / `read_project` tools |
| `writer.py` | Draft, revise, and polish prose; proposes chapter HITL writes |
| `world_builder.py` | Lore, characters, entities; tool-backed canon notes |

Tools are exposed through `app/agent/utils/tools.py` and backed by the project knowledge service (`app/knowledge/`).

## Workflows

**Chat:** message → load_store_memory → planner → specialists → finalize.

**New chapter:** planner delegates a single **writer** task. Writer uses tools, drafts prose, proposes `chapter_create` via HITL.

**Revise chapter:** planner delegates **writer** with explicit chapter reference. Writer reads chapter via tools and proposes `chapter_update` via HITL.

**World bible:** planner delegates **world_builder**. Agent uses tools and saves a world-building artifact.

**HITL:** durable writes use LangGraph `interrupt()` and resume through `/api/agent/threads/{thread_id}/runs/stream`.

## Specialist design

Each specialist runs a bounded tool loop (`search_project`, `read_project`) — no artifact chaining between agents. Cross-run context comes from `memoryBrief` (Store) and static `BookishContext`.

## Vector search (Chroma)

Semantic search uses the unified `project_knowledge` collection with scope-derived metadata filters. Indexing: `app/services/indexing.py` · Retrieval: `app/knowledge/service.py`
