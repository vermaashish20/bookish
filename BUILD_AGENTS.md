# Agentic AI Engineering Syllabus

These are revisit notes for building, shipping, and operating production-grade agentic systems like the Bookish multi-agent writing platform.

The goal of this document is not only to explain "what is an agent", but to give you a mental map for the full lifecycle:

```text
Idea
-> Agent design
-> Context engineering
-> Memory and knowledge
-> Tooling
-> Multi-agent orchestration
-> Evaluation
-> Deployment
-> Observability
-> Continuous improvement
```

Use this as a study syllabus, architecture checklist, and tool landscape reference.

## Table Of Contents

| Section | What You Will Revisit |
| --- | --- |
| [1. Agentic AI: Core Definition](#1-agentic-ai-core-definition) | What makes an AI system agentic instead of a simple LLM call. |
| [2. Levels of AI Systems](#2-levels-of-ai-systems) | The progression from raw LLM calls to assistants, agents, multi-agent systems, and platforms. |
| [3. Core Components Of An Agent System](#3-core-components-of-an-agent-system) | The building blocks every production agent needs. |
| [4. Context Engineering](#4-context-engineering) | How to decide what the model sees, remembers, ignores, and acts on. |
| [5. State Management](#5-state-management) | How temporary runtime progress is tracked across a workflow. |
| [6. Memory Management](#6-memory-management) | How agents remember useful facts across sessions without becoming unsafe or stale. |
| [7. Knowledge Layer](#7-knowledge-layer) | How agents safely access documents, databases, search indexes, APIs, and RAG systems. |
| [8. Planning Systems](#8-planning-systems) | How goals become steps, tasks, and execution plans. |
| [9. Reflection, Critique, And Replanning](#9-reflection-critique-and-replanning) | How agents review outputs, recover from failure, and improve results. |
| [10. Agent Topologies](#10-agent-topologies) | The common ways single and multi-agent systems are arranged. |
| [11. Multi-Agent Communication](#11-multi-agent-communication) | How agents coordinate through state, messages, queues, events, and memory. |
| [12. Tool Use](#12-tool-use) | How agents call external capabilities safely and reliably. |
| [13. MCP: Model Context Protocol](#13-mcp-model-context-protocol) | Why MCP matters for standardized tool and data connections. |
| [14. Agent Frameworks In 2026](#14-agent-frameworks-in-2026) | The major frameworks and when to choose each one. |
| [15. Models And Model Providers](#15-models-and-model-providers) | How to select models for planning, execution, retrieval, judging, and multimodal work. |
| [16. Prompts And Instructions](#16-prompts-and-instructions) | How prompts fit into a larger engineered system. |
| [17. Structured Outputs](#17-structured-outputs) | How schemas make agents testable, reliable, and integration-friendly. |
| [18. Guardrails And Safety](#18-guardrails-and-safety) | How to constrain agent behavior before, during, and after generation. |
| [19. Evaluation](#19-evaluation) | How to measure whether the agent actually works. |
| [20. Observability](#20-observability) | How to trace, debug, and monitor agent behavior in production. |
| [21. Reliability Engineering](#21-reliability-engineering) | How to handle retries, fallbacks, timeouts, failures, and loops. |
| [22. Human-In-The-Loop](#22-human-in-the-loop) | Where human approval and review belong in autonomous systems. |
| [23. Security, Privacy, And Governance](#23-security-privacy-and-governance) | How to protect data, secrets, permissions, and tenants. |
| [24. Deployment Architecture](#24-deployment-architecture) | How to ship agents on cloud, serverless, container, and workflow platforms. |
| [25. Agentic Development Lifecycle](#25-agentic-development-lifecycle) | The end-to-end phases from problem definition to operations. |
| [26. Bookish-Style Multi-Agent Architecture](#26-bookish-style-multi-agent-architecture) | How these ideas map to a real writing-agent product. |
| [27. Tool And Platform Landscape](#27-tool-and-platform-landscape) | A practical catalog of memory, RAG, cloud, eval, observability, and deployment tools. |
| [28. Cost And Latency Optimization](#28-cost-and-latency-optimization) | How to keep agent systems affordable and responsive. |
| [29. Common Production Anti-Patterns](#29-common-production-anti-patterns) | Mistakes that make agent systems fragile. |
| [30. Mental Models To Remember](#30-mental-models-to-remember) | Short formulas for remembering the important ideas. |
| [31. Study Checklist](#31-study-checklist) | A revision checklist for fundamentals, architecture, RAG, production, evals, and security. |
| [32. Interview And Self-Test Questions](#32-interview-and-self-test-questions) | Questions to test whether you can explain and apply the material. |
| [33. Final Production Architecture](#33-final-production-architecture) | A complete reference architecture for mature agent platforms. |
| [34. 2026 Practical Tool Selection Guide](#34-2026-practical-tool-selection-guide) | Default tool choices for common agent project types. |
| [35. Final Principle](#35-final-principle) | The mindset shift from prompt writing to AI systems engineering. |

## How To Read This Syllabus

Start with sections 1 to 3 if you want the conceptual foundation. These sections explain what an agent is, how it differs from a normal assistant, and what components appear again and again in serious systems. This gives you the vocabulary needed to understand the rest of the notes.

Sections 4 to 7 are the heart of agent design. Context engineering decides what the model sees right now, state management tracks what is happening in the current run, memory decides what survives across runs, and the knowledge layer connects the agent to external truth. If an agent behaves randomly, hallucinates, forgets important things, or retrieves weak information, the problem is usually in one of these four sections.

Sections 8 to 13 explain how agents actually act. Planning turns goals into steps, reflection and replanning help the system recover, topologies describe how agents are arranged, communication patterns explain how they coordinate, tools let them affect the outside world, and MCP gives those tools a more standard interface. These sections are useful when moving from a chatbot to a real autonomous workflow.

Sections 14 to 18 cover the engineering choices that shape implementation. Frameworks define the runtime style, models determine capability and cost, prompts provide behavioral instructions, structured outputs make results machine-readable, and guardrails keep the system inside safe boundaries. Read these sections when choosing a stack or turning a prototype into something maintainable.

Sections 19 to 24 are production-readiness topics. Evaluation proves whether quality improved, observability shows what happened inside the agent, reliability engineering keeps the system from falling apart, human-in-the-loop adds approval where autonomy is risky, security protects data and actions, and deployment architecture shows how the system runs in the real world.

Sections 25 to 35 are meant for revision and practical use. They give you the development lifecycle, a Bookish-style reference architecture, the 2026 tool landscape, cost optimization ideas, common anti-patterns, mental models, a study checklist, self-test questions, and practical tool-selection defaults. Use these sections before starting a project, before interviews, or when reviewing an existing agent system.

---

# 1. Agentic AI: Core Definition

Agentic AI is software where an LLM is not only generating text, but helping decide what to do next.

An agentic system can:

1. Understand a goal.
2. Break the goal into steps.
3. Select tools.
4. Gather information.
5. Maintain state.
6. Use memory.
7. Execute actions.
8. Inspect results.
9. Replan when something fails.
10. Stop when the goal is complete or when escalation is needed.

The key distinction:

| Traditional Workflow | Agentic System |
| --- | --- |
| Fixed path | Dynamic path |
| Human decides every step | Agent decides some steps |
| Executes known actions | Chooses actions from available tools |
| Predictable control flow | Adaptive control flow |
| Task execution | Goal-directed execution |

Example:

```text
Traditional workflow:

PDF
-> Extract text
-> Summarize
-> Return answer
```

```text
Agentic workflow:

Goal: Create a high-quality research report.

Agent may:
- Search the web
- Read uploaded documents
- Query a database
- Ask a specialist agent
- Compare conflicting facts
- Write a draft
- Run a critique step
- Revise the report
```

The goal is fixed.

The execution path is dynamic.

---

# 2. Levels of AI Systems

## Level 1: LLM Call

```text
Input
-> LLM
-> Output
```

Examples:

- Basic chat completion.
- Single summarization call.
- No tools.
- No memory.
- No planning.

Use when:

- The task is small.
- Context fits in one prompt.
- No external action is required.

## Level 2: Assistant

```text
User
-> Assistant
-> Optional tool call
-> Response
```

Examples:

- ChatGPT with tools.
- Claude with artifacts.
- GitHub Copilot Chat.
- Cursor agent for coding.

The assistant is mostly reactive. It waits for user instructions.

## Level 3: Agent

```text
Goal
-> Plan
-> Act
-> Observe
-> Reflect
-> Replan
-> Complete
```

An agent has a loop. It can decide intermediate steps instead of waiting for the user after every action.

## Level 4: Multi-Agent System

```text
Goal
-> Planner Agent
   -> Research Agent
   -> Writer Agent
   -> Critic Agent
   -> Editor Agent
-> Final Output
```

Multiple specialized agents collaborate. This is useful when the task has naturally different responsibilities.

## Level 5: Agentic Platform

```text
Users
-> API / Gateway
-> Agent Runtime
-> Tool Registry
-> Memory Layer
-> Knowledge Layer
-> Evaluation Layer
-> Observability
-> Deployment Platform
```

This is the production version. It is no longer just "an agent"; it is a system for creating, running, measuring, and improving agents.

---

# 3. Core Components Of An Agent System

Every serious agent system contains some version of this:

```text
Agent System
├─ Model / Brain
├─ Instructions / Prompts
├─ Context Assembly
├─ State Manager
├─ Memory Layer
├─ Knowledge Layer
├─ Tool Registry
├─ Planner
├─ Executor
├─ Reflection / Critic
├─ Guardrails
├─ Evaluation
├─ Observability
└─ Deployment Runtime
```

Short definitions:

- Model: the LLM or multimodal model doing reasoning and generation.
- Prompt: instructions that shape behavior.
- Context: everything the model sees in a specific call.
- State: temporary runtime progress.
- Memory: persistent learnings across sessions.
- Knowledge: external facts and documents.
- Tools: actions the agent can call.
- Planner: creates or updates the task plan.
- Executor: performs planned work.
- Reflection: checks quality and suggests fixes.
- Guardrails: restrict unsafe or invalid behavior.
- Evaluation: measures quality.
- Observability: records what happened.
- Deployment runtime: runs the system reliably in production.

---

# 4. Context Engineering

Context engineering is the most important skill in modern agentic AI.

Prompt engineering is only one part. Context engineering controls:

```text
What the model sees
What the model remembers
What the model can do
What the model should ignore
What the model should optimize for
```

Context usually includes:

- System prompt.
- Developer instructions.
- User request.
- Conversation history.
- Current state.
- Retrieved documents.
- Retrieved memories.
- Tool schemas.
- Tool outputs.
- Environment information.
- Safety rules.
- Output format requirements.

Golden rule:

```text
Agent quality often depends more on context quality than raw model quality.
```

## Context Budgeting

LLMs have finite context windows. Bigger windows help, but they do not remove the need for clean context.

Always ask:

- Is this information needed now?
- Is it trustworthy?
- Is it recent?
- Is it specific enough?
- Is it redundant?
- Should it be summarized?
- Should it be retrieved later instead of included now?

## Context Assembly Pattern

```text
User goal
-> Load current state
-> Retrieve relevant memory
-> Retrieve relevant knowledge
-> Select available tools
-> Add policy and format constraints
-> Build final model context
```

Good context assembly is structured. Bad context assembly is a giant prompt string that keeps growing.

## Common Context Failures

- Too much irrelevant history.
- Missing business rules.
- Missing tool limitations.
- Conflicting instructions.
- Old memory overriding current user intent.
- Retrieved chunks with no source metadata.
- Tool output copied in full when a summary is enough.
- No distinction between facts, guesses, and instructions.

---

# 5. State Management

State is temporary runtime information.

Example:

```json
{
  "active_agent": "writer",
  "current_chapter": 5,
  "research_completed": true,
  "next_step": "editor_review"
}
```

Think:

```text
State = working memory for the current run
```

State may include:

- Current task.
- Current step.
- Intermediate results.
- Tool outputs.
- Errors.
- Retry count.
- Active agent.
- User approvals.
- Execution graph position.

State should usually be explicit and typed.

Bad:

```text
The agent remembers what happened because it is in the chat history.
```

Good:

```text
The runtime stores task state in a structured object.
```

## State Storage Options

- In-memory object for simple local runs.
- Redis for fast distributed state.
- Postgres for durable workflow state.
- MongoDB for flexible document-like state.
- LangGraph checkpointing for graph-based agents.
- Durable execution platforms such as Temporal, Azure Durable Functions, or workflow engines.

---

# 6. Memory Management

Memory survives beyond a single execution.

Think:

```text
State = current run
Memory = persistent learning
Knowledge = external truth source
```

Memory is not just "chat history". Good memory systems decide what to store, how to store it, when to retrieve it, and when to forget it.

## Memory Types

### Short-Term Memory

Current conversation or current session.

Example:

```text
The user is currently asking for a fantasy novel outline.
```

### Long-Term Memory

Persistent user, project, or agent facts.

Example:

```text
The user prefers concise technical explanations.
```

### Episodic Memory

Past events.

Example:

```text
Chapter generation failed twice because the research context was too thin.
```

### Semantic Memory

Generalized facts and concepts.

Example:

```text
The Bookish system uses separate planner, researcher, world-builder, writer, and editor agents.
```

### Procedural Memory

Learned workflows.

Example:

```text
For long-form book generation:
Research -> Outline -> Draft -> Critique -> Edit -> Humanize -> Fact-check
```

### Reflective Memory

Lessons learned by the system.

Example:

```text
When writing technical chapters, include source-grounded examples before final prose.
```

## Memory Pipeline

```text
Conversation / Tool Output
-> Candidate memory extraction
-> Importance scoring
-> Deduplication
-> Storage
-> Retrieval
-> Context injection
-> Memory update or deletion
```

## Memory Tools And Platforms

### Mem0

Mem0 is a dedicated memory layer for AI agents. It is useful when you want user, session, and agent memory without hand-building vector update logic.

Best for:

- Personalized agents.
- Customer support bots.
- Long-running assistants.
- User preference memory.
- Agent memory across sessions.

Common architecture:

```text
Agent
-> Mem0 SDK/API
-> Vector store / graph store / database backend
-> Retrieved memories returned to agent context
```

Mem0 can be used hosted or self-hosted. It also integrates with stacks such as LangGraph, CrewAI, Azure OpenAI, Azure AI Foundry, and Azure AI Search.

### Cognee

Cognee is an AI memory and knowledge graph system. It is useful when memory is not just isolated facts, but relationships between facts.

Best for:

- Graph-aware memory.
- Multi-hop reasoning.
- Knowledge graph retrieval.
- Entity and relationship extraction.
- Permanent memory over documents and interactions.

Common architecture:

```text
Documents / Events / Conversations
-> Cognee ingestion
-> Entity extraction
-> Graph + vector storage
-> Search and graph traversal
-> Agent context
```

Cognee can use graph stores such as Kuzu, Neo4j, FalkorDB, Amazon Neptune, or Memgraph, and vector stores such as LanceDB, Qdrant, pgvector, Redis, Pinecone, ChromaDB, and others.

### Zep

Zep is a memory layer often used for conversational agents and long-term chat memory.

Best for:

- Conversation memory.
- User profiles.
- Summarized session memory.
- Retrieval from previous interactions.

### LangGraph Memory / Checkpointing

LangGraph supports checkpointing and state persistence. It is especially useful when memory is tied to graph execution state.

Best for:

- Stateful workflows.
- Pause and resume.
- Human-in-the-loop.
- Time travel debugging.
- Long-running multi-step agents.

### Graphiti

Graphiti is useful for temporal knowledge graphs where facts evolve over time.

Best for:

- Time-aware memory.
- Relationship-heavy agents.
- Changing facts and event history.

## Memory Design Questions

Before adding memory, answer:

- What should be remembered?
- Who owns the memory: user, project, organization, or agent?
- How long should it live?
- Can the user inspect, edit, or delete it?
- Is it personal data?
- Should it affect future decisions automatically?
- How do we prevent stale memory from overriding fresh instructions?
- How do we evaluate whether memory improved the answer?

---

# 7. Knowledge Layer

The knowledge layer is the system between agents and external information.

Bad architecture:

```text
Agent
-> MongoDB
```

Better architecture:

```text
Agent
-> Knowledge Layer
   -> MongoDB
   -> Postgres
   -> Vector DB
   -> Search Index
   -> Files
   -> APIs
   -> Web
```

The knowledge layer is responsible for:

- Retrieval.
- Ranking.
- Filtering.
- Permissions.
- Source tracking.
- Caching.
- Chunking.
- Embedding.
- Query rewriting.
- Hybrid search.
- Reranking.
- Context assembly.
- Memory writing.

## RAG Is Not Just Vector Search

A production RAG system may include:

```text
User query
-> Query rewrite
-> Hybrid retrieval
-> Metadata filtering
-> Reranking
-> Context compression
-> Citation formatting
-> Answer generation
-> Faithfulness evaluation
```

## Retrieval Types

- Keyword search.
- Vector search.
- Hybrid search.
- Graph retrieval.
- SQL retrieval.
- Knowledge graph traversal.
- Metadata-filtered retrieval.
- Multi-hop retrieval.
- Agentic retrieval.
- Structured RAG.

## Search, Vector, And Knowledge Tools

### Azure AI Search

Azure AI Search is a managed search and retrieval platform. It supports keyword search, vector search, hybrid search, semantic ranking, filters, and enterprise integration.

Best for:

- Azure-native RAG.
- Enterprise document search.
- Hybrid search.
- Memory backend for systems using Azure OpenAI or Azure AI Foundry.
- Production indexing, filtering, and access control.

### Azure AI Foundry

Azure AI Foundry is Microsoft's platform for building, evaluating, deploying, and managing AI apps and agents on Azure.

Best for:

- Azure OpenAI applications.
- Enterprise agent lifecycle.
- Model deployment.
- Evaluation.
- Safety and governance.
- Managed agent workflows.

### LlamaIndex

LlamaIndex is a strong choice for knowledge-heavy agents and RAG pipelines.

Best for:

- Data connectors.
- Indexing documents.
- Retrieval orchestration.
- RAG evaluation.
- Query engines.

### LangChain / LangGraph Retrieval

Useful when retrieval is part of a larger agent workflow.

Best for:

- Tool calling plus retrieval.
- Multi-step query decomposition.
- Retrieval inside graph nodes.

### Vector Databases

Common options:

- Pinecone.
- Weaviate.
- Qdrant.
- Milvus / Zilliz.
- ChromaDB.
- FAISS.
- LanceDB.
- pgvector.
- Redis Vector Search.
- MongoDB Atlas Vector Search.
- Elasticsearch / OpenSearch vector search.

### Graph Databases

Useful when relationships matter.

- Neo4j.
- Kuzu.
- Memgraph.
- FalkorDB.
- Amazon Neptune.
- ArangoDB.

### Rerankers And Retrieval Quality

Useful tools and models:

- Cohere Rerank.
- Jina Reranker.
- BGE rerankers.
- Voyage rerankers.
- Cross-encoder rerankers.
- ColBERT-style late interaction retrieval.

Use reranking when the first retrieval stage returns many possible chunks and the final context must be high precision.

---

# 8. Planning Systems

Planning is how an agent decomposes a goal into executable steps.

Basic pattern:

```text
Goal
-> Planner
-> Task list
-> Executor
-> Progress check
```

Example:

```text
Goal: Write a book.

Plan:
1. Clarify genre and audience.
2. Build world and characters.
3. Research topic constraints.
4. Create outline.
5. Draft chapters.
6. Edit chapters.
7. Humanize prose.
8. Fact-check.
9. Format final output.
```

## Planning Styles

### Single-Shot Planning

The agent creates a plan once and follows it.

Best for:

- Simple tasks.
- Low uncertainty.
- Short workflows.

### Iterative Planning

The agent updates the plan after each major step.

Best for:

- Research.
- Coding.
- Writing.
- Long workflows.

### Hierarchical Planning

A manager agent creates high-level tasks and delegates subtasks.

Best for:

- Multi-agent systems.
- Complex projects.
- Work with clear specialties.

### ReAct Loop

```text
Reason
-> Act
-> Observe
-> Reason
```

Best for:

- Tool-using agents.
- Search tasks.
- Debugging tasks.

### Plan-And-Execute

```text
Planner creates plan
-> Executor performs each step
-> Planner revises if needed
```

Best for:

- More controlled production systems.

## Planning Risks

- The plan is too vague.
- The plan is too long.
- The agent follows a bad plan blindly.
- The agent replans endlessly.
- The agent confuses planning with execution.
- The planner does not know tool constraints.

---

# 9. Reflection, Critique, And Replanning

Reflection is self-critique.

```text
Output
-> Critique
-> Improvement plan
-> Revised output
```

Reflection improves quality, but it must be bounded. Unlimited reflection causes latency and cost explosions.

## Reflection Patterns

### Self-Reflection

The same agent reviews its own output.

### Critic Agent

A separate agent checks the output.

### Verifier Tool

A deterministic tool validates facts, schema, tests, or constraints.

### Human Review

A person approves risky actions or final deliverables.

## Replanning

Replanning is recovery after new information or failure.

```text
Search failed
-> Diagnose failure
-> Choose another source
-> Retry
```

Good replanning needs:

- Failure classification.
- Retry limits.
- Alternative tools.
- Escalation path.
- Clear stop conditions.

---

# 10. Agent Topologies

Topology means how agents are arranged.

## Sequential

```text
A -> B -> C
```

Best for simple pipelines.

## Hierarchical

```text
Manager
├─ Researcher
├─ Writer
├─ Editor
└─ Fact Checker
```

Best for production multi-agent systems with clear roles.

## Peer-To-Peer

```text
Agent A <-> Agent B <-> Agent C
```

Best for collaborative debate, but harder to control.

## DAG

```text
Planner
├─ Research
├─ Worldbuilding
└─ Character Design
   -> Writer
   -> Editor
```

Best for parallelizable workflows.

## Cyclic

```text
Think -> Act -> Observe -> Think
```

Best for ReAct agents and iterative tool use.

## Consensus

```text
Agent A answer
Agent B answer
Agent C answer
-> Judge / Vote
-> Final answer
```

Best for high-risk reasoning, but expensive.

## Debate

Agents argue different positions before a judge decides.

Best for:

- Ambiguous analysis.
- Strategic decisions.
- Quality checks.

Risk:

- More tokens do not guarantee more truth.

---

# 11. Multi-Agent Communication

Agents can communicate through:

- Shared state.
- Direct messages.
- Event bus.
- Task queue.
- Memory store.
- Database.
- Workflow graph.
- Human approval queue.

## Communication Patterns

### Shared State

LangGraph-style systems often use shared state passed through nodes.

Best for:

- Explicit workflows.
- Easier debugging.
- Deterministic graph paths.

### Messages

AutoGen-style systems use agent-to-agent conversation.

Best for:

- Conversational collaboration.
- Research simulations.
- Debate.

### Event Bus

Agents emit and consume events.

Best for:

- Distributed systems.
- Long-running work.
- Background processing.

Common tools:

- Kafka.
- Redis Streams.
- RabbitMQ.
- NATS.
- Azure Service Bus.
- Google Pub/Sub.
- AWS SNS/SQS.

### Task Queue

Useful for async work.

Common tools:

- Celery.
- Dramatiq.
- RQ.
- BullMQ.
- Temporal.
- Azure Durable Functions.

---

# 12. Tool Use

Tools turn language into action.

Examples:

- Web search.
- File search.
- Database query.
- Code execution.
- Browser automation.
- Email.
- Calendar.
- CRM.
- Payment system.
- Internal API.
- RAG retriever.
- Memory writer.
- Image generation.
- Document parser.

## Tool Design Rules

Good tools are:

- Narrow.
- Typed.
- Named clearly.
- Permission-aware.
- Observable.
- Idempotent when possible.
- Safe by default.
- Easy to test outside the agent.

Bad tools:

- Do too many things.
- Accept vague string commands.
- Hide important failures.
- Return huge unstructured blobs.
- Allow destructive actions without confirmation.

## Tool Schema Design

Prefer structured arguments:

```json
{
  "chapter_id": "chapter_5",
  "operation": "fact_check",
  "strictness": "high"
}
```

Avoid vague arguments:

```json
{
  "input": "do the thing"
}
```

## Tool Output Design

Good tool output includes:

- Result.
- Status.
- Error reason.
- Source metadata.
- Confidence.
- Next suggested action when useful.

---

# 13. MCP: Model Context Protocol

MCP standardizes how agents connect to tools and data sources.

Think:

```text
MCP = USB-C style protocol for AI tools
```

It helps with:

- Tool discovery.
- Standardized tool calls.
- Reusable integrations.
- Separation between agent runtime and external systems.
- Safer local or enterprise tool access.

Common MCP server categories:

- Filesystem.
- GitHub.
- Git.
- Databases.
- Slack.
- Google Drive.
- Notion.
- Browser.
- Search.
- Cloud resources.
- Internal APIs.

MCP does not remove the need for permissions, audit logs, and tool guardrails.

---

# 14. Agent Frameworks In 2026

No framework is best for everything. Pick based on control, ecosystem, deployment target, and team skills.

## LangGraph

Best for:

- Production stateful workflows.
- Graph-based orchestration.
- Multi-agent systems.
- Checkpointing.
- Human-in-the-loop.
- Explicit control flow.

Use when:

- You need durable, inspectable, controllable agent workflows.
- You want graph nodes, edges, and state.

## LangChain

Best for:

- Tool integrations.
- Model abstractions.
- Chains.
- Prototyping.
- Integration ecosystem.

Use carefully in production; avoid overly magical chains when explicit code is clearer.

## LlamaIndex

Best for:

- RAG-first applications.
- Data connectors.
- Indexing.
- Retrieval.
- Query engines.
- Knowledge agents.

## OpenAI Agents SDK

Best for:

- OpenAI-first stacks.
- Tool calling.
- Handoffs.
- Guardrails.
- Tracing in the OpenAI ecosystem.

Use when:

- Your model and hosted tools are mainly OpenAI.
- You want low-friction agent construction.

## Microsoft Agent Framework / Semantic Kernel / AutoGen Family

Microsoft has been consolidating agent tooling around enterprise and Azure-native use cases.

Best for:

- Azure-native systems.
- .NET and Python teams.
- Enterprise governance.
- Azure AI Foundry integration.
- Multi-agent patterns descended from AutoGen.

Use when:

- Your organization already uses Azure, Microsoft identity, and Microsoft developer platforms.

## CrewAI

Best for:

- Role-based multi-agent teams.
- Fast prototypes.
- Clear agent personas.
- Research-to-writing workflows.

Use when:

- You want quick implementation and your process maps naturally to roles.

## AutoGen / AG2

Best for:

- Conversational multi-agent research.
- Agent-to-agent dialogue.
- Experiments.

Watch for:

- API and ecosystem changes as Microsoft tooling evolves.

## Pydantic AI

Best for:

- Type-safe Python agents.
- Structured outputs.
- Validation-heavy applications.
- Clear developer experience.

## Mastra

Best for:

- TypeScript agent applications.
- Full-stack JavaScript/TypeScript teams.
- Workflows, tools, memory, and evals in a TS ecosystem.

## Google ADK

Best for:

- Google Cloud workloads.
- Gemini-first applications.
- GCP-native deployment.

## Smolagents

Best for:

- Code-first lightweight agents.
- Hugging Face ecosystem.
- Simple tool-using agents.

## DSPy

Best for:

- Optimizing prompts and pipelines.
- Declarative LM programs.
- Evaluation-driven prompt improvement.

## Haystack

Best for:

- Search and RAG pipelines.
- Enterprise retrieval workflows.

---

# 15. Models And Model Providers

Agent design depends heavily on model capabilities.

## General Model Providers

- OpenAI.
- Anthropic.
- Google Gemini.
- Meta Llama ecosystem.
- Mistral.
- Cohere.
- xAI.
- DeepSeek.
- Microsoft Azure OpenAI.
- AWS Bedrock.
- Google Vertex AI.
- Groq.
- Together AI.
- Fireworks AI.
- Cerebras.
- SambaNova.
- Hugging Face.

## Model Selection Criteria

Choose models based on:

- Reasoning quality.
- Tool-calling reliability.
- Latency.
- Cost.
- Context window.
- JSON reliability.
- Multimodal support.
- Safety requirements.
- Data residency.
- Fine-tuning support.
- Provider reliability.
- Enterprise compliance.

## Common Model Roles

Use different models for different tasks:

- Strong reasoning model for planning.
- Fast cheap model for classification.
- Embedding model for retrieval.
- Reranker for search quality.
- Vision model for image or document understanding.
- Small local model for private or low-latency work.
- Judge model for evaluation.

---

# 16. Prompts And Instructions

Prompts are part of the system, not a magic spell.

A production prompt should define:

- Role.
- Goal.
- Scope.
- Constraints.
- Tool rules.
- Output format.
- Failure behavior.
- Escalation behavior.
- Examples when useful.

## Prompt Layering

```text
System instructions
-> Developer instructions
-> Agent role prompt
-> Task-specific prompt
-> Retrieved context
-> User input
```

## Prompt Anti-Patterns

- One giant prompt for every situation.
- Hidden business rules only inside prompts.
- No versioning.
- No tests.
- No examples for structured output.
- Asking the model to "always be correct".
- Letting retrieved documents override system instructions.

## Prompt Management Tools

- Langfuse prompts.
- LangSmith prompt hub.
- Humanloop.
- Braintrust.
- PromptLayer.
- Portkey.
- OpenAI prompt tooling.
- Azure AI Foundry prompt flow and evaluation tooling.

---

# 17. Structured Outputs

Structured outputs make agents easier to test and integrate.

Use structured outputs for:

- Plans.
- Tool arguments.
- Classifications.
- Extraction.
- Evaluation scores.
- Workflow decisions.
- Final API responses.

Example:

```json
{
  "decision": "continue",
  "next_agent": "editor",
  "reason": "Draft is complete but style consistency needs review."
}
```

Tools:

- JSON Schema.
- Pydantic.
- Zod.
- OpenAI structured outputs.
- Anthropic tool use.
- Guardrails AI.
- Instructor.
- Outlines.
- LMQL.

---

# 18. Guardrails And Safety

Guardrails prevent invalid, unsafe, or expensive behavior.

## Guardrail Types

### Input Guardrails

Detect:

- Prompt injection.
- Jailbreak attempts.
- Toxic content.
- Unsupported requests.
- Missing required fields.

### Output Guardrails

Validate:

- JSON schema.
- Tone.
- Policy compliance.
- Factuality.
- No secrets.
- No unsafe instructions.

### Tool Guardrails

Control:

- Which tools are available.
- Which arguments are allowed.
- Which actions require approval.
- Rate limits.
- Spending limits.

### Permission Guardrails

Enforce:

- User identity.
- Tenant boundaries.
- Role-based access control.
- Data access policies.

### Runtime Guardrails

Prevent:

- Infinite loops.
- Excessive cost.
- Repeated failing retries.
- Unsafe side effects.

## Guardrail Tools

- Guardrails AI.
- NVIDIA NeMo Guardrails.
- Lakera Guard.
- Llama Guard.
- OpenAI Moderation / safety tooling.
- Azure AI Content Safety.
- AWS Bedrock Guardrails.
- Google safety filters.
- Pydantic / Zod validation.
- Custom policy engines.

---

# 19. Evaluation

Evaluation answers:

```text
Did the agent actually succeed?
```

Most teams do not fail because they lack prompts. They fail because they cannot measure whether the agent improved.

## Evaluation Types

### Unit Tests

Test deterministic functions:

- Tool wrappers.
- Parsers.
- Schema validators.
- Retrieval filters.
- Permission checks.

### Golden Dataset Tests

Fixed input/output examples.

Use for:

- Regression testing.
- Prompt changes.
- Model upgrades.
- Retrieval changes.

### LLM-As-Judge

A model scores another model's output.

Useful for:

- Helpfulness.
- Completeness.
- Style.
- Relevance.

Risk:

- Judges can be biased or inconsistent.

### RAG Evaluation

Measure:

- Context precision.
- Context recall.
- Faithfulness.
- Groundedness.
- Answer relevance.
- Citation correctness.

Tools:

- Ragas.
- Arize Phoenix Evals.
- TruLens.
- DeepEval.
- UpTrain.
- LangSmith evals.
- Langfuse datasets and evals.
- Braintrust.

### Agent Evaluation

Measure:

- Goal completion.
- Tool choice quality.
- Number of steps.
- Recovery from failure.
- Cost.
- Latency.
- Human approval rate.
- Safety violations.
- Memory usefulness.

## Evaluation Loop

```text
Production traces
-> Sample failures
-> Label or judge
-> Build dataset
-> Run regression eval
-> Improve prompt / tools / retrieval
-> Deploy
-> Monitor again
```

---

# 20. Observability

Observability shows what happened inside the agent.

Without observability:

```text
You are blind.
```

Track:

- User request.
- Agent selected.
- Model calls.
- Prompt versions.
- Tool calls.
- Tool arguments.
- Tool outputs.
- Retrieved documents.
- Retrieved memories.
- Token usage.
- Cost.
- Latency.
- Errors.
- Retries.
- Human approvals.
- Final output.
- Evaluation scores.

## Observability Tools

### Langfuse

Best for:

- Open-source observability.
- Self-hosting.
- Prompt management.
- Traces.
- Datasets.
- Evaluations.
- Framework-agnostic use.

### LangSmith

Best for:

- LangChain and LangGraph projects.
- Agent debugging.
- Datasets.
- Evaluations.
- Trace inspection.

### Arize Phoenix

Best for:

- RAG evaluation.
- OpenTelemetry-native tracing.
- Retrieval quality.
- Embedding drift.

### Helicone

Best for:

- Gateway-style LLM logging.
- Fast setup.
- Caching.
- Cost tracking.

### Portkey

Best for:

- AI gateway.
- Multi-provider routing.
- Observability.
- Rate limits.
- Fallbacks.

### Braintrust

Best for:

- Evals.
- Prompt experiments.
- Dataset management.

### Datadog / New Relic / OpenTelemetry

Best for:

- Enterprise infrastructure observability.
- Connecting agent traces to backend services.
- Production monitoring.

Other useful tools:

- OpenLLMetry.
- W&B Weave.
- Comet Opik.
- Galileo.
- Lunary.
- TruLens.
- MLflow.

---

# 21. Reliability Engineering

Production agent systems need normal software reliability plus AI-specific reliability.

## Core Reliability Features

- Retries.
- Timeouts.
- Circuit breakers.
- Fallback models.
- Fallback tools.
- Queue-based async execution.
- Human escalation.
- Idempotency keys.
- Rate limiting.
- Cost limits.
- Loop detection.
- Dead-letter queues.
- Checkpointing.
- Rollbacks.
- Versioned prompts.
- Versioned tools.

## Failure Categories

### Model Failure

- Hallucination.
- Bad reasoning.
- Invalid JSON.
- Tool-call error.
- Refusal.
- Low-quality output.

### Tool Failure

- API down.
- Timeout.
- Permission denied.
- Bad arguments.
- Empty result.

### Retrieval Failure

- Wrong chunks.
- Missing documents.
- Stale index.
- Poor ranking.
- No citations.

### Memory Failure

- Wrong memory retrieved.
- Stale memory.
- Privacy issue.
- Over-personalization.

### Workflow Failure

- Infinite loop.
- Wrong next agent.
- Dead branch.
- No stop condition.

---

# 22. Human-In-The-Loop

Human-in-the-loop means the system asks for approval, correction, or review.

```text
Agent drafts action
-> Human reviews
-> Approve / edit / reject
-> Agent continues
```

Use HITL for:

- Financial actions.
- Legal workflows.
- Medical advice.
- Deleting data.
- Sending external messages.
- Publishing content.
- High-cost operations.
- Low-confidence outputs.

Design questions:

- Who approves?
- What exactly do they see?
- Can they edit the action?
- Is the approval logged?
- Can the agent continue after rejection?
- What happens if nobody responds?

---

# 23. Security, Privacy, And Governance

Agentic systems increase risk because they can take actions.

## Security Concerns

- Prompt injection.
- Tool injection.
- Data exfiltration.
- Secret leakage.
- Overbroad permissions.
- Cross-tenant data leaks.
- Unsafe code execution.
- Supply chain risk from tools and MCP servers.
- Indirect prompt injection from documents or websites.

## Security Practices

- Least privilege tools.
- Per-user authorization.
- Tenant isolation.
- Secret management.
- Audit logs.
- Input sanitization.
- Output filtering.
- Allowlisted tools.
- Sandboxed code execution.
- Network restrictions.
- Approval gates for side effects.
- Logging without sensitive data exposure.

## Secret Management

Tools:

- Azure Key Vault.
- AWS Secrets Manager.
- Google Secret Manager.
- HashiCorp Vault.
- Doppler.
- 1Password Secrets Automation.

## Policy And Governance Tools

- Open Policy Agent.
- Cedar / Amazon Verified Permissions.
- Microsoft Entra ID.
- Auth0 / Okta.
- WorkOS.
- Custom RBAC/ABAC service.

---

# 24. Deployment Architecture

Production deployment is more than hosting an API.

## Reference Architecture

```text
Client
-> API Gateway
-> Auth
-> Agent Orchestrator
-> State Store
-> Tool Registry
-> Knowledge Layer
-> Memory Layer
-> Queue / Worker System
-> Model Provider
-> Observability
-> Evaluation Pipeline
```

## Deployment Targets

### Azure

Useful services:

- Azure OpenAI.
- Azure AI Foundry.
- Azure AI Search.
- Azure Container Apps.
- Azure Kubernetes Service.
- Azure Functions.
- Azure App Service.
- Azure Cosmos DB.
- Azure Database for PostgreSQL.
- Azure Cache for Redis.
- Azure Service Bus.
- Azure Key Vault.
- Azure Monitor.
- Application Insights.
- Microsoft Entra ID.

Best for:

- Enterprise Microsoft stacks.
- Managed identity.
- Governance.
- Hybrid search and RAG.

### AWS

Useful services:

- Amazon Bedrock.
- Lambda.
- ECS.
- EKS.
- SageMaker.
- OpenSearch.
- Aurora Postgres with pgvector.
- DynamoDB.
- S3.
- SQS/SNS.
- EventBridge.
- Step Functions.
- Secrets Manager.
- CloudWatch.

Best for:

- AWS-native teams.
- Bedrock model access.
- Event-driven architectures.

### Google Cloud

Useful services:

- Vertex AI.
- Gemini.
- Cloud Run.
- GKE.
- Cloud Functions.
- BigQuery.
- AlloyDB / Cloud SQL.
- Firestore.
- Pub/Sub.
- Secret Manager.
- Cloud Logging.

Best for:

- Gemini-first workloads.
- Data and analytics-heavy systems.

### Multi-Cloud / Provider-Agnostic

Options:

- Kubernetes.
- Docker Compose for small deployments.
- Fly.io.
- Render.
- Railway.
- Vercel.
- Cloudflare Workers.
- Modal.
- Replicate.
- Baseten.
- Anyscale.
- Together AI / Fireworks for inference.

## Runtime Patterns

### Synchronous API

```text
Request -> Agent run -> Response
```

Best for:

- Short interactions.
- Chat.
- Quick tool calls.

### Async Job

```text
Request -> Queue -> Worker -> Progress events -> Final result
```

Best for:

- Long-running agents.
- Writing.
- Research.
- Code generation.
- Batch processing.

### Streaming

```text
Agent events -> Server-Sent Events / WebSocket -> Client
```

Best for:

- Chat UX.
- Progress visibility.
- Long tasks.

### Durable Workflow

```text
Workflow engine stores progress
-> Agent can pause/resume/retry
```

Best for:

- Human approvals.
- Enterprise workflows.
- Multi-hour or multi-day tasks.

Tools:

- Temporal.
- Azure Durable Functions.
- AWS Step Functions.
- Prefect.
- Dagster.
- Airflow for batch/data workflows.

---

# 25. Agentic Development Lifecycle

Use this phased approach.

## Phase 1: Problem Definition

Answer:

- What is the user goal?
- What does success mean?
- What should the agent never do?
- What data does it need?
- What tools does it need?
- Is autonomy actually needed?

Deliverables:

- Use-case description.
- Success criteria.
- Risk list.
- Initial eval cases.

## Phase 2: Workflow Design

Answer:

- Single agent or multi-agent?
- What are the agent roles?
- What is the topology?
- What state is needed?
- Where are approval gates?

Deliverables:

- Workflow diagram.
- State schema.
- Tool list.
- Failure paths.

## Phase 3: Context And Prompt Design

Answer:

- What instructions are stable?
- What context is dynamic?
- What output schemas are required?
- What examples are useful?

Deliverables:

- Prompt versions.
- Context assembly logic.
- Structured output schemas.

## Phase 4: Knowledge And Memory

Answer:

- What facts come from documents?
- What facts come from memory?
- What data is user-specific?
- What is the retrieval strategy?
- What should be forgotten?

Deliverables:

- Indexing pipeline.
- Memory policy.
- Retrieval tests.
- Source metadata design.

## Phase 5: Tool Implementation

Answer:

- What actions can the agent take?
- Which actions require approval?
- What errors can tools return?
- Are tools idempotent?

Deliverables:

- Tool schemas.
- Tool tests.
- Permission checks.
- Audit logs.

## Phase 6: Evaluation

Answer:

- How do we know the system works?
- What are regression examples?
- What are failure examples?
- Which metrics matter?

Deliverables:

- Golden dataset.
- Automated evals.
- Judge prompts.
- RAG metrics.
- Cost and latency thresholds.

## Phase 7: Deployment

Answer:

- Sync or async?
- What is the runtime?
- How are secrets managed?
- How are traces collected?
- How are model/provider failures handled?

Deliverables:

- API service.
- Worker service.
- Queue.
- Database.
- Secrets.
- Observability.
- Rollback plan.

## Phase 8: Operations

Answer:

- What alerts are needed?
- Who reviews failures?
- How are prompts updated?
- How are datasets improved?
- What is the incident process?

Deliverables:

- Dashboards.
- Alerts.
- Eval reports.
- Trace review workflow.
- Continuous improvement loop.

---

# 26. Bookish-Style Multi-Agent Architecture

For a book-generation platform, a useful role split is:

```text
User Request
-> Planner Agent
-> Researcher Agent
-> World Builder Agent
-> Writer Agent
-> Editor Agent
-> Final Assembler
```

## Planner Agent

Responsibilities:

- Understand user goal.
- Clarify missing requirements.
- Create chapter or task plan.
- Choose agent sequence.
- Track progress.

## Researcher Agent

Responsibilities:

- Gather factual material.
- Search documents or web.
- Summarize evidence.
- Keep sources.
- Flag uncertainty.

## World Builder Agent

Responsibilities:

- Build setting, lore, characters, rules, and continuity.
- Maintain story bible.
- Detect contradictions.

## Writer Agent

Responsibilities:

- Draft prose.
- Follow outline.
- Use research and world bible.
- Maintain voice.

## Editor Agent

Responsibilities:

- Improve structure.
- Remove repetition.
- Improve clarity.
- Enforce style.
- Check continuity and source consistency.

## Shared Stores

```text
State:
- current chapter
- active step
- agent outputs
- approval status

Knowledge:
- uploaded documents
- research notes
- source citations

Memory:
- user preferences
- project style
- recurring constraints
- past corrections
```

---

# 27. Tool And Platform Landscape

This is the practical toolbox to revisit later.

## Agent Frameworks

- LangGraph: stateful graph workflows.
- LangChain: integration ecosystem.
- LlamaIndex: RAG and knowledge systems.
- OpenAI Agents SDK: OpenAI-native agents.
- Microsoft Agent Framework / Semantic Kernel: Azure and enterprise agents.
- CrewAI: role-based multi-agent teams.
- AutoGen / AG2: conversational multi-agent systems.
- Pydantic AI: typed Python agents.
- Mastra: TypeScript agent framework.
- Google ADK: Google Cloud and Gemini agents.
- Smolagents: lightweight code-first agents.
- DSPy: optimization of LM pipelines.

## Memory Tools

- Mem0: persistent personalized memory.
- Cognee: graph-aware AI memory.
- Zep: conversation memory.
- Graphiti: temporal knowledge graphs.
- LangGraph checkpointing: workflow memory/state.
- Redis: fast session memory.
- Postgres / MongoDB: durable app memory.

## Search And Retrieval

- Azure AI Search.
- Elasticsearch.
- OpenSearch.
- Vespa.
- Solr.
- Typesense.
- Meilisearch.
- Pinecone.
- Qdrant.
- Weaviate.
- Milvus / Zilliz.
- ChromaDB.
- LanceDB.
- pgvector.
- MongoDB Atlas Vector Search.
- Redis Vector Search.

## Cloud AI Platforms

- Azure AI Foundry.
- Azure OpenAI.
- AWS Bedrock.
- Google Vertex AI.
- OpenAI Platform.
- Anthropic Console / API.
- Hugging Face.
- Together AI.
- Fireworks AI.
- Groq.
- Replicate.
- Modal.
- Baseten.

## Observability And Evals

- Langfuse.
- LangSmith.
- Arize Phoenix.
- Braintrust.
- Helicone.
- Portkey.
- OpenLLMetry.
- W&B Weave.
- Comet Opik.
- TruLens.
- Ragas.
- DeepEval.
- Galileo.
- Datadog LLM Observability.
- New Relic AI monitoring.

## Guardrails And Safety

- Guardrails AI.
- NeMo Guardrails.
- Lakera Guard.
- Llama Guard.
- Azure AI Content Safety.
- AWS Bedrock Guardrails.
- OpenAI moderation tooling.
- Google safety filters.
- Pydantic / Zod validation.

## Workflow And Queue Infrastructure

- Temporal.
- Azure Durable Functions.
- AWS Step Functions.
- Google Workflows.
- Celery.
- Redis Queue.
- BullMQ.
- RabbitMQ.
- Kafka.
- NATS.
- Azure Service Bus.
- SQS/SNS.

## App And API Deployment

- Docker.
- Kubernetes.
- Azure Container Apps.
- Azure Kubernetes Service.
- AWS ECS/EKS.
- Google Cloud Run/GKE.
- Vercel.
- Render.
- Railway.
- Fly.io.
- Cloudflare Workers.

## Databases

- Postgres.
- MongoDB.
- Redis.
- SQLite.
- MySQL.
- DynamoDB.
- Cosmos DB.
- Firestore.
- Neo4j.
- Kuzu.
- Memgraph.

## Document Processing

- Unstructured.
- LlamaParse.
- Azure Document Intelligence.
- AWS Textract.
- Google Document AI.
- Marker.
- Docling.
- PyMuPDF.
- pdfplumber.

## Browser And Computer Automation

- Playwright.
- Puppeteer.
- Selenium.
- Browserbase.
- Stagehand.
- OpenAI computer-use style tools.
- Anthropic computer-use style tools.

## Code Execution

- Sandboxed Python.
- E2B.
- Modal sandboxes.
- Docker sandboxes.
- Firecracker microVMs.
- Jupyter kernels.

---

# 28. Cost And Latency Optimization

Agents can become expensive quickly.

## Cost Drivers

- Large context.
- Too many reflection loops.
- Too many agents.
- Expensive models for simple tasks.
- Repeated retrieval.
- Long tool outputs.
- No caching.
- No stop condition.

## Optimization Techniques

- Use smaller models for simple classification.
- Cache retrieval results.
- Summarize long tool outputs.
- Limit reflection rounds.
- Use routing to choose model by task.
- Use batch processing where possible.
- Keep tool schemas concise.
- Store reusable context.
- Use reranking instead of sending too many chunks.
- Track cost per user, task, and agent.

## Model Routing Pattern

```text
Input
-> Task classifier
-> Cheap model for simple work
-> Strong model for hard reasoning
-> Specialized model for embeddings / vision / reranking
```

---

# 29. Common Production Anti-Patterns

Avoid these:

- Building an agent when a workflow is enough.
- Putting all logic in prompts.
- Giving the agent direct database access without a knowledge layer.
- No evals.
- No trace logs.
- No tool permission boundaries.
- No retry limits.
- No structured state.
- No memory deletion policy.
- No cost monitoring.
- No prompt versioning.
- Treating vector search as magic.
- Multi-agent architecture when one agent would work.
- Letting agents talk forever.
- Using reflection without measurable improvement.
- Deploying before defining success metrics.

---

# 30. Mental Models To Remember

## Agent

```text
LLM + tools + state + goal loop
```

## Context Engineering

```text
Choosing the right information at the right time
```

## Memory

```text
Persistent, selective, user/project/agent learning
```

## Knowledge Layer

```text
Controlled access to external truth
```

## Tool Use

```text
Language model decides; software executes
```

## Evaluation

```text
Proof that changes made the system better
```

## Observability

```text
The black box becomes inspectable
```

## Guardrails

```text
Autonomy with boundaries
```

---

# 31. Study Checklist

Use this to revise.

## Fundamentals

- Explain the difference between LLM, assistant, agent, and multi-agent system.
- Explain state vs memory vs knowledge.
- Explain why context engineering matters more than prompt tricks.
- Explain the ReAct loop.
- Explain when not to use agents.

## Architecture

- Design a single-agent workflow.
- Design a multi-agent workflow.
- Choose a topology.
- Define state schema.
- Define memory policy.
- Define knowledge layer.
- Define tool schemas.

## RAG And Memory

- Explain vector search.
- Explain hybrid search.
- Explain reranking.
- Explain graph retrieval.
- Explain long-term memory.
- Compare Mem0, Cognee, Zep, and custom memory.
- Explain Azure AI Search in an agent stack.

## Production

- Add retries and timeouts.
- Add checkpointing.
- Add human approval.
- Add observability.
- Add evals.
- Add cost monitoring.
- Add prompt versioning.
- Add deployment rollback.

## Evaluation

- Build a golden dataset.
- Run LLM-as-judge evals.
- Measure RAG faithfulness.
- Inspect failed traces.
- Convert failures into regression tests.

## Security

- Detect prompt injection.
- Limit tool permissions.
- Protect secrets.
- Enforce tenant isolation.
- Log audit trails.
- Add approval gates.

---

# 32. Interview And Self-Test Questions

1. When should you use an agent instead of a deterministic workflow?
2. What is the difference between state and memory?
3. Why is memory dangerous if not governed?
4. How does hybrid search improve RAG?
5. What does a reranker do?
6. How would you evaluate a research agent?
7. How would you debug an agent that loops forever?
8. How do you prevent prompt injection through retrieved documents?
9. What should be logged in an agent trace?
10. How do you choose between LangGraph, CrewAI, LlamaIndex, and OpenAI Agents SDK?
11. What belongs in the knowledge layer?
12. How do you design a safe tool?
13. What is MCP and why does it matter?
14. How do you deploy a long-running agent?
15. How do you reduce cost without lowering quality too much?
16. What is human-in-the-loop and where is it required?
17. How do you know memory helped instead of hurt?
18. How do you handle stale retrieved knowledge?
19. What is the difference between observability and evaluation?
20. What is the production incident process for a bad agent output?

---

# 33. Final Production Architecture

A mature production agent platform looks like this:

```text
User / Client
-> API Gateway
-> Authentication and Authorization
-> Agent Orchestrator
-> Planner
-> State Manager
-> Execution Agents
-> Tool Registry / MCP Servers
-> Knowledge Layer
-> Retrieval / Search / Vector DB
-> Memory Layer
-> Databases
-> Reflection / Critic
-> Guardrails
-> Evaluation Layer
-> Observability
-> Deployment Runtime
-> Final Output / Action
```

For Bookish-style systems:

```text
User
-> Planner
-> Researcher
-> World Builder
-> Writer
-> Editor
-> Final Composer
-> Trace + Eval + Memory Update
```

---

# 34. 2026 Practical Tool Selection Guide

Use these defaults unless a project has a reason to differ.

## If You Are Building A Complex Stateful Agent

Choose:

- LangGraph.
- LangSmith or Langfuse.
- Postgres or Redis for state.
- Temporal or queue workers for long-running jobs.

## If You Are Building A RAG-Heavy Agent

Choose:

- LlamaIndex or LangGraph plus custom retrieval.
- Azure AI Search, pgvector, Qdrant, Pinecone, or Weaviate.
- Ragas, Phoenix, or TruLens for RAG eval.

## If You Are Building Azure-Native Enterprise Agents

Choose:

- Azure AI Foundry.
- Azure OpenAI.
- Azure AI Search.
- Azure Container Apps or AKS.
- Azure Key Vault.
- Microsoft Entra ID.
- Azure Monitor / Application Insights.
- Mem0 or Cognee if persistent memory is needed.

## If You Need Persistent Personalization

Choose:

- Mem0 for simple persistent memory.
- Cognee or Graphiti when relationships and time matter.
- Zep for conversational memory.

## If You Need Fast Role-Based Prototyping

Choose:

- CrewAI.
- Langfuse for traces.
- A small vector store or managed search service.

## If You Need Typed Python Agents

Choose:

- Pydantic AI.
- Pydantic models for schemas.
- Structured evals.

## If You Need TypeScript Full-Stack Agents

Choose:

- Mastra.
- Vercel / Cloudflare / Node workers depending on workload.
- Zod schemas.

## If You Need Framework-Agnostic Observability

Choose:

- Langfuse.
- OpenTelemetry.
- Phoenix for retrieval-heavy evals.
- Datadog/New Relic if already used by the company.

---

# 35. Final Principle

If you deeply understand every section above, you are beyond prompt engineering.

You are thinking like an AI systems engineer:

```text
Goals
-> Context
-> State
-> Memory
-> Knowledge
-> Tools
-> Planning
-> Execution
-> Evaluation
-> Observability
-> Deployment
-> Reliability
```

The strongest agent builders are not the ones who write the longest prompts. They are the ones who design systems where models, tools, memory, data, humans, and infrastructure work together safely and measurably.
