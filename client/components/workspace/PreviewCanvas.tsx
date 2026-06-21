'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isPreviewableArtifactContent, isToolCallPayload } from '@/lib/agent/display';
import { ChapterItem, DecisionItem } from '@/lib/types';

interface PreviewCanvasProps {
  chapter: ChapterItem | undefined;
  selectedPage: number;
  setSelectedPage: (page: number) => void;
  bookTitle: string;
  streamedDocumentText?: string;
  streamedArtifactType?: string;
  activePreviewArtifact?: DecisionItem | null;
}

export default function PreviewCanvas({ chapter, selectedPage, setSelectedPage, bookTitle, streamedDocumentText, streamedArtifactType, activePreviewArtifact }: PreviewCanvasProps) {
  // Helper to strip JSON markdown and parse it into readable text
  const formatContentForPreview = (text: string) => {
    if (!text.trim() || isToolCallPayload(text)) {
      return '';
    }

    let cleanText = text;
    // Extract text inside ```json block if exists
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)```/);
    if (jsonMatch) {
      cleanText = jsonMatch[1];
    }
    
    try {
      const parsed = JSON.parse(cleanText);
      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        if (record.type === 'tool_call' || typeof record.tool_call === 'string') {
          return '';
        }
      }
      // Format parsed JSON to readable text
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return Object.entries(item).map(([k, v]) => {
              if (typeof v === 'object') {
                return `**${k.charAt(0).toUpperCase() + k.slice(1)}**:\n` + Object.entries(v || {}).map(([vk, vv]) => `  - ${vk}: ${vv}`).join('\n');
              }
              return `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${v}`;
            }).join('\n\n');
          }
          return String(item);
        }).join('\n\n---\n\n');
      } else if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n\n');
      }
    } catch (e) {
      // If it fails to parse, just return the original text without the code block formatting if it had it
      return cleanText;
    }
    return text;
  };

  const rawContent = activePreviewArtifact?.artifactContent || streamedDocumentText || chapter?.content || '';
  const contentToDisplay = formatContentForPreview(rawContent);
  const artifactType =
    activePreviewArtifact?.artifactType ?? (streamedDocumentText ? (streamedArtifactType ?? 'draft') : undefined);
  const hasRenderableContent = isPreviewableArtifactContent(contentToDisplay, artifactType) ||
    Boolean(!activePreviewArtifact && !streamedDocumentText && chapter?.content?.trim());

  const isChapterPreview = artifactType === 'draft' || artifactType === 'edited_content';
  const streamAgentLabel =
    artifactType === 'world_building' ? 'World Builder' : 'Writer';
  const currentAgent = activePreviewArtifact?.agent || (streamedDocumentText ? streamAgentLabel : 'Writer');
  const shouldPaginate = isChapterPreview && (currentAgent === 'Writer' || (!activePreviewArtifact && chapter));

  const previewChunks = shouldPaginate
    ? (contentToDisplay.match(/[\s\S]{1,2200}/g) || [])
    : [contentToDisplay];

  const previewPages = Array.from({ length: Math.max(previewChunks.length, 1) }, (_, idx) => idx + 1);
  useEffect(() => {
    if (selectedPage > previewPages.length) {
      setSelectedPage(previewPages.length);
    }
  }, [previewPages.length, selectedPage, setSelectedPage]);
  const activePreviewContent = previewChunks[selectedPage - 1] || '';

  return (
    <div className="flex flex-row items-stretch w-full h-full overflow-hidden">
      {/* Leftside thumbnail page panel (Scrollable) */}
      {shouldPaginate && (
        <div className="w-24 border-r border-zinc-200 bg-white p-2.5 flex flex-col gap-3 overflow-y-auto shrink-0 select-none">
          <span className="text-[7.5px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5 text-center">Pages</span>
        
        {/* Pages List */}
        {previewPages.map((pageNum) => {
          const isActive = selectedPage === pageNum;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => setSelectedPage(pageNum)}
              className={`flex flex-col items-center gap-1 p-1 rounded transition-all focus:outline-none ${
                isActive 
                  ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-250 shadow-xxs' 
                  : 'text-zinc-500 hover:bg-zinc-50 border border-transparent'
              }`}
            >
              {/* Scaled-down miniature A4 canvas */}
              <div className={`w-[56px] h-[79px] bg-white border ${isActive ? 'border-zinc-800' : 'border-zinc-200'} rounded p-1 relative flex flex-col justify-between overflow-hidden`}>
                {/* Tiny page header */}
                <div className="flex justify-between items-center text-[2.5px] text-zinc-300 border-b border-zinc-100 pb-0.5 scale-90 origin-top">
                  <span>{activePreviewArtifact ? 'Artifact' : (chapter ? `Ch ${chapter.number}` : 'Book')}</span>
                  <span>p. {pageNum}</span>
                </div>
                
                {/* Tiny document lines */}
                <div className="space-y-[3px] my-0.5 scale-90 origin-center">
                  <div className="h-[1.5px] bg-zinc-200 rounded w-4/5 mx-auto" />
                  <div className="h-[1.5px] bg-zinc-150 rounded w-11/12" />
                  <div className="h-[1.5px] bg-zinc-100 rounded w-10/12" />
                  <div className="h-[1.5px] bg-zinc-100 rounded w-7/12" />
                </div>
                
                {/* Tiny footer */}
                <span className="text-[2px] text-zinc-300 tracking-wide text-center scale-75 origin-bottom">{activePreviewArtifact ? activePreviewArtifact.artifactType?.replace('_', ' ') || 'Preview' : 'Draft'}</span>
              </div>
              <span className="text-[8px] uppercase font-bold tracking-wider">
                Page {pageNum}
              </span>
            </button>
          );
        })}
        </div>
      )}

      {/* Rightside active view (Scrollable) */}
      <div className={`flex-1 overflow-y-auto flex flex-col ${shouldPaginate ? 'p-6 items-center' : 'bg-white relative'}`}>
        <div 
          className={
            shouldPaginate 
              ? "w-[600px] min-h-[707px] bg-white border border-zinc-300 shadow-md p-10 font-serif leading-relaxed text-xs relative select-text mb-10 flex flex-col justify-between shrink-0"
              : "w-full h-full flex flex-col font-sans select-text"
          }
        >
          
          <div className="flex-1 flex flex-col">
            {/* Running Header */}
            {shouldPaginate ? (
              <div className="flex justify-between items-center text-[9px] font-sans text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-6 shrink-0">
                <span className="flex-1">{bookTitle}</span>
                <span className="flex-1 text-center font-bold">
                  {activePreviewArtifact ? activePreviewArtifact.agent : (streamedDocumentText ? streamAgentLabel : 'Writer')}
                </span>
                <span className="flex-1 text-right"></span>
              </div>
            ) : (
              <div className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 backdrop-blur px-8 py-6 border-b border-zinc-100 select-none text-[10px] shrink-0 text-zinc-500 font-semibold uppercase tracking-widest">
                <span className="font-bold text-zinc-700">{activePreviewArtifact?.agent || 'Planner'}</span>
                <span>•</span>
                <span>{activePreviewArtifact?.artifactType?.replace('_', ' ') || 'Document'}</span>
              </div>
            )}

            <div className={shouldPaginate ? "space-y-4" : "flex-1 px-8 py-6"}>
              {hasRenderableContent && activePreviewContent ? (
                <div className="space-y-4 w-full max-w-full overflow-hidden">
                  {!activePreviewArtifact && chapter && (
                    <div className="mb-6 text-center">
                      <h1 className="text-sm font-semibold leading-snug tracking-tight text-zinc-900">{chapter.title}</h1>
                      <span className={`mt-2 inline-flex rounded px-2 py-0.5 font-sans text-[9px] uppercase tracking-wider ${
                        chapter.status === 'published' || chapter.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {chapter.status || 'draft'}
                      </span>
                    </div>
                  )}
                  <div className="text-justify leading-relaxed markdown-body prose prose-sm prose-zinc max-w-3xl mx-auto break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 indent-6 text-[13px]" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold my-3 text-center" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold my-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[14px] font-bold my-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px]" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px]" {...props} />,
                        li: ({node, ...props}) => <li className="ml-3" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-4 border-zinc-200" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        pre: ({node, ...props}) => <pre className="text-[10px] bg-zinc-50/50 border border-zinc-100 rounded p-4" {...props} />,
                        code: ({node, inline, ...props}: any) => inline 
                          ? <code className="text-[10px] bg-zinc-100 px-1 py-0.5 rounded text-indigo-600 font-mono" {...props} /> 
                          : <code className="text-[10px] font-mono" {...props} />,
                      }}
                    >
                      {activePreviewContent}
                    </ReactMarkdown>
                  </div>
                {streamedDocumentText && (
                  <div className="flex justify-center mt-4">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                <span className="text-zinc-400 text-xs mb-2">No generated chapter preview yet</span>
                <p className="text-[10px] text-zinc-400 max-w-xs">Generated chapter text will render here in manuscript pages.</p>
              </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          {shouldPaginate && (
            <div className="mt-8 text-right text-[10px] font-sans text-zinc-400">
              Page {selectedPage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
