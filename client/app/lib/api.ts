/**
 * api.ts — Centralized API client for AIuthor backend
 * All backend communication goes through this module. No fetch calls in components.
 */

import type { BookProject } from '../types';
import type {
  AssetPayload,
  CreateProjectPayload,
  DeleteResponse,
  PromptPayload,
  PromptResponse,
  MessagePayload,
  MessageResponse,
  SettingsResponse,
  SettingsPayload,
} from './api.types';

export type { SettingsPayload };

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── API Endpoints Map ────────────────────────────────────────────────────────

export const API_ENDPOINTS = {
  // Projects endpoints
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (id: string) => `/api/projects/${id}`,
    delete: (id: string) => `/api/projects/${id}`,
    
    // Project settings
    settings: {
      get: (id: string) => `/api/projects/${id}/settings`,
      update: (id: string) => `/api/projects/${id}/settings`,
    },
    
    // Project assets
    assets: {
      upload: (id: string) => `/api/projects/${id}/assets`,
      uploadFile: (id: string) => `/api/projects/${id}/assets`,
    },
    
    // Project prompts (pointing to new message route)
    prompt: {
      submit: (id: string) => `/api/projects/${id}/message`,
    },
    
    // Project messages
    messages: {
      submit: (id: string) => `/api/projects/${id}/message`,
      list: (id: string) => `/api/projects/${id}/messages`,
    },
  },
} as const;

// ─── Generic Fetch Wrapper ────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: isFormData 
      ? options?.headers 
      : { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((error as { detail?: string }).detail ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Projects API ─────────────────────────────────────────────────────────────

/**
 * GET /api/projects
 * List all projects (summary with chaptersCount)
 */
export const fetchProjects = () =>
  request<BookProject[]>(API_ENDPOINTS.projects.list);

/**
 * POST /api/projects
 * Create a new project
 * @param payload - Project creation data
 * @param payload.run_agents - true → run planner graph immediately (default: true)
 */
export const createProject = (payload: CreateProjectPayload) =>
  request<BookProject>(API_ENDPOINTS.projects.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * GET /api/projects/:id
 * Get full unified project state
 * @param id - Project ID
 */
export const fetchProject = (id: string) =>
  request<BookProject>(API_ENDPOINTS.projects.get(id));

/**
 * DELETE /api/projects/:id
 * Hard-delete project and all related data
 * @param id - Project ID
 */
export const deleteProject = (id: string) =>
  request<DeleteResponse>(API_ENDPOINTS.projects.delete(id), { 
    method: 'DELETE' 
  });

// ─── Project Settings API ─────────────────────────────────────────────────────

/**
 * GET /api/projects/:id/settings
 * Get model routing configuration
 * @param id - Project ID
 */
export const fetchSettings = (id: string) =>
  request<SettingsPayload>(API_ENDPOINTS.projects.settings.get(id));

/**
 * POST /api/projects/:id/settings
 * Update model routing configuration
 * @param id - Project ID
 * @param settings - Model configuration settings
 */
export const saveSettings = (id: string, settings: SettingsPayload) =>
  request<SettingsResponse>(API_ENDPOINTS.projects.settings.update(id), {
    method: 'POST',
    body: JSON.stringify({ settings }),
  });

// ─── Project Assets API ───────────────────────────────────────────────────────

/**
 * POST /api/projects/:id/assets
 * Upload a reference file or prompt as JSON
 * @param id - Project ID
 * @param payload - Asset data
 */
export const uploadAsset = (id: string, payload: AssetPayload) =>
  request<unknown>(API_ENDPOINTS.projects.assets.upload(id), {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * POST /api/projects/:id/assets
 * Upload a file as FormData
 * @param id - Project ID
 * @param file - File to upload
 * @param type - Optional asset type
 */
export const uploadAssetFile = (id: string, file: File, type?: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('name', file.name);
  if (type) form.append('type', type);

  return request<unknown>(API_ENDPOINTS.projects.assets.uploadFile(id), {
    method: 'POST',
    body: form,
  });
};

// ─── Project Prompts API ──────────────────────────────────────────────────────

/**
 * POST /api/projects/:id/prompt
 * Send agent prompt, returns reply + updated state
 * (Deprecated, redirects to new message endpoint)
 * @param id - Project ID
 * @param prompt - User prompt text
 */
export const submitPrompt = (id: string, prompt: string) =>
  request<PromptResponse>(API_ENDPOINTS.projects.prompt.submit(id), {
    method: 'POST',
    body: JSON.stringify({ message: prompt } as MessagePayload),
  });

/**
 * POST /api/projects/:id/message
 * Send agent message, returns reply + updated state
 * @param id - Project ID
 * @param message - User message text
 */
export const submitMessage = (id: string, message: string) =>
  request<MessageResponse>(API_ENDPOINTS.projects.messages.submit(id), {
    method: 'POST',
    body: JSON.stringify({ message } as MessagePayload),
  });

/**
 * GET /api/projects/:id/messages
 * Fetch chat message history for the project
 * @param id - Project ID
 */
export const fetchProjectMessages = (id: string) =>
  request<unknown[]>(API_ENDPOINTS.projects.messages.list(id));
