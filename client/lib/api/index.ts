export { ApiError, request } from './client';
export { endpoints } from './endpoints';
export { createAgentThread, streamAgentRun } from './agent';
export * from './projects';

/** @deprecated Use endpoints.projects — kept for gradual migration */
export const API_ENDPOINTS = {
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (id: string) => `/api/projects/${id}`,
    delete: (id: string) => `/api/projects/${id}`,
    settings: {
      get: (id: string) => `/api/projects/${id}/settings`,
      update: (id: string) => `/api/projects/${id}/settings`,
    },
    assets: {
      upload: (id: string) => `/api/projects/${id}/assets`,
      uploadFile: (id: string) => `/api/projects/${id}/assets`,
    },
    messages: {
      list: (id: string) => `/api/projects/${id}/messages`,
    },
  },
} as const;
