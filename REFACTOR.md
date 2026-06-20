# Bookish Full Stack Agent Refactor Plan

## Purpose

Bookish should move from a mostly custom agent runtime to a LangGraph-native backend and an AI-native frontend.

The current code already uses `StateGraph`, but the important runtime concerns are still implemented manually: ReAct parsing, tool dispatch, thread queues, SSE event shaping, human approval blocking, and stream buffering. The frontend mirrors that by parsing custom SSE events and rendering a custom chat UI. This plan replaces those pieces with LangGraph graph primitives, LangGraph persistence/interrupt/streaming, and AI SDK/AI Elements UI primitives.

## Current State

Backend:

- `server/app/agents/orchestration_graph.py` builds a `StateGraph`, but compiles it without a checkpointer or store.
- `server/app/agents/runtime.py` owns a custom ReAct loop, JSON tool-call parsing, duplicate-tool protection, and manual task bookkeeping.
- `server/app/agents/streaming.py` owns custom queue-based SSE, custom event names, typewriter-oriented chunking, and thread execution.
- `server/app/agents/hitl.py` implements human approval with in-memory blocking events instead of LangGraph `interrupt()` plus `Command(resume=...)`.
- Tools in `server/app/knowledge/tools.py` are useful domain tools, but they are not exposed as LangChain/LangGraph tool objects with schemas.
- LLM calls in `server/app/infrastructure/llm/service.py` bypass LangChain chat models, which prevents LangGraph from naturally producing `messages` stream events, tool call metadata, and model-level callbacks.

Frontend:

- `client/features/workspace/hooks/useChatStream.ts` manually sends `fetch`, parses SSE, manages streaming queues, and simulates typewriter output.
- `client/components/workspace/ChatInterface.tsx` is a custom chat surface instead of AI Elements `Conversation`, `Message`, `PromptInput`, `Reasoning`, `Tool`, `Task`, `Checkpoint`, and `Queue` components.
- `client/features/workspace/tabs/AgentTab.tsx` manually composes chat, flow trace, and preview state.
- `client/package.json` does not yet include `@ai-sdk/react`, `ai`, `@langchain/react`, or AI Elements/shadcn component setup.

## Reference Direction

LangGraph:

- Use a graph package structure with `agent.py`, `utils/state.py`, `utils/tools.py`, and `utils/nodes.py`.
- Compile graphs with a persistent checkpointer and a store.
- Use stable `thread_id` values for every chat/project run.
- Use `interrupt()` inside nodes for human approval and resume with `Command(resume=value)`.
- Use built-in streaming through `.astream(..., stream_mode=["messages", "updates", "custom", "tasks", "checkpoints"], version="v2")`.
- Emit app-specific UI events from nodes with `get_stream_writer()` instead of a custom global queue.
- Prefer LangChain tool schemas and `ToolNode`/prebuilt agent patterns where they fit.

Frontend:

- Use `@langchain/react` `useStream` for LangGraph-native runs when the backend is exposed as a LangGraph assistant/server.
- Use AI SDK `useChat` with `DefaultChatTransport` when the backend exposes an AI SDK UI message stream.
- Use AI Elements components for the interface: `Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Reasoning`, `Tool`, `Task`, `Checkpoint`, `Queue`, and workflow/IDE components where useful.
- Keep custom Bookish components only for domain-specific surfaces: book preview, artifact preview, memory panels, and project settings.

## Target Backend Architecture

Proposed structure:

```text
server/
├── langgraph.json
├── app/
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── state.py
│   │       ├── context.py
│   │       ├── models.py
│   │       ├── tools.py
│   │       ├── nodes/
│   │       │   ├── __init__.py
│   │       │   ├── planner.py
│   │       │   ├── researcher.py
│   │       │   ├── writer.py
│   │       │   ├── editor.py
│   │       │   ├── world_builder.py
│   │       │   └── finalize.py
│   │       ├── routing.py
│   │       ├── persistence.py
│   │       └── streaming.py
│   ├── api/
│   ├── repositories/
│   ├── knowledge/
│   └── infrastructure/
```

Target graph behavior:

- `agent.py` exports a compiled graph/assistant.
- `state.py` defines a typed state with messages, project metadata, run metadata, artifacts, task state, and durable output fields.
- `persistence.py` owns checkpointer/store construction. Use SQLite for local development and Postgres/Mongo-compatible production persistence if available.
- `tools.py` wraps existing knowledge functions with typed LangChain tools. Tool schemas should describe parameters instead of asking models to hand-write ad hoc JSON.
- Specialist nodes return partial state updates, not mutated full state, where practical.
- Human approval is implemented as:
  - planner builds the proposed task plan,
  - planner calls `interrupt({"kind": "plan_approval", "plan": ...})`,
  - client resumes with approve/reject/edit,
  - graph continues from the checkpoint.
- Long-term memory uses LangGraph store for agent memory across threads, while Mongo remains the source of truth for Bookish domain records.
- Streaming comes from graph runtime modes:
  - `messages` for model tokens,
  - `updates` for node state updates,
  - `custom` for Bookish UI events such as `artifact_created`, `chapter_upserted`, and `project_snapshot`,
  - `tasks` and `checkpoints` for execution trace/debug UI.

## Target Frontend Architecture

Proposed structure:

```text
client/
├── components/
│   ├── ai-elements/
│   └── workspace/
│       ├── agent/
│       │   ├── AgentWorkspace.tsx
│       │   ├── AgentConversation.tsx
│       │   ├── AgentPrompt.tsx
│       │   ├── AgentInterruptCard.tsx
│       │   ├── AgentRunTimeline.tsx
│       │   └── AgentArtifactsPanel.tsx
│       └── ...
├── features/
│   └── workspace/
│       ├── hooks/
│       │   ├── useAgentStream.ts
│       │   └── useProject.ts
│       └── tabs/
│           └── AgentTab.tsx
```

Target UI behavior:

- Install AI Elements components into `client/components/ai-elements`.
- Replace `ChatInterface.tsx` with an AI Elements-based conversation.
- Replace `useChatStream.ts` with one of two transports:
  - Preferred long-term: `@langchain/react` `useStream` pointed at the LangGraph assistant API, exposing messages, values, interrupts, checkpoints, and tool calls.
  - Transitional option: AI SDK `useChat` with `DefaultChatTransport` pointed at a compatibility endpoint that emits AI SDK UI message streams.
- Render interrupts from `stream.interrupt`, not from custom `user_confirmation` SSE.
- Use AI Elements `Tool`, `Task`, `Queue`, `Checkpoint`, and `Plan` components to show graph status and approval flow.
- Preserve domain-specific preview behavior in `PreviewCanvas`, `BookEditor`, `BookOutline`, memory tabs, and settings tabs.

## API Contract

The backend should expose a LangGraph-first contract:

- `POST /api/agent/threads` creates or resolves a thread for `{ projectId, chatSessionId }`.
- `POST /api/agent/threads/{threadId}/runs/stream` starts or resumes a graph run.
- Resume requests pass a LangGraph command shape: `{ "command": { "resume": value } }`.
- Stream responses use LangGraph stream parts or a documented adapter format.
- Existing `GET /api/projects/{id}`, messages, project assets, model settings, and memory endpoints remain domain APIs.

Compatibility period:

- Keep `POST /api/projects/{id}/message` as a thin adapter while the frontend migrates.
- Keep the old response fields only until the new Agent tab is fully using graph messages and stream parts.

## Migration Phases

### Phase 1: Backend Foundation

- Add `server/langgraph.json`.
- Create `server/app/agent/` alongside the existing `server/app/agents/` package.
- Move state definitions into `agent/utils/state.py`.
- Add `agent/utils/persistence.py` with checkpointer and store factories.
- Build a minimal graph with planner, one tool-capable writer/researcher path, finalize, and real `thread_id` config.
- Add tests or scripts that prove checkpoints are created and a run can resume by thread ID.

Exit criteria:

- A graph can run with a stable thread ID.
- Checkpoints are inspectable.
- No custom queue is required for a basic streamed run.

### Phase 2: Typed Tools and Model Layer

- Convert `knowledge/tools.py` functions into typed LangChain tools.
- Preserve existing Mongo/Chroma implementations behind tool functions.
- Replace prompt-level JSON tool calls with actual tool binding and `ToolNode` where feasible.
- Replace `LLMService` direct HTTP calls with LangChain chat model wrappers or a small adapter that emits LangChain message chunks.
- Keep provider/model settings from the current project settings.

Exit criteria:

- Agent nodes can call tools without manually parsing `{"tool_call": ...}` JSON.
- Tool calls appear in stream metadata.
- Langfuse traces still capture model and tool activity.

### Phase 3: Native Interrupts

- Replace `runtime.wait_for_hitl()` and `agents/hitl.py` in-memory events with LangGraph `interrupt()`.
- Model planner approval as a first-class interrupt payload.
- Add approval, rejection, and edited-plan resume branches.
- Ensure process restarts do not lose pending approvals.

Exit criteria:

- A pending approval survives server restart when using the persistent checkpointer.
- Resume uses `Command(resume=...)`.
- No backend thread blocks while waiting for the user.

### Phase 4: Native Streaming

- Replace `streaming.py` queue/thread ownership with graph `.astream()`.
- Use `stream_mode=["messages", "updates", "custom", "tasks", "checkpoints"]` and `version="v2"`.
- Emit Bookish-specific events with `get_stream_writer()` from nodes.
- Define one typed frontend event mapper for graph stream parts.
- Remove manual token buffering except where a node intentionally hides internal planning.

Exit criteria:

- Token streaming comes from LangGraph message chunks.
- Node status comes from `updates`/`tasks`.
- Artifact/project updates come from `custom` stream parts.

### Phase 5: Frontend Agent UI

- Add dependencies: `ai`, `@ai-sdk/react`, `@langchain/react`, and AI Elements/shadcn setup.
- Install AI Elements components needed for the Agent tab.
- Replace `ChatInterface.tsx` with AI Elements conversation and prompt components.
- Replace `useChatStream.ts` with `useAgentStream.ts`.
- Render approvals from LangGraph interrupts.
- Render graph status/checkpoints/tasks using AI Elements workflow components.

Exit criteria:

- No custom SSE parser is used by the Agent tab.
- Chat messages, tool calls, interrupts, and run status are owned by SDK hooks.
- Book preview and artifact preview still update during/after runs.

### Phase 6: Cleanup

- Delete obsolete custom runtime pieces after parity:
  - custom ReAct loop,
  - in-memory HITL events,
  - custom SSE queue,
  - typewriter streaming queues,
  - old chat-only components no longer referenced.
- Update docs in `server/docs/` and `client/AGENTS.md`.
- Add regression tests for plan approval, writer tool use, artifact creation, stream mapping, and frontend message rendering.

## Dependency Plan

Backend:

- Keep `langgraph`.
- Add or verify compatible `langchain`, `langchain-core`, and provider packages needed for configured models.
- Add a production checkpointer dependency if choosing Postgres/SQLite checkpointers beyond the built-in development saver.

Frontend:

- Add `ai`.
- Add `@ai-sdk/react`.
- Add `@langchain/react`.
- Add shadcn/AI Elements component files using the AI Elements CLI.
- Add any component dependencies introduced by AI Elements, such as markdown/code rendering utilities, only through the generated component install flow.

## Compatibility and Data Safety

- Mongo remains the source of truth for projects, chapters, assets, artifacts, and formal memory.
- LangGraph checkpoint/store data is runtime state, not the canonical domain database.
- Existing project records should not require migration for the first backend phases.
- New thread IDs should be deterministic, for example `{projectId}:{chatSessionId}`.
- Existing chat sessions can map one-to-one to LangGraph threads.
- Current dirty worktree changes should be preserved during implementation; this refactor should be broken into small PR-sized commits.

## Open Decisions

- Whether to run a LangGraph API server directly or keep FastAPI as the public API with a LangGraph adapter.
- Which persistent checkpointer to use for local and production environments.
- Whether AI SDK `useChat` remains as a compatibility layer or the Agent tab goes directly to `@langchain/react` `useStream`.
- How much of the existing provider matrix should be supported through LangChain wrappers on day one.
- Whether planner/specialist agents should be one graph with routed nodes or separate subgraphs.

## First Implementation Slice

Start with the smallest vertical slice:

1. Add the new `server/app/agent` package and `langgraph.json`.
2. Create a checkpointed graph with planner approval interrupt and one writer/researcher tool path.
3. Add a new streaming endpoint that emits LangGraph v2 stream parts.
4. Build a temporary frontend panel using `@langchain/react` `useStream`.
5. Once the slice proves checkpoint, interrupt, resume, and streaming, migrate the rest of the agent nodes.

