# Bookish Client

Next.js 16 App Router frontend for the Bookish writing workspace.

## Structure

```
client/
├── app/                      # Routes only (thin pages)
│   ├── page.tsx              # Project dashboard
│   ├── layout.tsx
│   └── book/[id]/page.tsx    # Workspace shell → WorkspaceView
├── features/workspace/       # Workspace feature module
│   ├── WorkspaceView.tsx
│   ├── hooks/                # useProject, useChatStream, useModelSettings
│   └── tabs/                 # Agent, Book, Memory, Settings
├── components/workspace/     # Presentational UI
├── lib/
│   ├── api/                  # HTTP + SSE streaming
│   └── types/                # Domain & API types
└── config/env.ts             # NEXT_PUBLIC_API_URL
```

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | FastAPI backend base URL |

Create `client/.env.local` for local overrides.

## Conventions

- Import shared code via `@/` (maps to `client/` root).
- Keep route files thin; workspace logic lives under `features/workspace/`.
- API calls go through `@/lib/api`; do not fetch directly from components.
