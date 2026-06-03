export const endpoints = {
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (id: string) => `/api/projects/${id}`,
    delete: (id: string) => `/api/projects/${id}`,
    settings: {
      get: (id: string) => `/api/projects/${id}/settings`,
      update: (id: string) => `/api/projects/${id}/settings`,
    },
    assets: (id: string) => `/api/projects/${id}/assets`,
    message: (id: string) => `/api/projects/${id}/message`,
    messages: (id: string, sessionId?: string) =>
      `/api/projects/${id}/messages${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`,
    chatSessions: (id: string) => `/api/projects/${id}/chat-sessions`,
    clearChatSession: (id: string, sessionId: string) =>
      `/api/projects/${id}/chat-sessions/${encodeURIComponent(sessionId)}/messages`,
    resume: (id: string) => `/api/projects/${id}/resume`,
  },
} as const;
