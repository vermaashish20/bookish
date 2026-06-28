export interface ChapterItem {
  id: string;
  number: number;
  title: string;
  content?: string;
  summary?: string;
  wordCount: number;
  status: 'pending' | 'drafting' | 'draft' | 'completed' | 'published';
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  size?: string;
  addedAt: string;
  content?: string;
}

export interface CharacterItem {
  id: string;
  name: string;
  role: string;
  arc: string;
  activeChapters: number[];
  attributes: Record<string, unknown>;
  status?: string;
}

export interface WorldEntityItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  attributes: Record<string, unknown>;
  status?: string;
}

export interface ProjectVoice {
  genre: string;
  tonality: string;
  bookSummary?: string;
  readerProfile?: string;
  targetWordCount?: number;
  forbiddenPhrases?: string[];
}

export interface GeneratedArtifact {
  id: string;
  projectId: string;
  agentRunId: string;
  agentName: string;
  artifactType: string;
  content?: string;
  metadata?: Record<string, unknown>;
  relatedChapterId?: string | null;
  createdAt: string;
}

/** Artifact preview shape used in the Agent tab preview panel. */
export interface ArtifactPreviewItem {
  timestamp: string;
  step: string;
  agent: string;
  action: string;
  resolution: string;
  artifactId?: string;
  artifactType?: string;
  artifactContent?: string;
}

/** @deprecated Use ArtifactPreviewItem — kept for Agent tab artifact preview. */
export type DecisionItem = ArtifactPreviewItem;

export interface MemoryState {
  projectVoice: ProjectVoice;
  characters: CharacterItem[];
  worldEntities: WorldEntityItem[];
}

export type LLMProvider =
  | 'Ollama'
  | 'Gemini'
  | 'Claude'
  | 'OpenAI'
  | 'OpenRouter'
  | 'Sarvam'
  | 'Nvidia'
  | 'Custom';

export interface ModelConfig {
  provider: LLMProvider;
  modelName: string;
  apiKey?: string;
  endpointUrl?: string;
}

export interface ProjectSettings {
  plannerModel: ModelConfig;
  writerModel: ModelConfig;
  worldBuilderModel: ModelConfig;
}

export interface BookProject {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  targetWordCount?: number;
  tonality: 'Conversational' | 'Academic' | 'Storyteller' | 'Motivational' | 'Witty';
  brief: string;
  readerProfile?: string;
  bookSummary?: string;
  status: 'Drafting' | 'Reviewing' | 'Fact-Checking' | 'Humanizing' | 'Completed' | 'Ready' | string;
  createdAt: string;
  chapters: ChapterItem[];
  assets: Asset[];
  artifacts?: GeneratedArtifact[];
  memory: MemoryState;
  settings?: ProjectSettings;
  chapterCount?: number;
  publishedChapterCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'Planner' | 'Researcher' | 'World Builder' | 'Writer' | 'Editor' | 'Assembler' | 'System';
  text: string;
  timestamp: string;
  thinking?: string;
  cost?: number;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type PreviewItem = {
  type: 'user_asset' | 'character' | 'world_entity' | 'chapter' | 'project_voice' | 'artifact';
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  artifactContent?: string;
};

export type WorkspaceTab = 'Agent' | 'Book' | 'Memory' | 'Settings';

export type MemorySubTab = 'Sources' | 'Knowledge';
