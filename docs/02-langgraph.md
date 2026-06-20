# LangGraph

Source: LangChain/LangGraph docs MCP.

LangGraph is the low-level orchestration framework and runtime for long-running, stateful agents. It is designed for workflows where the application needs explicit control over state, nodes, routing, persistence, streaming, memory, human approval, and recovery.

LangGraph can use LangChain components such as models and tools, but it is not just a LangChain wrapper. It is the runtime layer that controls how work progresses.

## What It Provides

1. State

   State is the shared snapshot of the graph. Nodes read state and return partial updates. LangGraph applies those updates through reducers.

   State usually contains:

   - User input.
   - Conversation messages.
   - Current task index.
   - Planner decisions.
   - Intermediate artifacts.
   - Tool results.
   - Approval state.
   - Final output.

2. Nodes

   Nodes are functions that perform work. A node can call an LLM, execute deterministic code, call tools, write artifacts, update a database, or prepare the next step.

   Good node design keeps each node focused:

   - Planner node creates the plan.
   - Researcher node gathers evidence.
   - Writer node drafts content.
   - Editor node audits continuity and polishes prose.
   - Finalize node produces the response.

3. Edges

   Edges decide what runs next. They can be fixed transitions or conditional routes. This is where LangGraph becomes more explicit than a plain agent loop.

   In Bookish, a planner can create a task list, and routing can send execution to the next agent node based on the current task.

4. `StateGraph`

   `StateGraph` is the primary graph builder. You define state, add nodes, add edges, and compile the graph before running it.

   Compiling checks graph structure and attaches runtime features such as checkpointers, stores, and breakpoints.

5. Reducers

   Reducers define how updates apply to state fields. The default reducer overwrites values. Custom reducers can append messages, accumulate artifacts, or merge parallel updates.

   Reducers matter when multiple nodes can update the same field or when a field should accumulate over time.

6. Persistence and checkpointers

   Checkpointers persist graph state at thread-level checkpoints. This enables:

   - Resuming after process failures.
   - Continuing a thread across requests.
   - Human-in-the-loop pauses.
   - Time travel and state inspection.
   - Long-running execution.

   Bookish uses MongoDB as its durable application database, so a MongoDB checkpointer is the right persistence direction for graph checkpoints.

7. Store

   The store is for long-term memory that can span threads. It is different from graph state:

   - State is the current thread/run snapshot.
   - Store is cross-thread memory under namespaces and keys.

   Store is useful for user preferences, durable agent memory, project-level facts, and reusable instructions. In Bookish, MongoDB and Chroma already act as source-of-truth and semantic memory; LangGraph store can complement them for agent-level memory.

8. Human-in-the-loop interrupts

   LangGraph can pause execution with interrupts. This lets the application ask a human to approve, reject, or edit state before continuing.

   This is the correct pattern for:

   - Approving a plan.
   - Approving destructive tool calls.
   - Reviewing world-bible writes.
   - Correcting generated state before the graph resumes.

9. Streaming

   LangGraph supports streaming graph execution. Important stream modes include:

   - `updates`: emit node updates as they happen.
   - `values`: emit current state values.
   - `messages`: emit model token/message events.
   - `custom`: emit application-defined progress events.
   - `debug` or task/checkpoint events depending on runtime and SDK version.

   Streaming should come from graph execution rather than a separate hand-rolled orchestration stream whenever possible.

10. Tool execution through `ToolNode`

   `ToolNode` executes model-requested tool calls inside a LangGraph workflow. This is the native place to run LangChain tools in graph-based agents.

   For deterministic workflows, nodes can also call tools directly, but exposing tools as real LangChain tools keeps the system compatible with tool-calling agents and future graph loops.

11. Subgraphs

   Subgraphs let you compose large workflows from smaller graphs. They are useful when a specialist agent becomes complex enough to need its own internal plan, tools, state, and routing.

12. Deployment and observability

   LangGraph is designed for production agent systems. It integrates with LangSmith for tracing, debugging, evaluation, and deployment workflows.

## When To Use It

Use LangGraph when:

- You need explicit workflow control.
- You have deterministic and agentic steps in the same system.
- Runs can be long-lived or resumable.
- State matters between steps.
- Humans need to inspect or modify state.
- Streaming progress matters.
- The workflow has multiple agent nodes or branches.

Avoid using raw LangGraph for very simple agents where a standard tool-calling loop is enough. In those cases, LangChain or DeepAgents can be faster to start.

## In Bookish

LangGraph should be the backend orchestration layer for the writing pipeline:

- `StateGraph` models the full run state.
- Nodes represent planner, approval, researcher, writer, editor, world builder, and finalization work.
- Conditional edges route to the next planned specialist.
- MongoDB checkpointer persists graph threads.
- Interrupts pause for approval.
- Streaming emits task progress, messages, custom UI events, and checkpoints.
- LangChain tools are executed through LangGraph-compatible tool handling.

This keeps Bookish agentic without hiding the important workflow decisions inside one opaque model loop.
