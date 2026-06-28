import type { ProjectSettings } from './project';

export interface ModelConfigPayload {
  provider: string;
  modelName: string;
  apiKey?: string;
  endpointUrl?: string;
}

export type SettingsPayload = ProjectSettings;

export interface CreateProjectPayload {
  title: string;
  subtitle?: string;
  genre?: string;
  brief: string;
}

export interface AssetPayload {
  name: string;
  type: string;
  content: string;
}

export interface DeleteResponse {
  message: string;
}

export interface SettingsResponse {
  message: string;
  settings?: ProjectSettings;
}

