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
import type { ChatSession, GeneratedArtifact } from '@/lib/types/project';

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

export const fetchArtifact = (id: string, artifactId: string) =>
  request<GeneratedArtifact>(endpoints.projects.artifact(id, artifactId));

export const fetchProjectMessages = (id: string, threadId?: string) =>
  request<unknown[]>(endpoints.projects.messages(id, threadId));

export const fetchChatThreads = (id: string) =>
  request<ChatSession[]>(endpoints.projects.chatThreads(id));

export const createChatThread = (id: string) =>
  request<ChatSession>(endpoints.projects.chatThreads(id), { method: 'POST' });

export const clearChatThreadMessages = (id: string, threadId: string) =>
  request<{ status: string; threadId: string; deleted: number }>(
    endpoints.projects.clearChatThread(id, threadId),
    { method: 'DELETE' },
  );

/** @deprecated Use fetchChatThreads */
export const fetchChatSessions = fetchChatThreads;
/** @deprecated Use createChatThread */
export const createChatSession = createChatThread;
/** @deprecated Use clearChatThreadMessages */
export const clearChatSessionMessages = clearChatThreadMessages;
