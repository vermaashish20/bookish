import type { BookProject } from './project';

export type LangGraphTask = {
  agent?: string;
  task?: string;
  status?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  outputArtifactId?: string | null;
  error?: string | null;
  chapterId?: string | null;
};

export type LangGraphInterrupt = {
  kind?: string;
  runId?: string;
  projectId?: string;
  threadId?: string;
  summary?: string;
  prompt?: string;
  tasks?: LangGraphTask[];
};

export type LangGraphCustomPayload = {
  kind?: string;
  runId?: string;
  status?: string;
  summary?: string;
  tasks?: LangGraphTask[];
  reply?: string;
  projectState?: BookProject;
  [key: string]: unknown;
};

export type LangGraphStreamPart = {
  type?: 'updates' | 'custom' | 'tasks' | 'checkpoints' | string;
  data?: unknown;
  [key: string]: unknown;
};

export type LangGraphStreamEvent =
  | { event: 'langgraph'; part: LangGraphStreamPart }
  | { event: 'done' }
  | { event: 'error'; error?: string };

export type AgentThread = {
  threadId: string;
  projectId: string;
  chatSessionId: string;
};

