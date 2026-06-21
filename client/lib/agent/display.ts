export const WRITING_ARTIFACT_TYPES = new Set(['draft', 'edited_content']);

export function isToolCallPayload(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.type === 'tool_call' || typeof parsed.tool_call === 'string') {
        return true;
      }
    } catch {
      const lower = trimmed.toLowerCase();
      if (lower.includes('"tool_call"') && lower.includes('"arguments"')) {
        return true;
      }
    }
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('retrieve_knowledge') && lower.includes('"arguments"')) {
    return true;
  }

  return false;
}

export function sanitizeAssistantText(text: string, fallback = ''): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  if (isToolCallPayload(trimmed)) return fallback;
  return trimmed;
}

export function isPreviewableArtifactContent(text: string, artifactType?: string | null): boolean {
  if (!WRITING_ARTIFACT_TYPES.has(artifactType ?? '')) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return !isToolCallPayload(trimmed);
}
