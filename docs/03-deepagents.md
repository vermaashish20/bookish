# DeepAgents

Source: LangChain/LangGraph docs MCP.

DeepAgents is an opinionated agent harness built on top of LangChain and LangGraph. It is designed for complex, multi-step tasks where the agent benefits from built-in planning, subagents, a virtual filesystem, context management, long-term memory, permissions, and human approval.

DeepAgents does not replace LangGraph. It packages common agent-harness behavior on top of LangGraph so teams can start faster when the desired behavior matches the harness.

## What It Provides

1. Agent harness

   DeepAgents provides a complete harness around the model loop. It includes planning, tool use, context management, memory, subagents, filesystem operations, and human-in-the-loop controls.

2. Task planning

   DeepAgents includes a built-in `write_todos` style planning capability. The agent can break complex tasks into steps, track progress, and adapt the plan as it learns more.

3. Subagents

   DeepAgents can spawn subagents for isolated subtasks. This helps with:

   - Context isolation.
   - Parallel or delegated work.
   - Specialized instructions and tool access.
   - Keeping the main agent context cleaner.

   Subagents are useful when a task has independent research, implementation, testing, review, or analysis tracks.

4. Virtual filesystem

   The harness includes file tools backed by pluggable filesystem backends. Depending on backend and permissions, an agent can list files, read files, write files, edit files, search files, and sometimes execute commands.

   This is useful for coding agents, research agents, and agents that need to manage artifacts over long runs.

5. Pluggable backends

   DeepAgents supports different backing stores for the virtual filesystem and runtime environment, including in-memory state, local disk, LangGraph store, composite routing, sandbox backends, and custom backends.

6. Permissions

   DeepAgents can enforce permission rules around filesystem access. Rules can allow or deny reads and writes by path patterns. This is important when agents can edit files, access secrets, or use shell execution.

7. Shell and interpreter support

   With suitable backends, DeepAgents can expose shell execution or an in-process JavaScript interpreter. This lets agents run tests, scripts, transformations, and command-line workflows.

8. Context management

   DeepAgents includes context engineering features for long runs:

   - Conversation summarization.
   - Large tool-result offloading.
   - Skill loading.
   - Memory loading.
   - Prompt caching where supported.

   This is one of the main differences from a basic LangChain agent loop.

9. Skills

   Skills package specialized workflows and domain knowledge. They can include instructions, scripts, templates, and reference files. The harness can load skills progressively when they are relevant instead of putting everything in the system prompt.

10. Memory

   DeepAgents can load persistent memory files such as `AGENTS.md`-style project instructions. Memory is always available to the agent and can capture project conventions, user preferences, and recurring guidance.

11. MCP tool support

   DeepAgents can use tools from MCP servers. This makes it suitable for agents that need to connect to external systems such as databases, APIs, file systems, observability tools, or documentation servers.

12. Human-in-the-loop

   DeepAgents can pause before sensitive tool operations using LangGraph interrupt capabilities. This is useful for approval before file edits, expensive calls, destructive operations, or risky actions.

13. Streaming

   DeepAgents exposes event streaming for messages, tool calls, values, output, and subagent streams. When work is delegated, each subagent can have its own stream handle.

14. Smart defaults

   The harness ships with opinionated prompts and runtime behavior that encourage planning, verification, context management, and structured progress.

## When To Use It

Use DeepAgents when:

- You want a batteries-included agent harness.
- The task is complex, long-running, and non-deterministic.
- Subagents would help isolate research, coding, review, or analysis work.
- The agent needs a virtual filesystem or artifact workspace.
- You want built-in planning, context compression, and memory behavior.
- You need MCP tools and human approval in a ready-made harness.

Avoid DeepAgents when:

- You need a precisely modeled application workflow.
- Your nodes and approvals map directly to domain concepts.
- The app must own every state transition.
- You only need a small tool-calling agent.

For a product workflow like Bookish, DeepAgents is useful as inspiration or for internal assistant-style agents, but LangGraph remains the better fit for the core book-writing pipeline.

## In Bookish

DeepAgents could be useful for:

- A developer or admin assistant that can inspect project files, run diagnostics, and summarize issues.
- A research-heavy autonomous agent that needs subagents and a scratch filesystem.
- A future "book production assistant" that manages many artifacts over a long session.

DeepAgents should not automatically replace the current LangGraph pipeline. Bookish needs domain-specific orchestration: planner approval, specialist routing, artifact creation, chapter persistence, world-bible checks, and UI streaming. Those are clearer as explicit LangGraph nodes and state fields.
