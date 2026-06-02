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

export interface FactItem {
  id: string;
  assertion: string;
  source: string;
  verifiedBy: string;
  timestamp: string;
}

export interface CharacterBibleItem {
  id: string;
  name: string;
  role: string;
  type?: string;
  description?: string;
  attributes: Record<string, unknown>;
  arc: string;
  activeChapters: number[];
  status?: string;
}

export interface CallbackItem {
  id: string;
  setupChapter: number;
  payoffChapter: number;
  context: string;
  resolved: boolean;
}

export interface DecisionItem {
  timestamp: string;
  step: string;
  agent: string;
  action: string;
  resolution: string;
  artifactId?: string;
  artifactType?: string;
  artifactContent?: string;
}

export interface GeneratedArtifact {
  id: string;
  projectId: string;
  agentRunId: string;
  agentName: string;
  artifactType: string;
  content: string;
  metadata?: Record<string, unknown>;
  relatedChapterId?: string | null;
  createdAt: string;
}

export interface TonalityFingerprint {
  preset: string;
  conversational: number;
  academic: number;
  storyteller: number;
  motivational: number;
  witty: number;
  forbiddenPhrases: string[];
}

export interface MemoryState {
  factRegistry: FactItem[];
  characterBible: CharacterBibleItem[];
  callbackIndex: CallbackItem[];
  tonalityFingerprint: TonalityFingerprint;
  decisionLog: DecisionItem[];
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
  researcherModel: ModelConfig;
  writerModel: ModelConfig;
  factCheckerModel: ModelConfig;
  humanizerModel: ModelConfig;
  editorModel: ModelConfig;
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
  status: 'Drafting' | 'Reviewing' | 'Fact-Checking' | 'Humanizing' | 'Completed' | 'Ready' | string;
  createdAt: string;
  chapters: ChapterItem[];
  assets: Asset[];
  artifacts?: GeneratedArtifact[];
  memory: MemoryState;
  settings?: ProjectSettings;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'Planner' | 'Researcher' | 'Writer' | 'Fact-Checker' | 'Humanizer' | 'Editor' | 'Assembler' | 'System';
  text: string;
  timestamp: string;
  thinking?: string;
  cost?: number;
  tokens?: number;
}

export type PreviewItem = {
  type: 'user_asset' | 'fact' | 'character' | 'callback' | 'style' | 'timeline' | 'artifact';
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  artifactContent?: string;
};

export type WorkspaceTab = 'Agent' | 'Book' | 'Memory' | 'Settings';
