import { request } from './client';
import { endpoints } from './endpoints';
import type {
  AssetPayload,
  CreateProjectPayload,
  DeleteResponse,
  SettingsPayload,
  SettingsResponse,
} from '@/lib/types/api';
import type { BookProject } from '@/lib/types';
import type { ChatSession } from '@/lib/types/project';

export const fetchProjects = () =>
  request<BookProject[]>(endpoints.projects.list);

export const createProject = (payload: CreateProjectPayload) =>
  request<BookProject>(endpoints.projects.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchProject = (id: string) =>
  request<BookProject>(endpoints.projects.get(id));

export const deleteProject = (id: string) =>
  request<DeleteResponse>(endpoints.projects.delete(id), { method: 'DELETE' });

export const fetchSettings = (id: string) =>
  request<SettingsPayload>(endpoints.projects.settings.get(id));

export const saveSettings = (id: string, settings: SettingsPayload) =>
  request<SettingsResponse>(endpoints.projects.settings.update(id), {
    method: 'POST',
    body: JSON.stringify({ settings }),
  });

export const uploadAsset = (id: string, payload: AssetPayload) =>
  request<BookProject>(endpoints.projects.assets(id), {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const uploadAssetFile = (id: string, file: File, type?: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('name', file.name);
  if (type) form.append('type', type);
  return request<BookProject>(endpoints.projects.assets(id), {
    method: 'POST',
    body: form,
  });
};

export const fetchProjectMessages = (id: string, sessionId?: string) =>
  request<unknown[]>(endpoints.projects.messages(id, sessionId));

export const fetchChatSessions = (id: string) =>
  request<ChatSession[]>(endpoints.projects.chatSessions(id));

export const createChatSession = (id: string) =>
  request<ChatSession>(endpoints.projects.chatSessions(id), { method: 'POST' });

export const clearChatSessionMessages = (id: string, sessionId: string) =>
  request<{ status: string; sessionId: string; deleted: number }>(
    endpoints.projects.clearChatSession(id, sessionId),
    { method: 'DELETE' },
  );
