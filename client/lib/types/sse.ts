import type {
  BookProject,
  ChapterItem,
  CharacterBibleItem,
  DecisionItem,
  GeneratedArtifact,
} from './project';

export type SyncEvent =
  | { event: 'sync_event'; type: 'artifact_created'; artifact: GeneratedArtifact }
  | { event: 'sync_event'; type: 'chapter_upserted'; chapter: ChapterItem }
  | { event: 'sync_event'; type: 'memory_upserted'; item: CharacterBibleItem }
  | { event: 'sync_event'; type: 'memory_deleted'; id: string }
  | { event: 'sync_event'; type: 'timeline_updated'; decisionLog: DecisionItem[] }
  | { event: 'sync_event'; type: 'project_snapshot'; projectState: BookProject };

export type StreamEvent =
  | { event: 'document_stream'; text?: string }
  | { event: 'agent_status'; text?: string }
  | { event: 'chat_message'; text?: string }
  | { event: 'user_confirmation'; text?: string; run_id?: string }
  | {
      event: 'done';
      reply?: string;
      thinking?: string;
      projectState?: BookProject;
      cost?: number;
      tokens?: number;
    }
  | SyncEvent
  | { event: 'error'; error?: string };
