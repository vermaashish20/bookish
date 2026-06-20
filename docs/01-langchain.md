# LangChain

Source: LangChain/LangGraph docs MCP.

LangChain is the configurable agent framework in the LangChain ecosystem. It gives you the common building blocks for LLM applications: model interfaces, tools, prompts, agent loops, middleware, retrieval, memory access, streaming, structured output, and integrations.

Use LangChain when you want to build an agent quickly while still controlling the pieces around the model. In the current docs, LangChain is described as `Agent = Model + Harness`: the model does the reasoning, while the harness manages the prompt, tools, loop, middleware, runtime context, memory access, and output handling.

## What It Provides

1. Standard model interface

   LangChain normalizes model access across providers such as OpenAI, Anthropic, Google, Ollama, OpenRouter, Bedrock, and others. The goal is to make provider switching and model configuration less coupled to application code.

2. Tools

   Tools are callable functions with typed input schemas and descriptions. The model can decide when to call them and with what arguments. Tools are how agents fetch data, query databases, call APIs, execute controlled actions, and connect to application-specific capabilities.

   Important tool conventions:

   - Prefer clear `snake_case` names such as `retrieve_knowledge`.
   - Give every tool a focused description.
   - Use typed schemas so the model knows the expected arguments.
   - Keep tools narrow and deterministic where possible.

3. Agent loop

   LangChain provides a high-level agent loop through `create_agent` / `createAgent`. This loop repeatedly calls the model, executes requested tools, appends tool results, and continues until the model produces a final answer.

4. Middleware

   Middleware lets you customize agent behavior without rewriting the whole loop. Common uses include guardrails, model selection, context shaping, human-in-the-loop behavior, tool-call interception, and observability.

5. Runtime context

   Runtime context carries invocation-scoped data such as user ID, project ID, session metadata, permissions, or request-specific settings. This is separate from the LLM prompt context and from thread persistence.

6. Memory and store access

   LangChain agents can use short-term thread memory and long-term stores. Short-term memory is usually scoped by a `thread_id`; long-term memory is stored in namespaces and can be shared across conversations.

7. Streaming

   LangChain can stream model output, tool progress, and agent events. Tool runtimes can also emit custom updates while a long-running tool is executing.

8. Integrations

   LangChain provides integrations for model providers, vector stores, retrievers, embedding models, observability, and external services. This is one of its strongest reasons to exist in a production app.

9. LangGraph foundation

   LangChain agents are built on top of LangGraph. This means LangChain can expose higher-level agent ergonomics while still benefiting from LangGraph capabilities such as persistence, streaming, interrupts, and durable execution.

## When To Use It

Use LangChain when:

- You want a standard way to define models, tools, prompts, and agent loops.
- You need provider and integration flexibility.
- You are building a straightforward tool-calling agent.
- You want customization, but not full low-level graph orchestration.

Avoid using LangChain alone when:

- The workflow has multiple deterministic stages.
- You need explicit branching, checkpoints, resumability, or human approval between nodes.
- You need strong control over state transitions and long-running execution.

For those cases, use LangGraph as the orchestration layer and LangChain components inside the nodes.

## In Bookish

LangChain should provide the model-facing primitives:

- Tool definitions for knowledge retrieval and source reads.
- Provider-agnostic model interfaces where possible.
- Message and tool-call structures.
- Optional middleware-style behavior for guardrails, tracing, and tool interception.

Bookish should not use LangChain as the only orchestration system for the full writing pipeline. The project has planner, researcher, writer, editor, world builder, approval, persistence, and streaming concerns. Those are better represented as LangGraph state and nodes.
