import type { BookProject } from '@/lib/types';
import type { LangGraphCustomPayload, LangGraphInterrupt, LangGraphTask } from '@/lib/types/langgraph';
import { isPreviewableArtifactContent, WRITING_ARTIFACT_TYPES } from '@/lib/agent/display';

export type AgentStreamHandlers = {
  onCustom: (payload: LangGraphCustomPayload) => void;
  onInterrupt: (interrupt: LangGraphInterrupt) => void;
  onDone: (interrupted: boolean) => void;
  onError: (message: string) => void;
};

export type LangGraphProtocolEvent = {
  event: 'protocol';
  seq: number;
  method: string;
  namespace?: string[];
  data?: unknown;
};

export type LangGraphDoneEvent = {
  event: 'done';
  interrupted?: boolean;
};

export type LangGraphErrorEvent = {
  event: 'error';
  error?: string;
};

export type LangGraphStreamEvent =
  | LangGraphProtocolEvent
  | LangGraphDoneEvent
  | LangGraphErrorEvent;

export function isCustomPayload(data: unknown): data is LangGraphCustomPayload {
  return Boolean(data && typeof data === 'object' && 'kind' in (data as Record<string, unknown>));
}

function interruptValue(item: unknown): LangGraphInterrupt | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const value = record.value ?? record;
  if (!value || typeof value !== 'object') return null;
  const payload = value as LangGraphInterrupt;
  if (payload.kind === 'write_approval' || payload.kind === 'plan_approval') {
    return {
      ...payload,
      pendingWrite:
        payload.pendingWrite ??
        (typeof (value as Record<string, unknown>).pendingWrite === 'object'
          ? ((value as Record<string, unknown>).pendingWrite as LangGraphInterrupt['pendingWrite'])
          : undefined),
    };
  }
  return null;
}

export function interruptsFromTaskData(data: unknown): LangGraphInterrupt[] {
  if (!data || typeof data !== 'object') return [];
  const interrupts = (data as { interrupts?: unknown }).interrupts;
  if (!Array.isArray(interrupts)) return [];
  return interrupts
    .map(interruptValue)
    .filter((item): item is LangGraphInterrupt => item !== null);
}

export function handleAgentStreamEvent(
  event: LangGraphStreamEvent,
  handlers: AgentStreamHandlers,
): void {
  if (event.event === 'error') {
    handlers.onError(event.error ?? 'Unknown error');
    return;
  }

  if (event.event === 'done') {
    handlers.onDone(Boolean(event.interrupted));
    return;
  }

  if (event.event !== 'protocol') return;

  if (event.method === 'custom' && isCustomPayload(event.data)) {
    handlers.onCustom(event.data);
    return;
  }

  if (event.method === 'tasks') {
    for (const interrupt of interruptsFromTaskData(event.data)) {
      handlers.onInterrupt(interrupt);
    }
  }
}

export type CustomEventEffects = {
  chatText?: string;
  statusText?: string;
  previewText?: string;
  textDelta?: string;
  streamTarget?: 'chat' | 'preview';
  clearPreview?: boolean;
  projectState?: BookProject;
  pendingConfirmation?: {
    text: string;
    run_id: string;
    summary?: string;
    tasks?: LangGraphTask[];
  } | null;
};

export function effectsFromCustomPayload(payload: LangGraphCustomPayload): CustomEventEffects {
  const effects: CustomEventEffects = {};

  switch (payload.kind) {
    case 'text_delta': {
      const delta = typeof payload.delta === 'string' ? payload.delta : '';
      const target = payload.target === 'preview' ? 'preview' : 'chat';
      if (delta) {
        effects.textDelta = delta;
        effects.streamTarget = target;
      }
      break;
    }
    case 'plan_created':
      effects.chatText = payload.summary ?? 'Plan created.';
      effects.statusText = 'Plan created.';
      break;
    case 'task_started':
      effects.statusText = `Running ${String(payload.agent ?? 'agent')}...`;
      break;
    case 'task_completed':
      effects.statusText = `${String(payload.agent ?? 'Agent')} completed.`;
      break;
    case 'write_proposed': {
      const pendingWrite = payload.pendingWrite;
      if (pendingWrite && typeof pendingWrite === 'object') {
        const pw = pendingWrite as { content?: unknown; preview?: unknown };
        const full = typeof pw.content === 'string' ? pw.content : undefined;
        const short = typeof pw.preview === 'string' ? pw.preview : undefined;
        effects.previewText = full || short;
      }
      break;
    }
    case 'artifact_created': {
      const artifactType = String(payload.artifactType ?? '');
      const contentPreview =
        typeof payload.contentPreview === 'string' ? payload.contentPreview : '';
      if (
        WRITING_ARTIFACT_TYPES.has(artifactType) &&
        isPreviewableArtifactContent(contentPreview, artifactType)
      ) {
        effects.previewText = contentPreview;
      }
      break;
    }
    case 'run_completed':
    case 'run_rejected':
      if (typeof payload.reply === 'string') {
        effects.chatText = payload.reply;
      }
      if (payload.projectState) {
        effects.projectState = payload.projectState as BookProject;
      }
      effects.clearPreview = true;
      break;
    case 'project_updated':
      if (payload.projectState) {
        effects.projectState = payload.projectState as BookProject;
      }
      break;
    default:
      break;
  }

  return effects;
}
