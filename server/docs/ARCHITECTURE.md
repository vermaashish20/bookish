# Backend architecture

Production code lives under `server/app/`:

```
app/
├── main.py                 # FastAPI entry
├── config.py
├── api/routes/             # HTTP handlers
├── agents/                 # LangGraph + nodes + runtime + hitl
├── core/                   # exceptions, parsing, model_config, telemetry
├── infrastructure/
│   ├── database/mongo.py
│   ├── vector/store.py     # ChromaDB
│   ├── vector/embeddings.py
│   └── llm/service.py
├── repositories/           # Mongo CRUD (+ vector index on write)
├── services/               # indexing, retrieval, assets
├── schemas/                # API Pydantic models
├── domain/                 # Document shape models (reference)
└── prompts/                # Agent system prompts
```

## Layer rules

| Layer | Responsibility | Must not |
|-------|----------------|----------|
| `api/routes` | HTTP, validation | LLM / graph logic |
| `agents` | Orchestration | Direct Mongo/Chroma |
| `repositories` | CRUD + indexing hooks | Orchestration |
| `services` | Indexing, RAG, assets | Routes |
| `infrastructure` | DB, vectors, LLM | Business rules |
| `core` | Pure helpers | I/O |

## Performance

- **List projects:** `get_project_summary()` — do not use `get_unified_project_payload()` on list routes.
- **Project detail:** `get_unified_project_payload()` is correct for the workspace (heavier by design).
- **Agent context:** `load_project_context()` omits full chapter bodies; agents use RAG for depth.
- **Chroma:** data in `CHROMA_DIR` (default `server/chroma_db/`, gitignored); warmed on app startup.
