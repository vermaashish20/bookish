# Server documentation

| Doc | Contents |
|-----|----------|
| [README.md](README.md) | Setup, API, dev testing, Langfuse (this file) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Package layout, layer rules, performance |
| [AGENTS.md](AGENTS.md) | LangGraph, RAG, workflows, prompts |

---

## Prerequisites

- Python 3.12+, [uv](https://github.com/astral-sh/uv), MongoDB
- At least one LLM API key (NVIDIA, OpenAI, Anthropic, etc.)

## Install and run

```bash
cd server
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/`

## Environment (`server/.env`)

```env
MONGO_URI=mongodb://localhost:27017/
MONGO_DB_NAME=bookish

NVIDIA_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Optional: OpenAI embeddings for Chroma
# EMBEDDING_PROVIDER=openai

# Optional: Langfuse tracing
# LANGFUSE_SECRET_KEY=
# LANGFUSE_PUBLIC_KEY=
# LANGFUSE_HOST=https://cloud.langfuse.com
```

## API quick reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List projects (lightweight) |
| `GET` | `/api/projects/{id}` | Full workspace payload |
| `POST` | `/api/projects/{id}/message` | Run agents (SSE) |
| `POST` | `/api/projects/{id}/resume` | HITL resume |

Message: `{ "message": "…" }` · Resume: `{ "run_id": "run_…", "response": "approve" }`

## Reindex vectors

```bash
uv run python scripts/reindex.py project_<id>
```

## Local testing

| Test | Message | Expected |
|------|---------|----------|
| Direct chat | `hi` | Planner reply, no agents |
| Agent run | `write a short scene` | Plan → HITL approve → agents |

**HITL:** Approve in UI → `POST …/resume` with `response: "approve"`. Reject → run cancelled.

Logs: uvicorn stdout; agent trace in SSE `done` → `thinking_logs`.

## Langfuse (optional)

1. Create a project at [langfuse.com](https://langfuse.com).
2. Add keys to `.env` (see above) and restart the API.
3. Traced: graph runs (`messages.py`), `call_llm`, each agent node (`app/core/telemetry.py`).

Prompts are edited in **`app/prompts/*.py`** only — not in markdown.
