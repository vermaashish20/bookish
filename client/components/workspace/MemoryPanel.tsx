'use client';

import React from 'react';
import { BookProject, MemorySubTab, PreviewItem } from '@/lib/types';
import UserContextTimeline from './UserContextTimeline';
import ProjectKnowledge from './ProjectKnowledge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeMarkdownForDisplay } from '@/lib/markdown/display';

interface MemoryPanelProps {
  book: BookProject;
  memorySubTab: MemorySubTab;
  setMemorySubTab: (tab: MemorySubTab) => void;
  selectedPreviewItem: PreviewItem | null;
  setSelectedPreviewItem: (item: PreviewItem | null) => void;
  setIsAddAssetOpen: (open: boolean) => void;
}

const MEMORY_DESCRIPTION =
  'Uploaded sources and approved project knowledge — the context agents use when planning and writing.';

const SUB_TABS: { id: MemorySubTab; label: string }[] = [
  { id: 'Sources', label: 'Sources' },
  { id: 'Knowledge', label: 'Project knowledge' },
];

function MemorySubTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2.5 pt-1 text-[13px] transition focus:outline-none ${
        active
          ? 'border-[var(--bookish-accent)] font-semibold text-[var(--bookish-ink)]'
          : 'border-transparent font-medium text-[var(--bookish-muted)] hover:text-[var(--bookish-ink)]'
      }`}
    >
      {label}
    </button>
  );
}

export default function MemoryPanel({
  book,
  memorySubTab,
  setMemorySubTab,
  selectedPreviewItem,
  setSelectedPreviewItem,
  setIsAddAssetOpen,
}: MemoryPanelProps) {
  const renderPreviewCanvasContent = () => {
    if (!selectedPreviewItem) return null;

    const formatContentForPreview = (text: string) => {
      let cleanText = text;
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)```/);
      if (jsonMatch) cleanText = jsonMatch[1];

      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => {
              if (typeof item === 'object' && item !== null) {
                return Object.entries(item)
                  .map(([k, v]) => {
                    if (typeof v === 'object') {
                      return (
                        `**${k.charAt(0).toUpperCase() + k.slice(1)}**:\n` +
                        Object.entries(v || {})
                          .map(([vk, vv]) => `  - ${vk}: ${vv}`)
                          .join('\n')
                      );
                    }
                    return `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${v}`;
                  })
                  .join('\n\n');
              }
              return String(item);
            })
            .join('\n\n---\n\n');
        }
        if (typeof parsed === 'object' && parsed !== null) {
          return Object.entries(parsed)
            .map(
              ([k, v]) =>
                `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`,
            )
            .join('\n\n');
        }
      } catch {
        return text;
      }
      return text;
    };

    const artifactContentToDisplay = selectedPreviewItem.artifactContent
      ? formatContentForPreview(selectedPreviewItem.artifactContent)
      : '';
    const fullContentToDisplay = normalizeMarkdownForDisplay(
      selectedPreviewItem.content +
        (artifactContentToDisplay
          ? `\n\n---\n\n## Artifact Generated\n\n${artifactContentToDisplay}`
          : ''),
    );

    return (
      <div className="relative flex h-full w-full flex-col select-text">
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-[var(--bookish-line)] bg-[var(--bookish-paper)] px-6 py-4">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--bookish-muted)]">
            <span className="truncate font-semibold text-[var(--bookish-ink)]">
              {selectedPreviewItem.title}
            </span>
            {selectedPreviewItem.subtitle && (
              <>
                <span className="text-[var(--bookish-line)]">·</span>
                <span className="truncate">{selectedPreviewItem.subtitle}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedPreviewItem(null)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--bookish-muted)] transition hover:bg-black/[0.04] hover:text-[var(--bookish-ink)]"
            title="Close preview"
          >
            ✕
          </button>
        </div>

        <div className="markdown-body prose prose-sm prose-zinc max-w-none flex-1 overflow-y-auto break-words px-6 py-5 leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ ...props }) => <p className="mb-3 text-[13px]" {...props} />,
              h1: ({ ...props }) => <h1 className="my-4 text-lg font-bold" {...props} />,
              h2: ({ ...props }) => <h2 className="my-3 text-base font-semibold" {...props} />,
              h3: ({ ...props }) => <h3 className="my-3 text-[15px] font-semibold" {...props} />,
              h4: ({ ...props }) => <h4 className="my-2 text-[14px] font-semibold" {...props} />,
              ul: ({ ...props }) => (
                <ul className="mb-3 list-disc space-y-1 pl-5 text-[13px]" {...props} />
              ),
              ol: ({ ...props }) => (
                <ol className="mb-3 list-decimal space-y-1 pl-5 text-[13px]" {...props} />
              ),
              li: ({ ...props }) => <li className="ml-3" {...props} />,
              hr: ({ ...props }) => <hr className="my-4 border-[var(--bookish-line)]" {...props} />,
              strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
              pre: ({ ...props }) => (
                <pre
                  className="rounded border border-[var(--bookish-line)] bg-[var(--bookish-page)] p-4 text-[10px]"
                  {...props}
                />
              ),
              code: ({ node, inline, ...props }: any) =>
                inline ? (
                  <code
                    className="rounded bg-[var(--bookish-page)] px-1 py-0.5 font-mono text-[10px] text-[var(--bookish-accent)]"
                    {...props}
                  />
                ) : (
                  <code className="font-mono text-[10px]" {...props} />
                ),
            }}
          >
            {fullContentToDisplay}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--bookish-paper)]">
      <div
        className={`flex min-h-0 flex-col overflow-hidden transition-all duration-300 ${
          selectedPreviewItem ? 'w-[58%] border-r border-[var(--bookish-line)]' : 'w-full'
        }`}
      >
        <div className="shrink-0 px-8 pt-8">
          <header>
            <h1 className="text-[15px] font-semibold tracking-tight text-[var(--bookish-ink)]">Memory</h1>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[var(--bookish-muted)]">
              {MEMORY_DESCRIPTION}
            </p>
          </header>

          <div className="mt-5 flex items-end gap-5">
            {SUB_TABS.map((tab) => (
              <MemorySubTabButton
                key={tab.id}
                active={memorySubTab === tab.id}
                label={tab.label}
                onClick={() => setMemorySubTab(tab.id)}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          {memorySubTab === 'Sources' && (
            <UserContextTimeline
              book={book}
              selectedPreviewItem={selectedPreviewItem}
              setSelectedPreviewItem={setSelectedPreviewItem}
              onAddSource={() => setIsAddAssetOpen(true)}
            />
          )}

          {memorySubTab === 'Knowledge' && (
            <ProjectKnowledge
              book={book}
              selectedPreviewItem={selectedPreviewItem}
              setSelectedPreviewItem={setSelectedPreviewItem}
            />
          )}
        </div>
      </div>

      {selectedPreviewItem && (
        <div className="flex w-[42%] shrink-0 flex-col overflow-hidden bg-[var(--bookish-paper)]">
          {renderPreviewCanvasContent()}
        </div>
      )}
    </div>
  );
}
