export const endpoints = {
  agent: {
    threads: '/api/agent/threads',
    runStream: (threadId: string) =>
      `/api/agent/threads/${encodeURIComponent(threadId)}/runs/stream`,
  },
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (id: string) => `/api/projects/${id}`,
    book: (id: string) => `/api/projects/${id}/book`,
    memory: (id: string) => `/api/projects/${id}/memory`,
    delete: (id: string) => `/api/projects/${id}`,
    settings: {
      get: (id: string) => `/api/projects/${id}/settings`,
      update: (id: string) => `/api/projects/${id}/settings`,
    },
    assets: (id: string) => `/api/projects/${id}/assets`,
    asset: (id: string, assetId: string) =>
      `/api/projects/${id}/assets/${encodeURIComponent(assetId)}`,
    chapter: (id: string, chapterId: string) =>
      `/api/projects/${id}/chapters/${encodeURIComponent(chapterId)}`,
    artifact: (id: string, artifactId: string) =>
      `/api/projects/${id}/artifacts/${encodeURIComponent(artifactId)}`,
    messages: (id: string, threadId?: string) =>
      `/api/projects/${id}/messages${threadId ? `?thread_id=${encodeURIComponent(threadId)}` : ''}`,
    chatThreads: (id: string) => `/api/projects/${id}/chat-threads`,
    clearChatThread: (id: string, threadId: string) =>
      `/api/projects/${id}/chat-threads/${encodeURIComponent(threadId)}/messages`,
  },
} as const;
