import { API_BASE_URL } from '@/config/env';
import type { AgentThread, LangGraphStreamEvent } from '@/lib/types/langgraph';
import { ApiError } from './client';
import { endpoints } from './endpoints';

type StreamRunInput =
  | {
      projectId: string;
      message: string;
      command?: never;
    }
  | {
      command: { resume: unknown };
      projectId: string;
      message?: never;
    };

export async function createAgentThread(projectId: string): Promise<AgentThread> {
  const response = await fetch(`${API_BASE_URL}${endpoints.agent.threads}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError((error as { detail?: string }).detail ?? response.statusText, response.status);
  }

  return response.json() as Promise<AgentThread>;
}

export async function streamAgentRun(
  threadId: string,
  input: StreamRunInput,
  onEvent: (event: LangGraphStreamEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${endpoints.agent.runStream(threadId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError((error as { detail?: string }).detail ?? response.statusText, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  const parseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) return;
    onEvent(JSON.parse(trimmed.slice(6)) as LangGraphStreamEvent);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) parseLine(line);
  }

  buffer += decoder.decode();
  if (buffer.trim()) parseLine(buffer);
}
