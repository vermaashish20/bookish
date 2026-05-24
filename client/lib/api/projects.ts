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
import type { Asset, ChapterItem, ChatSession, GeneratedArtifact } from '@/lib/types/project';

let projectsListInflight: Promise<BookProject[]> | null = null;
const projectInflight = new Map<string, Promise<BookProject>>();

export function fetchProjects(options?: { force?: boolean }) {
  if (!options?.force && projectsListInflight) {
    return projectsListInflight;
  }

  const promise = request<BookProject[]>(endpoints.projects.list);
  projectsListInflight = promise;

  promise.finally(() => {
    if (projectsListInflight === promise) {
      projectsListInflight = null;
    }
  });

  return promise;
}

export function invalidateProjectsList() {
  projectsListInflight = null;
}

export function invalidateProject(id: string) {
  projectInflight.delete(id);
}

/** Minimal shell (title, genre, empty tab placeholders). */
export function fetchProject(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const inflight = projectInflight.get(id);
    if (inflight) return inflight;
  }

  const promise = request<BookProject>(endpoints.projects.get(id));
  projectInflight.set(id, promise);
  promise.finally(() => {
    if (projectInflight.get(id) === promise) {
      projectInflight.delete(id);
    }
  });
  return promise;
}

export type ProjectBookSection = Pick<BookProject, 'chapters' | 'status'>;
export type ProjectMemorySection = Pick<BookProject, 'brief' | 'assets' | 'memory'>;

export const fetchProjectBook = (id: string) =>
  request<ProjectBookSection>(endpoints.projects.book(id));

export const fetchProjectMemory = (id: string) =>
  request<ProjectMemorySection>(endpoints.projects.memory(id));

export const fetchChapter = (projectId: string, chapterId: string) =>
  request<ChapterItem>(endpoints.projects.chapter(projectId, chapterId));

export const fetchAsset = (projectId: string, assetId: string) =>
  request<Asset>(endpoints.projects.asset(projectId, assetId));

export const createProject = (payload: CreateProjectPayload) =>
  request<BookProject>(endpoints.projects.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

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
