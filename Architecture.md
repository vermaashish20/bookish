# AIuthor System Architecture

This document details the production-ready architecture of **AIuthor**, an agentic system designed to compile high-quality, publication-ready books from a brief. The design leverages **LangGraph** on a Python server backend and a **Next.js** web UI, adhering strictly to the modular, robust orchestration principles required for this assessment.

---

## 1. Agent Topology & Orchestration

The system uses a **Stateful Orchestrator-Worker & DAG hybrid** powered by **LangGraph**. A single, centralized graph state maintains the book context, memory indices, and current stage of compilation. 

### Agent Network Topology
```text
+--------------------+
|  User Brief Input  |
+--------------------+
          |
          v
+------------------------+
| 1. Book Planner Agent  |
+------------------------+
          |
          v
+------------------------+
| 2. Memory Keeper Agent |
+------------------------+
          |
          v
.- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -.
: Chapter Generation DAG (Iterative per Chapter Loop)               :
:                                                                   :
:   +-------------------------+                                     :
:   | 3. Researcher (RAG)     |                                     :
:   +-------------------------+                                     :
:                |                                                  :
:                v                                                  :
:   +-------------------------+                                     :
:   | 4. Chapter Writer       |                                     :
:   +-------------------------+                                     :
:                |                                                  :
:                v                                                  :
:   +-------------------------+                                     :
:   | 5. Fact-Checker Agent   |                                     :
:   +-------------------------+                                     :
:                |                                                  :
:                v                                                  :
:   +-------------------------+                                     :
:   | 6. Humanizer Agent      |                                     :
:   +-------------------------+                                     :
:                |                                                  :
:                v                                                  :
:   +-------------------------+                                     :
:   | 7. Editor Agent         |                                     :
:   +-------------------------+                                     :
:                |                                                  :
:                v                                                  :
:   +----------------------------------------------+                :
:   | 2b. Memory Keeper (Register Chapter Memory) |                :
:   +----------------------------------------------+                :
'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
          |
          v
+------------------------------+
| 8. Book Assembler Agent      |
+------------------------------+
    |                      |
    +-----> [PDF Export]   +-----> [DOCX Export]
```

### Coordination Contracts & Orchestrator State
To enforce structured outputs without relying on brittle regex, all agent nodes communicate through a strictly validated **LangGraph State Schema** utilizing Pydantic.

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal

class ChapterOutline(BaseModel):
    chapter_number: int
    title: str
    target_word_count: int
    focus_areas: List[str]
    required_facts: List[str]
    character_arcs: Optional[List[str]] = None

class BookOutline(BaseModel):
    title: str
    subtitle: Optional[str] = None
    target_tonality: Literal["Conversational", "Academic", "Storyteller", "Motivational", "Witty"]
    front_matter_plan: List[str]
    chapters: List[ChapterOutline]
    back_matter_plan: List[str]

class MemoryState(BaseModel):
    fact_registry: Dict[str, str] = Field(default_factory=dict)
    character_bible: Dict[str, Dict] = Field(default_factory=dict)
    callback_index: List[Dict] = Field(default_factory=list)
    tonality_fingerprint: Dict[str, float] = Field(default_factory=dict)
    decision_log: List[Dict] = Field(default_factory=list)

class AgenticBookState(BaseModel):
    brief: Dict[str, str]
    outline: Optional[BookOutline] = None
    memory: MemoryState = Field(default_factory=MemoryState)
    chapters_content: Dict[int, str] = Field(default_factory=dict)
    current_chapter_index: int = 0
    observability_traces: List[Dict] = Field(default_factory=list)
```

---

## 2. Memory Stores (Schema & Design)

Memory is partitioned into five logical sub-stores inside `MemoryState`, preventing context-window stuffing while ensuring total continuity.

```text
+---------------------------------------------------------------------------------+
|                                  MemoryState                                    |
+---------------------------------------------------------------------------------+
|  * fact_registry: dict                                                          |
|  * character_bible: dict                                                        |
|  * callback_index: list                                                         |
|  * tonality_fingerprint: dict                                                   |
|  * decision_log: list                                                           |
+---------------------------------------------------------------------------------+
          |
          +-----------------------+-----------------------+-----------------------+
          |                       |                       |                       |
          v                       v                       v                       v
+-------------------+   +--------------------+   +------------------+   +-------------------+
|   FactRegistry    |   |   CharacterBible   |   |  CallbackIndex   |   |TonalityFingerprint|
+-------------------+   +--------------------+   +------------------+   +-------------------+
| - uuid: String    |   | - character_id: str|   | - callback_id:str|   | - conv_score: flt |
| - assertion: String|   | - name: String     |   | - setup_chap: int|   | - acad_score: flt |
| - source: String  |   | - role: String     |   | - payoff_chap:int|   | - story_score: flt|
| - verified_ch:List|   | - back_story: str  |   | - context: String|   | - motiv_score: flt|
|                   |   | - active_ch: List  |   | - resolved: Bool |   | - witty_score: flt|
+-------------------+   +--------------------+   +------------------+   +-------------------+
```

### Sub-Store Operational Definitions & Schemas

#### A. Fact Registry
* **Purpose**: Houses verified facts, definitions, and external figures. Used heavily in RAG-grounded non-fiction chapters.
* **Schema**:
```json
{
  "fact_registry": {
    "fact_001": {
      "assertion": "Compound interest is the addition of interest to the principal sum of a loan or deposit, or interest on interest.",
      "source": "Malkiel, B. G. (2020). A Random Walk Down Wall Street.",
      "verified_by": "Fact-Checker-Agent",
      "timestamp": "2026-05-23T20:45:00Z"
    }
  }
}
```

#### B. Concept/Character Bible
* **Purpose**: Tracks entity consistency (e.g., character descriptions, settings, or theoretical concepts). Ensures a character doesn't change hair color or a financial concept doesn't change definition.
* **Schema**:
```json
{
  "character_bible": {
    "char_sarah": {
      "name": "Sarah",
      "attributes": {
        "hair_color": "chestnut brown",
        "profession": "junior investment analyst",
        "personality": "risk-averse, highly analytical"
      },
      "arc": "Transitions from fearful budgeting to bold investments.",
      "active_chapters": [1, 2, 5]
    }
  }
}
```

#### C. Callback Index
* **Purpose**: Records narrative setups and payoffs. Allows the writer to explicitly resolve setups (e.g., referencing a coffee shop mentioned in Chapter 1 during a scene in Chapter 5).
* **Schema**:
```json
{
  "callback_index": [
    {
      "callback_id": "cb_001",
      "setup_chapter": 1,
      "payoff_chapter": 5,
      "context": "Sarah's green velvet notebook containing her initial micro-savings calculations",
      "resolved": false
    }
  ]
}
```

#### D. Tonality Fingerprint
* **Purpose**: Real-time styling profile containing metrics, forbidden AI patterns, and dynamic sentence rules that adapt per-chapter based on targeted tonality.
* **Schema**:
```json
{
  "tonality_fingerprint": {
    "target_preset": "Conversational",
    "forbidden_phrases": ["it's important to note", "delve into", "in today's fast-paced world", "not only, but also"],
    "metrics": {
      "avg_sentence_length_target": 14.5,
      "second_person_allowed": true,
      "metaphor_domain": "daily domestic finance"
    }
  }
}
```

#### E. Decision Log
* **Purpose**: An append-only audit trail capturing agent reasoning, failed validation attempts, and self-correction reasons.
* **Schema**:
```json
{
  "decision_log": [
    {
      "step": "Chapter 2 - RAG retrieval",
      "agent": "Fact-Checker",
      "action": "Flagged claim regarding historical tax rates as ungrounded.",
      "resolution": "Invoked Researcher-Agent to query BM25 vector index; updated assertion with official IRS citation."
    }
  ]
}
```

---

## 3. Detailed Data Flow & RAG Architecture

```text
[ Next.js Web UI ]              [ LangGraph Orchestrator ]              [ Vector Store / LLMs ]
        |                                   |                                      |
        |--- (1) Send Brief --------------->|                                      |
        |    (Topic, Tonality, Genre)       |--- (2) Run Planner & Initial Memory  |
        |                                   |                                      |
        |                                   |=== [Chapter Iteration Loop] =========|
        |                                   |                                      |
        |                                   |--- (3) Query Dense/Sparse Context -->|
        |                                   |<-- (4) Top-k Chunks + Reranking -----|
        |                                   |                                      |
        |                                   |--- (5) Send Outline & Memory ------->| [Writer LLM]
        |                                   |<-- (6) Raw Markdown Draft -----------|
        |                                   |                                      |
        |                                   |--- (7) Perform Citation Audit ------>| [Fact-Checker LLM]
        |                                   |<-- (8) Verification Pass / Soften ---|
        |                                   |                                      |
        |                                   |--- (9) Apply Style Fingerprint ----->| [Humanizer LLM]
        |                                   |<-- (10) Humanized Prose (No Tells) --|
        |                                   |                                      |
        |                                   |--- (11) Update Callback & Bible Logs |
        |                                   |                                      |
        |                                   |======================================|
        |                                   |                                      |
        |                                   |--- (12) Run Book Assembler ----------|
        |                                   |    (TOC, Front/Back Matter, PDFs)    |
        |<-- (13) Deliver Finished Book ----|                                      |
        |    (PDF, DOCX & Trace Bundle)     |                                      |
```

### The RAG Pipeline Specification
To guarantee that non-fiction books do not contain fabricated claims:
1. **Document Ingestion**: Factual reference documents (e.g., standard text-books, white papers) are parsed, chunked using *Semantic Chunking* (150–250 tokens), and indexed.
2. **Dense + Sparse Hybrid Search**:
   - **Dense**: OpenAI `text-embedding-3-small` stored in ChromaDB/Qdrant.
   - **Sparse**: BM25 ranking for exact keyword matches (e.g., specific law numbers, names).
3. **Reranking**: Candidate chunks are scored using a lightweight Cohere or Cross-Encoder model to select the top `k=5` highly relevant contexts.
4. **Strict Grounding**: The Writer and Fact-Checker are constrained to only refer to retrieved concepts. Unreferenced facts are subjected to the **Citation-or-Soften Rule** (e.g., "Studies indicate..." rather than "According to a 2024 Harvard report that does not exist").

---

## 4. Failure Paths & Self-Healing Logic

### Test D: Chapter Insertion Self-Healing Mechanism
When a new chapter is inserted between two existing chapters, it initiates a downstream repair cascade:

```text
+-----------------------------------------------+
|  Insert New Chapter between Chapter K and K+1 |
+-----------------------------------------------+
                        |
                        v
+-----------------------------------------------+
| Shift downstream chapter indexes (K+1 -> K+2) |
+-----------------------------------------------+
                        |
                        v
+-----------------------------------------------+
| Scan new chapter draft for new concepts/facts |
+-----------------------------------------------+
                        |
                        v
+-----------------------------------------------+
| Update Character Bible & Fact Registry State  |
+-----------------------------------------------+
                        |
                        v
+-----------------------------------------------+
| Identify setup / payoff references in K       |
| that impact downstream chapters (K+1 onwards) |
+-----------------------------------------------+
                        |
                        v
.- - - - - - - - - - - - - - - - - - - - - - - -.
: Cascading Downstream Repair Loop              :
:                                               :
:  +-----------------------------------------+  :
:  | Trigger Editor-Agent on affected chaps  |  :
:  +-----------------------------------------+  :
'- - - - - - - - - - - - - - - - - - - - - - - -'
                        |
                        v
+-----------------------------------------------+
| Re-generate Table of Contents & Glossary      |
+-----------------------------------------------+
                        |
                        v
+-----------------------------------------------+
|       Successfully Healed Book State          |
+-----------------------------------------------+
```

### Failure Mitigation Protocols
* **Factual Hallucination**: The Fact-Checker has an **abstention flag**. If a claim is unverifiable via internal RAG or web search, it either strips the claim or softens the language using pre-drafted templates.
* **API Rate Limits / Timeout**: LangGraph's built-in state saver acts as an explicit checkpointer. The graph state is committed to SQLite after each node. If an external API call fails, the graph retries with exponential backoff or yields gracefully, allowing manual resumption.
* **Context Overflow**: Long books trigger automated context window compression. When feeding history to the writer, the *Memory Keeper* creates a dense, bulleted summary of previous chapters' events and a copy of the active callback list, keeping the prompts lightweight and cost-efficient.

---

## 5. Observability, Cost Ledgers, and Evals

### Observability Trace Structure
Every workflow execution compiles a **Trace Bundle**, exported as structured JSON:

```json
{
  "run_id": "run_987654321",
  "brief": { "tonality": "Conversational", "chapters": 10 },
  "cost_ledger": {
    "total_input_tokens": 124500,
    "total_output_tokens": 45600,
    "total_cost_usd": 1.45,
    "model_distribution": {
      "gpt-4o": 0.95,
      "claude-3-5-sonnet": 0.40,
      "gpt-4o-mini": 0.10
    }
  },
  "agent_traces": [
    {
      "node": "Humanizer",
      "timestamp": "2026-05-23T20:46:12Z",
      "input_hash": "a4f89d...",
      "output_hash": "e932b1...",
      "checks_passed": {
        "no_ai_tells": true,
        "avg_sentence_variation_std_dev": 8.2
      }
    }
  ]
}
```

### Multi-Model Strategy (Routing Logic)
* **High-Reasoning/Heavy (GPT-4o or Claude 3.5 Sonnet)**: Assigned to **Planner**, **Writer** (for initial drafts), and **Humanizer** (requires deep style mapping).
* **Cost-Efficient/Fast (GPT-4o-mini / Claude 3.5 Haiku)**: Assigned to **Researcher**, **Fact-Checker**, and **Editor** (specifically for syntax and schema alignment).
* This routing maintains an optimal balance between human-grade writing quality and minimal API costs.

---

## 6. Verification & Automated Evaluation Rubric

Before a book is declared "Publication-Ready", it must pass our local automated eval suite:

| Metric Group | Evaluator Agent / Script | Target Criteria |
| :--- | :--- | :--- |
| **Structural Completeness** | Assembler Validator | 100% of required front matter, bodies, and back matter are present in correct sequence. |
| **Tonality Fidelity** | Style Judge (reward model score) | Euclidean distance in style embeddings must be <0.15 to exemplars of target tone. |
| **Humanization Grade** | AI-Tell Regex + LLM Judge | Zero instances of AI tells (`"delve"`, `"fast-paced world"`, `"not only...but also"`). |
| **Factual Coverage** | Fact-Checker | 100% of factual assertions must have a corresponding RAG source link. |
| **Callback Recall** | Memory Keeper Scan | All setups registered in `callback_index` must show a matching payoff in a later chapter. |

---

## 7. Web UI Design System (Next.js)

The web dashboard is designed using a sophisticated, premium dark-mode theme to visualizes the compilation stream in real-time.

* **Primary Color**: Deep Indigo (`#6366f1`)
* **Background Color**: Midnight Slate (`#0f172a` to `#1e293b` gradient)
* **Key Visual Elements**:
  - Live DAG execution trace graph (interactive node states).
  - Real-time Memory Store viewer (Character Bible cards, Callback lists).
  - Streamed prompt metrics (cost ledgers, token counters).
  - Beautiful document visualizer displaying the formatted PDF preview.
