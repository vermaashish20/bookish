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
    
    // HITL Resume
    resume: (id: string) => `/api/projects/${id}/resume`,
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
 * POST /api/projects/:id/message (Streaming version)
 * Send agent message and call onChunk callback on incoming events in real-time.
 */
export const submitMessageStream = async (
  id: string,
  message: string,
  onChunk: (data: {
    event: string;
    text?: string;
    thinking?: string;
    projectState?: any;
    reply?: string;
    cost?: number;
    tokens?: number;
    error?: string;
    run_id?: string;
  }) => void
): Promise<void> => {
  console.log('='.repeat(80));
  console.log('[DEBUG STREAM] Starting submitMessageStream');
  console.log('[DEBUG STREAM] Project ID:', id);
  console.log('[DEBUG STREAM] Message:', message);
  console.log('[DEBUG STREAM] API URL:', `${BASE_URL}${API_ENDPOINTS.projects.messages.submit(id)}`);
  
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.projects.messages.submit(id)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  console.log('[DEBUG STREAM] Response status:', response.status);
  console.log('[DEBUG STREAM] Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    console.error('[DEBUG STREAM] ❌ Request failed:', error);
    throw new Error((error as { detail?: string }).detail ?? `Request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error('[DEBUG STREAM] ❌ No reader available');
    return;
  }

  console.log('[DEBUG STREAM] ✅ Reader obtained, starting to read stream...');

  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;
  let tokenCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      console.log('[DEBUG STREAM] ✅ Stream complete');
      console.log('[DEBUG STREAM] Total chunks received:', chunkCount);
      console.log('[DEBUG STREAM] Total tokens received:', tokenCount);
      break;
    }

    chunkCount++;
    buffer += decoder.decode(value, { stream: true });
    
    if (chunkCount % 10 === 0) {
      console.log(`[DEBUG STREAM] Chunk #${chunkCount}, buffer size: ${buffer.length} bytes`);
    }
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(dataStr);
          
          if (parsed.event === 'token') {
            tokenCount++;
            if (tokenCount % 10 === 0) {
              console.log(`[DEBUG STREAM] ✅ Token #${tokenCount}:`, parsed.text?.substring(0, 30));
            }
          } else {
            console.log('[DEBUG STREAM] Event received:', parsed.event);
          }
          
          onChunk(parsed);
        } catch (e) {
          console.warn('[DEBUG STREAM] ⚠️ Failed to parse SSE line:', trimmed, e);
        }
      }
    }
  }

  // Flush remaining buffer
  buffer += decoder.decode(new Uint8Array(), { stream: false });
  const trimmed = buffer.trim();
  if (trimmed.startsWith('data: ')) {
    try {
      const parsed = JSON.parse(trimmed.slice(6));
      console.log('[DEBUG STREAM] Final event from buffer:', parsed.event);
      onChunk(parsed);
    } catch (e) {
      console.warn('[DEBUG STREAM] ⚠️ Failed to parse final buffer:', e);
    }
  }
  
  console.log('='.repeat(80));
};

/**
 * GET /api/projects/:id/messages
 * Fetch chat message history for the project
 * @param id - Project ID
 */
export const fetchProjectMessages = (id: string) =>
  request<unknown[]>(API_ENDPOINTS.projects.messages.list(id));

/**
 * POST /api/projects/:id/resume
 * Resume a paused agent thread
 * @param id - Project ID
 * @param runId - Agent run ID
 * @param response - User's response (e.g. 'yes' or 'no')
 */
export const resumeAgent = (id: string, runId: string, response: string) =>
  request<{ status: string; response: string }>(API_ENDPOINTS.projects.resume(id), {
    method: 'POST',
    body: JSON.stringify({ run_id: runId, response }),
  });
