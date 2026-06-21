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
  pendingWrite?: {
    preview?: string;
    content?: string;
    agent?: string;
    artifactId?: string;
    [key: string]: unknown;
  };
};

export type LangGraphCustomPayload = {
  kind?: string;
  runId?: string;
  status?: string;
  summary?: string;
  tasks?: LangGraphTask[];
  reply?: string;
  projectState?: BookProject;
  agent?: string;
  artifactType?: string;
  contentPreview?: string;
  pendingWrite?: unknown;
  delta?: string;
  target?: 'chat' | 'preview';
  [key: string]: unknown;
};

/** LangGraph protocol channel event (custom, tasks, …). */
export type LangGraphProtocolEvent = {
  event: 'protocol';
  seq: number;
  method: string;
  namespace?: string[];
  data?: unknown;
};

export type LangGraphStreamEvent =
  | LangGraphProtocolEvent
  | { event: 'done'; interrupted?: boolean }
  | { event: 'error'; error?: string };

export type AgentThread = {
  threadId: string;
  projectId: string;
};
