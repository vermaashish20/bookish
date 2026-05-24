export interface ChapterItem {
  id: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  status: 'pending' | 'drafting' | 'completed';
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
  attributes: Record<string, string>;
  arc: string;
  activeChapters: number[];
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

export interface ModelConfig {
  provider: 'Ollama' | 'Gemini' | 'Claude' | 'OpenAI' | 'Nvidia' | 'Custom';
  modelName: string;
  apiKey?: string;
  endpointUrl?: string;
}

export interface ProjectSettings {
  plannerModel: ModelConfig;
  writerModel: ModelConfig;
  factCheckerModel: ModelConfig;
  humanizerModel: ModelConfig;
}

export interface BookProject {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  targetWordCount: number;
  tonality: 'Conversational' | 'Academic' | 'Storyteller' | 'Motivational' | 'Witty';
  brief: string;
  readerProfile: string;
  status: 'Drafting' | 'Reviewing' | 'Fact-Checking' | 'Humanizing' | 'Completed' | 'Ready';
  createdAt: string;
  chapters: ChapterItem[];
  assets: Asset[];
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
