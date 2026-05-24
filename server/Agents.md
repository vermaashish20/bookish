# Agent Prompts Structure Plan

To create a clean separation of concerns and explicitly define what each agent is capable of, we will move all system prompts into the `server/prompts/` directory as individual Python files (e.g., `planner.py`, `writer.py`). 

## Orchestration Architecture (DAG)

To answer your question: We do not need a dynamic "re-planning" loop after every agent, nor do we need a complex LLM "Assembler Agent". Instead, the **Planner** acts as the architect *once* at the beginning to create a blueprint (a sequential array of tasks). Then, a deterministic Python router (`should_continue_tasks`) dispatches each task sequentially. When an agent finishes, it passes control back to the central router to trigger the next task on the Planner's list. Finally, a deterministic `Finalize` node assembles everything.

Here is the hierarchical line-box-shaped DAG illustrating this flow. It shows how the data gathering/creation agents pass their artifacts down to the Memory Keeper, who then archives them so the writing/editing agents can utilize them:

```text
                   ┌───────────────┐
                   │  User Query   │
                   └───────┬───────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │      Planner      │ (Analyzes query & creates task array)
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │  Task Dispatcher  │<─────────────────────────────────┐
                 │ (Sequential Loop) │                                  │
                 └─────────┬─────────┘                                  │
                           │                                            │
         ┌─────────────────┼─────────────────┐                          │
         │                 │                 │                          │
         ▼                 ▼                 ▼                          │
   ┌───────────┐     ┌───────────┐     ┌───────────┐                    │
   │  World    │     │ Researcher│     │ Fact      │                    │
   │  Builder  │     │           │     │ Checker   │                    │
   └─────┬─────┘     └─────┬─────┘     └─────┬─────┘                    │
         │                 │                 │                          │
         │   ┌─────────────▼─────────────┐   │                          │
         └──>│       Memory Keeper       │<──┘ (Takes artifacts from    │
             │   (Updates DB via HITL)   │      gatherers and saves     │
             └─────────────┬─────────────┘      them to long-term DB)   │
                           │                                            │
         ┌─────────────────┼─────────────────┐                          │
         │                 │                 │                          │
         ▼                 ▼                 ▼                          │
   ┌───────────┐     ┌───────────┐     ┌───────────┐                    │
   │  Writer   │     │  Editor   │     │ Humanizer │                    │
   │ (Drafts)  │     │ (Polishes)│     │  (Tones)  │                    │
   └─────┬─────┘     └─────┬─────┘     └─────┬─────┘                    │
         │                 │                 │                          │
         └─────────────────┴─────────────────┴──────────────────────────┘
                           │ 
                           │ (When task array is empty)
                           ▼
                 ┌───────────────────┐
                 │     Finalize      │ (Assembles final chat response)
                 └───────────────────┘
```
*Note: The Task Dispatcher loop guarantees this hierarchy. The Planner is smart enough to order the task array so that dependencies are met (e.g., `[Researcher -> Memory Keeper -> Writer -> Editor]`). Thus, the Writer is independent and only does writing work based on the data already gathered and saved by the preceding agents.*

---

## Standard Prompt Architecture
Every agent's system prompt will contain these 5 sections:
1. **Identity & Role**: Who the agent is and what its primary goal is.
2. **Capabilities & Constraints**: What the agent is explicitly allowed and NOT allowed to do.
3. **Provided Context**: A template section for injecting workspace state (Memories, Characters, Drafts, RAG).
4. **Task Instruction**: The specific command or sub-task assigned to the agent.
5. **Output Schema**: The exact formatting required (e.g., Markdown structure or strict JSON).

---

## Agent Breakdown

### 1. Planner Agent (`planner.py`)
**Role:** The master orchestrator and task delegator.
**Capabilities:** 
- Analyzes the user's root request and creates a sequential list of sub-tasks.
- **Dependency Routing:** The LLM is explicitly trained on the interdependency of agents. It knows it must route creations (like World Builder) to verification (Fact Checker) before final archival (Memory Keeper). The Planner entirely controls this dynamic handoff sequence.
- Routes tasks to specialized agents.
- Cannot write actual story prose or modify long-term memory itself.
**Output Schema:** Strict JSON.

### 2. Memory Keeper Agent (`memory_keeper.py`)
**Role:** The librarian and long-term archivist.
**Capabilities:**
- **Separation of Concerns:** The Memory Keeper *does not invent or create lore*. It acts purely as a database administrator.
- Takes generated lore (from the World Builder) or story events (from the Writer) and parses them into structured database records for the `character_bible`, `entities`, `callback_index`, and `episodic_logs` collections.
- **CRITICAL:** Must pause and ask the user for confirmation (via the HITL UI) before committing any changes to the database collections.
**Output Schema:** Strict JSON representing database update commands or records to insert.

### 3. World Builder Agent (`world_builder.py`)
**Role:** The lore master and character developer.
**Capabilities:**
- **Separation of Concerns:** The World Builder is purely a *creative* engine. It invents new characters, locations, and magic systems.
- Extracts world-building details from user prompts and research notes to expand the universe.
- Cannot write narrative story chapters.
- Cannot save anything to the database directly. It simply outputs its creations as Markdown artifacts, which the Planner then hands off to the Memory Keeper to be filed away.
**Output Schema:** Structured Markdown containing character sheets, lore entries, or location descriptions.

### 4. Researcher Agent (`researcher.py`)
**Role:** The context gatherer.
**Capabilities:**
- Searches the workspace's vector database (ChromaDB).
- Summarizes information to pass downstream to the Writer.
**Output Schema:** A bulleted "Research Report" artifact.

### 5. Writer Agent (`writer.py`)
**Role:** The creative engine.
**Capabilities:**
- Writes raw narrative prose, dialogue, and action sequences.
- Cannot self-edit for perfect grammar (leaves that to the Editor).
**Output Schema:** Raw markdown narrative prose.

### 6. Fact Checker Agent (`fact_checker.py`)
**Role:** The continuity auditor.
**Capabilities:**
- Reads the newly generated draft from the Writer and cross-references it against Memory.
- Identifies plot holes, timeline errors, or out-of-character actions.
**Output Schema:** A "Continuity Audit Report" detailing passes/fails and suggested fixes.

### 7. Humanizer Agent (`humanizer.py`)
**Role:** The tone specialist.
**Capabilities:**
- Rewrites prose to remove "AI-sounding" cliches.
**Output Schema:** Revised narrative prose.

### 8. Editor Agent (`editor.py`)
**Role:** The final polish.
**Capabilities:**
- Fixes grammar, punctuation, and structural flow.
**Output Schema:** Final polished narrative prose.

---

## User Review Required
> [!IMPORTANT]
> Does the ASCII DAG diagram successfully clarify how tasks are routed and assembled without needing an LLM "Assembler Agent" or a dynamic re-evaluation loop? 
> Let me know if you are ready to proceed with execution!
