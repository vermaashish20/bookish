import { API_BASE_URL } from '@/config/env';
import { ApiError } from './client';
import { endpoints } from './endpoints';
import type { StreamEvent } from '@/lib/types/sse';

const STREAM_DEBUG = process.env.NEXT_PUBLIC_STREAM_DEBUG === '1';

/**
 * POST /api/projects/:id/message — SSE stream.
 */
export async function submitMessageStream(
  projectId: string,
  message: string,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const url = `${API_BASE_URL}${endpoints.projects.message(projectId)}`;
  if (STREAM_DEBUG) {
    console.log('[SSE DEBUG] request_start', { url, projectId, messagePreview: message.slice(0, 120) });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (STREAM_DEBUG) {
    console.log('[SSE DEBUG] response', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
    });
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    const detail = (error as { detail?: string }).detail ?? response.statusText;
    throw new ApiError(detail, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    if (STREAM_DEBUG) console.warn('[SSE DEBUG] missing_response_body_reader');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const parseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) return;
    try {
      const event = JSON.parse(trimmed.slice(6)) as StreamEvent;
      if (STREAM_DEBUG) console.log('[SSE DEBUG] parsed_event', event);
      onEvent(event);
    } catch (err) {
      if (STREAM_DEBUG) console.warn('[SSE DEBUG] parse_error', { line: trimmed, err });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (STREAM_DEBUG) console.log('[SSE DEBUG] reader_done');
      break;
    }

    const decoded = decoder.decode(value, { stream: true });
    if (STREAM_DEBUG) console.log('[SSE DEBUG] raw_chunk', decoded);
    buffer += decoded;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) parseLine(line);
  }

  buffer += decoder.decode();
  if (buffer.trim()) parseLine(buffer);
  if (STREAM_DEBUG) console.log('[SSE DEBUG] stream_complete');
}
