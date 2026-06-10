# Bookish End-to-End Agent Test Plan

This file lists user queries to test the normal Bookish prototype flow. Each item includes the expected answer or agent flow so we can verify routing, tool use, persistence, preview sync, and book tab updates.

## 1. Project And Source Asset Awareness

### Query 1.1
User: "What did I provide in the initial brief?"

Answer/AgentFlow: Planner must not answer from chat memory. It should call `retrieve_knowledge` with `mode="persistent"`, `surface="source_assets"`, and `operation="read"`, then answer with a concise summary of the source asset contents and name the checked source assets.

### Query 1.2
User: "What are the initial story guidelines?"

Answer/AgentFlow: Planner calls persistent source asset retrieval. If guidelines are present, answer directly in chat with verified bullets. If not present, say which source surfaces were checked and what was missing.

### Query 1.3
User: "Who are the characters in this story?"

Answer/AgentFlow: Planner first checks persistent formal memory with `surface="characters"` or `surface="formal_memory"`. If formal records are empty, it must also check `surface="source_assets"` before saying no characters exist. Direct chat answer should distinguish promoted character records from unpromoted source-asset character notes.

### Query 1.4
User: "Look into source assets."

Answer/AgentFlow: Planner treats this as a factual retrieval request, not a meta-analysis. It calls persistent source asset retrieval and returns a direct chat summary grouped by plot, characters, world, tone/style, chapter outline, and gaps.

### Query 1.5
User: "Do we have anything about the cursed ledger?"

Answer/AgentFlow: Planner or researcher uses `retrieve_knowledge` in `rag` mode with scopes such as `assets`, `world`, `plot`, and `continuity`. If the semantic result is weak, follow with persistent source asset read. Answer with only verified findings.

## 2. Chat Session Behavior

### Query 2.1
User: "Start a new chat."

Answer/AgentFlow: Frontend should call the create chat session endpoint and switch `activeChatSessionId`. No specialist agent needed. The new chat should show an empty or fresh message list while project memory remains unchanged.

### Query 2.2
User: "Clear this chat."

Answer/AgentFlow: Frontend should call the clear active session endpoint. No project data, chapters, assets, or memory should be deleted. The active chat message list should clear.

### Query 2.3
User: "What were we discussing?"

Answer/AgentFlow: Direct chat can use recent session context for conversation recap only. It must not treat recent chat as evidence for project facts. If the user asks about story facts, it must retrieve from KB tools.

## 3. Planning And Agent Routing

### Query 3.1
User: "Can we start chapter 1?"

Answer/AgentFlow: Planner should retrieve source assets first if chapter objective is not already provided in current context. Then delegate to a normal writing flow, likely `researcher -> writer -> editor` or `writer -> editor` depending on retrieved context. It should produce a concise user-visible plan before execution.

### Query 3.2
User: "Write the first chapter from the brief."

Answer/AgentFlow: Planner calls persistent source asset retrieval, then delegates to writer with self-contained task details: chapter number, title/objective if known, characters, setting, tone, and constraints. Writer may retrieve source assets again if needed, writes draft prose, persists a draft artifact and draft chapter.

### Query 3.3
User: "Draft the next chapter."

Answer/AgentFlow: Planner calls `retrieve_knowledge` persistent list/read for chapters to determine the latest chapter and current status. It then retrieves source assets or continuity chunks as needed and delegates to writer. The next chapter number should be inferred from Mongo chapters, not chat memory.

### Query 3.4
User: "Plan the next three chapters."

Answer/AgentFlow: Planner retrieves source assets, chapter list, and existing chapter summaries. It can answer directly with a plan if no long artifact is needed, or delegate to planner/researcher style agent flow if a larger outline artifact is expected.

### Query 3.5
User: "Check if chapter 2 contradicts the character motivations."

Answer/AgentFlow: Planner retrieves chapter 2 from persistent chapters and retrieves character/formal memory plus source assets if formal memory is empty. Then delegate to `fact_checker`, which returns a fact-check report with verified, contradicted, and unverified items.

## 4. Knowledge Retrieval Mode Selection

### Query 4.1
User: "Show me the full text of chapter 1."

Answer/AgentFlow: Planner calls `retrieve_knowledge` with `mode="persistent"`, `surface="chapters"`, `operation="read"`, `chapter_number=1`. Direct response should return or summarize the full Mongo chapter text depending on chat size.

### Query 4.2
User: "Find where Elena's fear of the train is mentioned."

Answer/AgentFlow: Planner/researcher uses `mode="rag"` with scopes `characters`, `chapters`, `assets`, and `continuity` because this is a targeted semantic lookup. If exact chapter text is needed after finding a hit, follow with persistent chapter read.

### Query 4.3
User: "List all saved chapters."

Answer/AgentFlow: Planner calls persistent chapter list. Answer directly with chapter number, title, status, word count, and summary if available.

### Query 4.4
User: "What artifacts did the writer create?"

Answer/AgentFlow: Planner calls persistent artifact list with agent filter `writer`. Answer directly with artifact ids/types/timestamps and whether each maps to a draft chapter.

### Query 4.5
User: "Search all callbacks about the ledger."

Answer/AgentFlow: Planner/researcher uses RAG search with `callbacks`, `continuity`, `plot`, and `world` scopes. If callbacks are not yet indexed or persisted, answer that no callback entries were found and state checked surfaces.

## 5. World And Character Building

### Query 5.1
User: "Create formal character bibles from the source assets."

Answer/AgentFlow: Planner retrieves source assets persistently, then delegates to `world_builder`. World builder extracts characters and proposes draft character records. If HITL is required, it should ask for confirmation before persisting promoted bible entries.

### Query 5.2
User: "Add the ghost train station as a world entity."

Answer/AgentFlow: Planner retrieves source assets/world context, then delegates to `world_builder`. World builder creates a location/entity draft with name, type, description, attributes, and status. Persist only according to current world-builder save policy.

### Query 5.3
User: "What do we know about Elena?"

Answer/AgentFlow: Planner checks persistent formal character records by name. If not found, retrieve source assets. Answer should clearly label formal memory facts versus source-asset notes.

### Query 5.4
User: "Update Julian so he is less cynical."

Answer/AgentFlow: Planner retrieves Julian's formal character record and source notes. If a formal record exists, delegate to `world_builder` for edit. If only source notes exist, explain that the change can be applied when promoting or creating the character bible.

## 6. Drafting And Chapter Persistence

### Query 6.1
User: "Write chapter 1 in a storyteller tone."

Answer/AgentFlow: Planner retrieves source assets and chapter list, then delegates to writer. Writer retrieves needed canon before drafting. Writer saves a draft artifact and a Mongo chapter with `status="draft"`. Frontend should receive streamed large text in preview and later show the chapter in Book tab.

### Query 6.2
User: "Continue from the last chapter."

Answer/AgentFlow: Planner retrieves chapter list and latest chapter full text persistently. It may use RAG continuity search for callbacks/open threads. Writer drafts next chapter using last chapter context and source assets.

### Query 6.3
User: "Write a short scene where Elena opens the ledger."

Answer/AgentFlow: Planner should delegate to writer if user wants creative prose. If the scene is long enough to be an artifact, stream to preview and save as draft artifact. It may or may not create a chapter depending on task wording and existing writer-node behavior.

### Query 6.4
User: "Make this more atmospheric."

Answer/AgentFlow: If there is active draft content in state or selected artifact, planner delegates to `editor` or `humanizer` depending on whether the request is style polish or naturalization. If no active draft exists, ask what text/chapter to revise or retrieve the current chapter if implied.

## 7. Editing, Humanizing, And Fact Checking

### Query 7.1
User: "Edit chapter 1 for flow and grammar."

Answer/AgentFlow: Planner retrieves chapter 1 persistent text, then delegates to `editor`. Editor returns edited content, saves edited artifact, and updates draft content in state. If the app supports chapter overwrite, edited content should update the draft chapter.

### Query 7.2
User: "Humanize the latest draft."

Answer/AgentFlow: Planner retrieves latest draft artifact or chapter, then delegates to `humanizer`. Humanizer returns a more natural version and saves a humanized artifact.

### Query 7.3
User: "Fact check the draft against the source assets."

Answer/AgentFlow: Planner retrieves latest draft/chapter and source assets. Delegate to `fact_checker`. Fact checker should classify claims as verified, contradicted, or unverified and should not invent missing source facts.

### Query 7.4
User: "Does the chapter match the original tone guidelines?"

Answer/AgentFlow: Planner retrieves target chapter and source/style assets. Delegate to `fact_checker` or `editor` depending on wording. Direct answer should cite checked style guidelines.

## 8. Preview Panel And Artifact Behavior

### Query 8.1
User: "Give me a quick summary of the story."

Answer/AgentFlow: Direct chat response after source/chapter retrieval if needed. Should not create preview artifact unless the summary is long or explicitly requested as a document.

### Query 8.2
User: "Generate a chapter draft."

Answer/AgentFlow: Writer output is a large artifact. It should stream into the preview panel, save as artifact, and create/update a draft chapter in Mongo.

### Query 8.3
User: "Show this in the preview."

Answer/AgentFlow: If referring to an existing artifact/chapter, frontend should select that artifact/chapter for preview. If referring to a new generation request, agent flow should create an artifact.

### Query 8.4
User: "Just answer in chat, don't create a document."

Answer/AgentFlow: Planner should answer directly and avoid specialist artifact generation unless the requested task requires writing/editing long-form content.

## 9. Book Tab And Draft/Published Status

### Query 9.1
User: "Where is my draft chapter?"

Answer/AgentFlow: Planner lists persistent chapters. Frontend Book tab should display draft chapters with a draft badge. Direct answer can say which draft chapters exist and their statuses.

### Query 9.2
User: "Show all draft chapters."

Answer/AgentFlow: Planner calls persistent chapter list and filters `status="draft"` in the response. Book tab should already include them.

### Query 9.3
User: "Publish chapter 1."

Answer/AgentFlow: Planner should identify this as a state-changing chapter status update. If no safe publish tool/API exists yet, explain that publishing is not implemented or needs confirmation. Once implemented, update Mongo chapter status to `published` and refresh frontend.

### Query 9.4
User: "What chapters are published?"

Answer/AgentFlow: Planner calls persistent chapter list. Answer directly with published/completed chapters only.

## 10. Hierarchical RAG And Chunking Tests

### Query 10.1
User: "Search for the exact scene where the station first appears."

Answer/AgentFlow: Use RAG over `sourceKind` values `chapter` and `asset`. Expected future flow: search child chunks, deduplicate by `parentId`, then return parent scene/section context. Current prototype should at least search unified `project_knowledge`.

### Query 10.2
User: "What context surrounds the ledger mention?"

Answer/AgentFlow: RAG should retrieve the precise child chunk for "ledger", then expand to parent section/scene. If parent-child retrieval is not yet implemented, answer with retrieved chunk and recommend persistent source/chapter read for full context.

### Query 10.3
User: "Compare Elena's first appearance with her later behavior."

Answer/AgentFlow: Researcher uses RAG over chapters/assets/characters, likely multiple searches. It should retrieve relevant chunks, then persistent chapter reads if needed for broader context. Answer with evidence grouped by early appearance and later behavior.

## 11. Failure And Missing Evidence Behavior

### Query 11.1
User: "What is the ending of the book?"

Answer/AgentFlow: Planner retrieves source assets and chapters. If the ending exists in source outline, answer from source. If no ending exists, state that no verified ending was found in checked sources.

### Query 11.2
User: "Is Marcus a main character?"

Answer/AgentFlow: Planner checks formal characters and source assets. If Marcus is missing, answer that no verified Marcus record/note was found, naming checked surfaces.

### Query 11.3
User: "Use the old answer you gave earlier."

Answer/AgentFlow: Recent chat can provide intent context, but project facts must be verified again through KB tools before use.

### Query 11.4
User: "Make up a missing detail if needed."

Answer/AgentFlow: Agent may invent only if the user explicitly authorizes new creative content. It must label invented content as new proposal, not existing canon, and should route to writer/world_builder if it becomes project content.

## 12. Full Normal End-To-End Flow

### Query 12.1
User: "Read my source assets and tell me the story setup."

Answer/AgentFlow: Planner retrieves persistent source assets and answers directly with verified setup.

### Query 12.2
User: "Create character and world bibles from that."

Answer/AgentFlow: Planner delegates to `world_builder` after source retrieval. World builder drafts character/world entries and persists or asks for confirmation according to save policy.

### Query 12.3
User: "Now write chapter 1."

Answer/AgentFlow: Planner retrieves source assets, formal memory, and chapter list. Delegate to writer, optionally editor. Writer saves draft artifact/chapter. Preview streams the generated prose. Book tab displays Chapter 1 as draft.

### Query 12.4
User: "Fact check it."

Answer/AgentFlow: Planner retrieves Chapter 1 draft and source/formal memory. Delegate to fact_checker. Fact checker produces report artifact.

### Query 12.5
User: "Edit and humanize it."

Answer/AgentFlow: Planner retrieves latest chapter/draft content. Delegate to editor and/or humanizer in logical order. Save edited/humanized artifacts and update preview.

### Query 12.6
User: "Show me all chapters in the book tab."

Answer/AgentFlow: Frontend should already display Mongo chapters, including draft and published statuses. Planner can list persistent chapters in chat if asked.

## Final Test Checklist

- Project-factual questions call KB tools before answering.
- Source assets are checked before claiming no characters, plot, or guidelines exist.
- Persistent reads are used for full source assets and full chapter text.
- RAG is used for targeted semantic lookup.
- Agent delegation occurs for writing, editing, humanizing, fact checking, and world building.
- Writer output creates a draft artifact and draft chapter.
- Large generated text streams into preview.
- Book tab displays Mongo draft chapters with draft/published tags.
- Chat sessions can be created and cleared without deleting project memory.
- Missing evidence is stated clearly instead of invented.
