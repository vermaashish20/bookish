# Bookish Agentic AI Learnings

## Table Of Contents
- [Purpose](#purpose)
- [Knowledge Architecture](#knowledge-architecture)
- [Retrieval Decisions](#retrieval-decisions)
- [Agent Prompting Lessons](#agent-prompting-lessons)
- [Frontend And Artifact Lessons](#frontend-and-artifact-lessons)
- [Open Questions](#open-questions)

## Purpose
This document records practical learnings from building the Bookish agent system. It should help future work preserve the intended behavior: agents should feel fluent, understand project context, retrieve the right knowledge surface, and avoid forcing users to dictate exact keywords or implementation details.

## Knowledge Architecture
Bookish has more than one knowledge surface. Agents must understand the difference instead of treating "knowledge base" as a single black box.

| Surface | Storage | Best For | Agent Behavior |
| --- | --- | --- | --- |
| Source assets | Persistent Mongo `user_assets` | Initial brief, plot, characters, outlines, guidelines, uploaded docs | Exact-read first when the user asks about original/source material |
| Formal memory | Persistent Mongo `character_bible`, `entity_bible` | Promoted characters, locations, organizations, objects, world facts | Use exact reads for known records and duplicate checks |
| Narrative | Persistent Mongo `chapters` plus Chroma index | Chapter text, summaries, story-so-far continuity | Exact-read known chapters; semantic search for targeted passages |
| Artifacts | Persistent Mongo `artifacts` plus Chroma index | Agent outputs, drafts, research notes, fact-check reports | Search when previous agent outputs matter |
| RAG index | Chroma collections | Small chunks, semantic lookup, targeted facts | Do not use as the only source for whole uploaded documents |

The Knowledge Base layer should hide raw database details behind agent-facing tools. Agents should not call Mongo or Chroma directly. The preferred router is `retrieve_knowledge`:

| Mode | Backing Store | Parameters | Use When |
| --- | --- | --- | --- |
| `persistent` | Mongo | `surface`, `operation`, ids/names/numbers, `max_chars` | Exact source-of-truth reads, lists, full chapter text, uploaded assets, formal memory, artifacts |
| `rag` | Chroma | `query`, `scopes`, `maxResults` | Semantic lookup, small chunks, targeted facts or passages |

Persistent surfaces should include `source_assets`, `chapters`, `characters`, `world`, `formal_memory`, and `artifacts`.

## Retrieval Decisions
Agents should pick retrieval based on the shape of the question.

| User Need | Preferred Tool Type | Why |
| --- | --- | --- |
| "What did I upload?" | Persistent read/list | The user wants exact source material, not a semantic guess |
| "What is the initial plot?" | Persistent source read | Initial plot may be long and unpromoted |
| "Who are the characters from my brief?" | Persistent source read first | Formal character count can be zero before promotion |
| "What did chapter 2 say?" | Exact chapter read | Known record, exact text needed |
| "Find where the cursed ledger was mentioned" | RAG semantic search | Targeted passage lookup |
| "Does this draft contradict canon?" | Persistent reads plus RAG | Exact source/final records first, semantic search for supporting passages |

Key rule: a zero count in formal memory means "not promoted yet," not "does not exist." Source assets may still contain canon.

## Agent Prompting Lessons
- Prompts must name tools by purpose, not just by tool name. "Search assets" was not enough; agents needed to know when persistent exact reads beat RAG.
- RAG should be framed as semantic lookup over chunks, not the full project memory.
- Persistent reads should be framed as source-of-truth access to full records.
- Planner direct answers should preserve retrieved context. Regenerating the answer from lightweight metadata can lose the facts that were just retrieved.
- Specialist agents need the same retrieval policy as the planner because delegated tasks run in their own prompt context.

## Frontend And Artifact Lessons
- Chat responses and artifacts need separate intent. A short conversational confirmation should stay in chat; long generated drafts, reports, bibles, and edited content belong in the preview/artifact flow.
- The backend should communicate artifact intent explicitly so the frontend does not infer from wording alone.
- Agents should decide from user intent, not only keywords like "create" or "write."

## Open Questions
- Should source assets be promoted into formal memory automatically, or only after explicit user approval?
- Should the planner have a dedicated classifier for chat-vs-artifact intent?
- Should large source assets be chunked for RAG while still retaining exact persistent reads for full-document grounding?
- Should artifacts include a structured `displayMode` such as `chat`, `preview`, or `both`?
