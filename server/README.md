# Bookish server

Production-oriented FastAPI backend for multi-agent book orchestration.

## Layout

All application code lives in **`app/`**.

**Documentation:** [docs/README.md](docs/README.md) (setup, agents, workflows, prompts index).

## Run

```bash
cd server
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Environment

Copy `.env.example` or set:

- `MONGO_URI`, `MONGO_DB_NAME`
- LLM keys: `NVIDIA_API_KEY`, `OPENAI_API_KEY`, etc.
- Optional: `EMBEDDING_PROVIDER=openai` for OpenAI embeddings

## Scripts

```bash
uv run python scripts/reindex.py <project_id>
```
