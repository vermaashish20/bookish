# Quick Start Guide - New Orchestration System

## Overview

The new agent orchestration system is now live. This guide will help you get started quickly.

## Architecture

```
User → API → Orchestrator → [General Chat | Planner → Agents] → Response
```

## File Structure

```
server/
├── agents/
│   ├── orchestration_state.py      # State schema
│   ├── orchestrator.py             # Entry point & classification
│   ├── orchestration_graph.py      # LangGraph workflow
│   ├── nodes/
│   │   ├── planner_node.py         # ✅ Implemented
│   │   ├── researcher_node.py      # ✅ Implemented
│   │   ├── writer_node.py          # ✅ Implemented
│   │   ├── fact_checker_node.py    # ⏳ TODO
│   │   ├── humanizer_node.py       # ⏳ TODO
│   │   └── editor_node.py          # ⏳ TODO
│   └── utils.py
└── repository/
    ├── chat_messages.py            # New
    ├── agent_runs.py               # New
    ├── artifacts.py                # New
    └── project_memory.py           # New
```

## API Usage

### Endpoint (Unchanged)

```
POST /api/projects/{id}/prompt
```

### Request

```json
{
  "prompt": "Your instruction here"
}
```

### Response

```json
{
  "reply": "Agent response",
  "thinking": "Execution logs",
  "cost": 0.15,
  "tokens": 5000,
  "projectState": { /* full project */ }
}
```

## Examples

### 1. General Chat (Direct Answer)

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the book title?"}'
```

**Flow**: Orchestrator → General Chat → Response

### 2. Planning Task

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Plan a 10-chapter mystery novel"}'
```

**Flow**: Orchestrator → Planner → Response

### 3. Research Task

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Research Victorian London settings"}'
```

**Flow**: Orchestrator → Planner → Researcher → Response

### 4. Writing Task

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write the opening scene"}'
```

**Flow**: Orchestrator → Planner → Writer → Response

### 5. Multi-Agent Task

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write chapter 1 about a detective investigating a murder in Victorian London"}'
```

**Flow**: Orchestrator → Planner → Researcher → Writer → Response

## How It Works

### 1. Request Classification

The orchestrator classifies each request:

- **General Chat**: Simple questions, data retrieval
  - Keywords: "what", "who", "show", "list", "tell me"
  - Example: "What is the book title?"
  
- **Agent Task**: Planning, writing, research, editing
  - Keywords: "plan", "write", "draft", "research", "edit"
  - Example: "Write chapter 3"

### 2. Execution Flow

#### General Chat Flow
```
User Prompt
    ↓
Orchestrator (classify: general_chat)
    ↓
handle_general_chat()
    ├─ Query MongoDB
    ├─ Query ChromaDB
    └─ Build response
    ↓
finalize_node()
    └─ Save message
```

#### Agent Task Flow
```
User Prompt
    ↓
Orchestrator (classify: agent_task)
    ↓
planner_node()
    ├─ Load memories
    ├─ Query context
    ├─ Call LLM
    └─ Create task list
    ↓
[Execute tasks in sequence]
    ├─ researcher_node() (if needed)
    ├─ writer_node() (if needed)
    └─ [other agents...]
    ↓
finalize_node()
    ├─ Build final response
    └─ Save message & artifacts
```

### 3. State Management

State flows through the graph:

```python
AgentOrchestrationState {
    projectId: str
    userPrompt: str
    route: "general_chat" | "agent_task"
    plannerOutput: PlannerOutput
    tasks: List[TaskStatus]
    researchNotes: str
    draftContent: str
    artifactIds: List[str]
    finalResponse: str
    ...
}
```

### 4. Database Storage

Each execution creates:

1. **chat_messages** - User and assistant messages
2. **agent_runs** - Execution tracking
3. **artifacts** - Agent outputs (indexed in ChromaDB)
4. **project_memory** - Important decisions (optional)

## Configuration

### Model Settings

Configure in project settings:

```json
{
  "settings": {
    "plannerModel": {
      "provider": "Claude",
      "modelName": "claude-3-5-sonnet",
      "apiKey": "sk-..."
    },
    "writerModel": {
      "provider": "Claude",
      "modelName": "claude-3-5-sonnet",
      "apiKey": "sk-..."
    }
  }
}
```

### Supported Providers

- **Claude/Anthropic**: claude-3-5-sonnet, claude-3-opus
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo
- **Ollama**: Local models (llama3, mistral, etc.)
- **NVIDIA**: NIM models
- **Custom**: Any OpenAI-compatible endpoint

## Debugging

### Check Agent Runs

```python
from repository.agent_runs import get_project_agent_runs

runs = get_project_agent_runs("project_123", limit=5)
for run in runs:
    print(f"Run: {run['_id']}")
    print(f"Route: {run['route']}")
    print(f"Status: {run['status']}")
    if run.get('plannerDecision'):
        print(f"Agents: {run['plannerDecision']['agentsNeeded']}")
```

### Check Artifacts

```python
from repository.artifacts import get_project_artifacts

artifacts = get_project_artifacts("project_123")
for artifact in artifacts:
    print(f"Agent: {artifact['agentName']}")
    print(f"Type: {artifact['artifactType']}")
    print(f"Content: {artifact['content'][:100]}...")
```

### Check Chat Messages

```python
from repository.chat_messages import get_project_chat_messages

messages = get_project_chat_messages("project_123")
for msg in messages:
    print(f"{msg['role']}: {msg['content'][:50]}...")
```

## Common Issues

### Issue: Planner not routing correctly

**Solution**: Check classification keywords in `orchestrator.py`:

```python
agent_keywords = [
    "plan", "write", "draft", "edit", "improve", "rewrite",
    "research", "check", "verify", "fact", "humanize",
    "create chapter", "generate", "outline", "develop"
]
```

Add more keywords if needed.

### Issue: Agent not executing

**Solution**: Check task routing in `orchestration_graph.py`:

```python
def should_continue_tasks(state):
    next_task = state["tasks"][state["currentTaskIndex"]]
    agent_name = next_task["agent"]
    
    if agent_name == "researcher":
        return "researcher"
    elif agent_name == "writer":
        return "writer"
    # Add more agents here
```

### Issue: No artifacts created

**Solution**: Check ChromaDB and MongoDB connections:

```python
from db.mongo import get_db
from db.chroma import get_chroma_client

db = get_db()  # Should not raise error
client = get_chroma_client()  # Should not raise error
```

### Issue: LLM not responding

**Solution**: Check API keys in project settings:

```python
from repository.projects import get_project

project = get_project("project_123")
settings = project.get("settings", {})
planner_model = settings.get("plannerModel", {})
print(f"API Key configured: {bool(planner_model.get('apiKey'))}")
```

## Next Steps

1. **Test the system** with your project
2. **Implement remaining agents** (fact_checker, humanizer, editor)
3. **Add custom prompts** in `server/prompts/`
4. **Monitor performance** using agent_runs collection
5. **Extend functionality** by adding new agent nodes

## Resources

- **Full Documentation**: `ORCHESTRATION_README.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Migration Notes**: `MIGRATION_COMPLETE.md`
- **Architecture Spec**: `../Agent_Orchest.md`

## Support

For issues or questions:
1. Check the documentation files
2. Review agent execution logs in `agent_runs` collection
3. Check thinking logs in API responses
4. Verify database connections and API keys
