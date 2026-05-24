/**
 * api.types.ts — Type definitions for API requests and responses
 */

// ─── API Request Payloads ─────────────────────────────────────────────────────

export interface ModelConfigPayload {
  provider: string;   // 'OpenAI' | 'Claude' | 'Gemini' | 'Ollama' | 'Nvidia' | 'Custom'
  modelName: string;
  apiKey?: string;
  endpointUrl?: string;
}

export interface SettingsPayload {
  plannerModel: ModelConfigPayload;
  writerModel: ModelConfigPayload;
  factCheckerModel: ModelConfigPayload;
  humanizerModel?: ModelConfigPayload;
}

export interface CreateProjectPayload {
  title: string;
  subtitle?: string;
  genre?: string;
  brief: string;
  /** true → run planner graph immediately after creation (default: true) */
  run_agents: boolean;
}

export interface AssetPayload {
  name: string;
  type: string;
  content: string;
}

export interface PromptPayload {
  prompt: string;
}

export interface MessagePayload {
  message: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PromptResponse {
  reply: string;
  thinking: string;
  cost: number;
  tokens: number;
  projectState: unknown;
}

export interface MessageResponse {
  reply: string;
  thinking: string;
  cost: number;
  tokens: number;
  projectState: unknown;
}

export interface DeleteResponse {
  message: string;
}

export interface SettingsResponse {
  message: string;
}
