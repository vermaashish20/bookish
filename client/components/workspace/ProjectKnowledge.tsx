'use client';

import React from 'react';
import {
  BookProject,
  CharacterItem,
  ChapterItem,
  PreviewItem,
  WorldEntityItem,
} from '@/lib/types';

interface ProjectKnowledgeProps {
  book: BookProject;
  selectedPreviewItem: PreviewItem | null;
  setSelectedPreviewItem: (item: PreviewItem | null) => void;
}

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    location: 'Location',
    organization: 'Organization',
    object: 'Object',
    concept: 'Concept',
  };
  return labels[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function statusLabel(status?: string): string {
  const value = status ?? 'draft';
  if (value === 'published' || value === 'completed') return 'Published';
  return 'Draft';
}

function statusClass(status?: string): string {
  const value = status ?? 'draft';
  if (value === 'published' || value === 'completed') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function formatAttributes(attributes: Record<string, unknown>): string {
  const entries = Object.entries(attributes ?? {});
  if (entries.length === 0) return '_No extra attributes recorded._';
  return entries.map(([key, value]) => `- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join('\n');
}

function MemorySection({
  title,
  badge,
  badgeClass,
  count,
  emptyMessage,
  children,
}: {
  title: string;
  badge?: string;
  badgeClass?: string;
  count: number;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
      <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          {title} ({count})
        </span>
        {badge && (
          <span className={`text-[9px] border px-1 py-0.5 rounded uppercase font-semibold scale-90 ${badgeClass ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
            {badge}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-[10px] italic text-zinc-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">{children}</div>
      )}
    </div>
  );
}

function SelectableCard({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
        isActive
          ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
          : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
      }`}
    >
      {children}
    </button>
  );
}

export default function ProjectKnowledge({
  book,
  selectedPreviewItem,
  setSelectedPreviewItem,
}: ProjectKnowledgeProps) {
  const voice = book.memory.projectVoice;
  const characters = book.memory.characters;
  const worldEntities = book.memory.worldEntities;
  const chapters = book.chapters;

  const openVoicePreview = () => {
    const lines = [
      `**Genre:** ${voice.genre || book.genre || 'Not set'}`,
      `**Voice / tonality:** ${voice.tonality || book.tonality}`,
    ];
    if (voice.targetWordCount) lines.push(`**Target length:** ${voice.targetWordCount.toLocaleString()} words`);
    if (voice.readerProfile) lines.push(`\n**Reader profile:**\n${voice.readerProfile}`);
    if (voice.bookSummary || book.bookSummary) {
      lines.push(`\n**Story summary:**\n${voice.bookSummary || book.bookSummary}`);
    }
    if (voice.forbiddenPhrases && voice.forbiddenPhrases.length > 0) {
      lines.push(`\n**Avoid phrases:**\n${voice.forbiddenPhrases.map((phrase) => `- ${phrase}`).join('\n')}`);
    }

    setSelectedPreviewItem({
      type: 'project_voice',
      id: 'project-voice',
      title: 'Genre & voice',
      subtitle: `${voice.genre || book.genre} · ${voice.tonality || book.tonality}`,
      content: lines.join('\n'),
    });
  };

  const openCharacterPreview = (character: CharacterItem) => {
    setSelectedPreviewItem({
      type: 'character',
      id: character.id,
      title: character.name,
      subtitle: `${character.role || 'Character'} · ${statusLabel(character.status)}`,
      content: [
        `**Name:** ${character.name}`,
        `**Role:** ${character.role || '—'}`,
        `**Arc:** ${character.arc || 'Not defined yet'}`,
        `**Status:** ${statusLabel(character.status)}`,
        character.activeChapters?.length
          ? `**Active chapters:** ${character.activeChapters.join(', ')}`
          : '**Active chapters:** None yet',
        `\n**Attributes:**\n${formatAttributes(character.attributes)}`,
      ].join('\n\n'),
    });
  };

  const openWorldPreview = (entity: WorldEntityItem) => {
    setSelectedPreviewItem({
      type: 'world_entity',
      id: entity.id,
      title: entity.name,
      subtitle: `${entityTypeLabel(entity.type)} · ${statusLabel(entity.status)}`,
      content: [
        `**Name:** ${entity.name}`,
        `**Type:** ${entityTypeLabel(entity.type)}`,
        `**Status:** ${statusLabel(entity.status)}`,
        `\n**Description:**\n${entity.description || 'No description yet.'}`,
        `\n**Attributes:**\n${formatAttributes(entity.attributes)}`,
      ].join('\n\n'),
    });
  };

  const openChapterPreview = (chapter: ChapterItem) => {
    const excerpt = chapter.content?.trim()
      ? `\n\n**Excerpt:**\n${chapter.content.slice(0, 1200)}${chapter.content.length > 1200 ? '…' : ''}`
      : '';

    setSelectedPreviewItem({
      type: 'chapter',
      id: chapter.id,
      title: `Chapter ${chapter.number}: ${chapter.title}`,
      subtitle: `${statusLabel(chapter.status)} · ${chapter.wordCount.toLocaleString()} words`,
      content: [
        `**Chapter ${chapter.number}:** ${chapter.title}`,
        `**Status:** ${statusLabel(chapter.status)}`,
        `**Word count:** ${chapter.wordCount.toLocaleString()}`,
        chapter.summary ? `\n**Summary:**\n${chapter.summary}` : '',
        excerpt,
      ].join('\n'),
    });
  };

  return (
    <div className="space-y-5 font-sans max-w-3xl">
      <div>
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Project knowledge</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          Approved canon and project voice — what agents use when planning and writing.
        </p>
      </div>

      <button
        type="button"
        onClick={openVoicePreview}
        className={`w-full rounded-lg border text-left p-4 shadow-xxs bg-white flex justify-between items-center transition cursor-pointer ${
          selectedPreviewItem?.id === 'project-voice'
            ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
            : 'border-zinc-200 hover:border-zinc-300'
        }`}
      >
        <div>
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Genre & voice</h4>
          <p className="text-[11px] text-zinc-700 mt-1 font-medium">
            {voice.genre || book.genre || 'Genre not set'}
            <span className="text-zinc-400 mx-1.5">·</span>
            {voice.tonality || book.tonality}
          </p>
          {(voice.bookSummary || book.bookSummary) && (
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              {voice.bookSummary || book.bookSummary}
            </p>
          )}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-zinc-400 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <MemorySection
        title="Characters"
        badge="Canon"
        badgeClass="bg-violet-50 text-violet-700 border-violet-100"
        count={characters.length}
        emptyMessage="No characters yet. Ask the world builder to create one."
      >
        {characters.map((character) => (
          <SelectableCard
            key={character.id}
            isActive={selectedPreviewItem?.id === character.id}
            onClick={() => openCharacterPreview(character)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs">{character.name}</span>
              <span className={`text-[9px] font-semibold px-1 rounded border ${statusClass(character.status)}`}>
                {statusLabel(character.status)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-100 px-1 rounded">{character.role || 'Character'}</span>
              {character.arc && <p className="line-clamp-1 text-[11px] text-zinc-500 flex-1">{character.arc}</p>}
            </div>
          </SelectableCard>
        ))}
      </MemorySection>

      <MemorySection
        title="World & lore"
        badge="Canon"
        badgeClass="bg-sky-50 text-sky-700 border-sky-100"
        count={worldEntities.length}
        emptyMessage="No world entries yet. Locations, factions, and lore appear here after approval."
      >
        {worldEntities.map((entity) => (
          <SelectableCard
            key={entity.id}
            isActive={selectedPreviewItem?.id === entity.id}
            onClick={() => openWorldPreview(entity)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs">{entity.name}</span>
              <span className={`text-[9px] font-semibold px-1 rounded border ${statusClass(entity.status)}`}>
                {statusLabel(entity.status)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-100 px-1 rounded">
                {entityTypeLabel(entity.type)}
              </span>
              {entity.description && (
                <p className="line-clamp-1 text-[11px] text-zinc-500 flex-1">{entity.description}</p>
              )}
            </div>
          </SelectableCard>
        ))}
      </MemorySection>

      <MemorySection
        title="Chapters"
        badge="Manuscript"
        badgeClass="bg-zinc-100 text-zinc-600 border-zinc-200"
        count={chapters.length}
        emptyMessage="No chapters yet. Ask the writer to draft one."
      >
        {chapters.map((chapter) => (
          <SelectableCard
            key={chapter.id}
            isActive={selectedPreviewItem?.id === chapter.id}
            onClick={() => openChapterPreview(chapter)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs">
                Ch. {chapter.number}: {chapter.title}
              </span>
              <span className={`text-[9px] font-semibold px-1 rounded border ${statusClass(chapter.status)}`}>
                {statusLabel(chapter.status)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[9px] text-zinc-400 font-medium">
              <span>{chapter.wordCount.toLocaleString()} words</span>
              {chapter.summary && <span className="line-clamp-1 flex-1 ml-2 text-zinc-500">{chapter.summary}</span>}
            </div>
          </SelectableCard>
        ))}
      </MemorySection>
    </div>
  );
}
