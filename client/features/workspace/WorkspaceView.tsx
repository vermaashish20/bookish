'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Feather, PanelLeft } from 'lucide-react';
import { uploadAsset, uploadAssetFile } from '@/lib/api';
import type { Asset, MemorySubTab, PreviewItem, WorkspaceTab } from '@/lib/types';
import AddAssetModal from '@/components/workspace/AddAssetModal';
import AgentTab from '@/features/workspace/tabs/AgentTab';
import BookTab from '@/features/workspace/tabs/BookTab';
import MemoryTab from '@/features/workspace/tabs/MemoryTab';
import SettingsTab from '@/features/workspace/tabs/SettingsTab';
import { useAgentStream } from '@/features/workspace/hooks/useAgentStream';
import { useModelSettings } from '@/features/workspace/hooks/useModelSettings';
import { useProject } from '@/features/workspace/hooks/useProject';

export function WorkspaceView({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Agent');
  const [memorySubTab, setMemorySubTab] = useState<MemorySubTab>('Sources');
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<PreviewItem | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(true);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetContent, setNewAssetContent] = useState('');
  const [newAssetType, setNewAssetType] = useState('Markdown File');
  const [selectedAssetFile, setSelectedAssetFile] = useState<File | null>(null);

  const {
    book,
    setBook,
    updateBook,
    chatMessages,
    setChatMessages,
    chatSessions,
    activeChatSessionId,
    switchChatSession,
    startNewChatSession,
    clearActiveChatSession,
    loading,
    bookSectionLoading,
    memorySectionLoading,
    messagesLoading,
    ensureMemoryLoaded,
  } =
    useProject(projectId, activeTab);

  const chat = useAgentStream(
    book,
    chatMessages,
    setChatMessages,
    setBook,
    activeChatSessionId,
    startNewChatSession,
  );

  const settings = useModelSettings(projectId, book, updateBook, activeTab === 'Settings');

  useEffect(() => {
    setSelectedPreviewItem(null);
  }, [activeTab, memorySubTab]);

  if (loading || !book) {
    return (
      <div className="bookish-workspace flex h-screen items-center justify-center text-sm text-[var(--bookish-muted)]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--bookish-line)] border-t-[var(--bookish-accent)]" />
          Loading workspace…
        </div>
      </div>
    );
  }

  const handleRegisterUserAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const assetName = (newAssetName.trim() || selectedAssetFile?.name || '').trim();
    if (!assetName) return;

    if (selectedAssetFile) {
    try {
      const fresh = await uploadAssetFile(book.id, selectedAssetFile, newAssetType);
      updateBook(fresh);
      void ensureMemoryLoaded();
      } catch (err) {
        console.warn('[Assets] Upload failed', err);
      }
      resetAssetForm();
      return;
    }

    const content = newAssetContent.trim();
    if (!content) return;

    const newAsset: Asset = {
      id: `as-${Date.now()}`,
      name: assetName,
      type: newAssetType,
      size:
        newAssetType === 'Prompt'
          ? `${Math.round(content.length / 100) / 10 + 0.1} KB`
          : '120 KB',
      addedAt: new Date().toISOString(),
      content,
    };

    updateBook({ ...book, assets: [...book.assets, newAsset] });
    setSelectedPreviewItem({
      type: 'user_asset',
      id: newAsset.id,
      title: newAsset.name,
      subtitle: `${newAsset.type} · ${newAsset.size}`,
      content,
    });
    resetAssetForm();

    try {
      const fresh = await uploadAsset(book.id, {
        name: newAsset.name,
        type: newAsset.type,
        content,
      });
      updateBook(fresh);
      void ensureMemoryLoaded();
    } catch (err) {
      console.warn('[Assets] Backend unreachable', err);
    }
  };

  const resetAssetForm = () => {
    setNewAssetName('');
    setNewAssetContent('');
    setSelectedAssetFile(null);
    setIsAddAssetOpen(false);
  };

  return (
    <div className="bookish-workspace flex h-screen font-sans text-[var(--bookish-ink)] antialiased selection:bg-[var(--bookish-accent-soft)]">
      <WorkspaceSidebar
        activeChatSessionId={activeChatSessionId ?? ''}
        activeTab={activeTab}
        chatSessions={chatSessions}
        isHistoryPanelOpen={isHistoryPanelOpen}
        onNewChatSession={() => {
          setActiveTab('Agent');
          startNewChatSession();
        }}
        onSwitchChatSession={(sessionId) => {
          setActiveTab('Agent');
          switchChatSession(sessionId);
        }}
        onTabChange={setActiveTab}
        setIsHistoryPanelOpen={setIsHistoryPanelOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_92%,transparent)] px-5 backdrop-blur-sm">
          <nav className="flex items-center gap-2 text-[13px]">
            <Link
              href="/workspace"
              className="font-medium text-[var(--bookish-muted)] transition hover:text-[var(--bookish-accent)]"
            >
              Workspace
            </Link>
            <span className="select-none text-[var(--bookish-line)]">/</span>
            <span className="font-semibold tracking-tight text-[var(--bookish-ink)]">{book.title}</span>
          </nav>
          {book.genre && (
            <span className="hidden rounded-full bg-[var(--bookish-accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--bookish-accent)] sm:inline">
              {book.genre}
            </span>
          )}
        </header>

        <main className="flex min-h-0 flex-1 overflow-hidden">
          {activeTab === 'Agent' && (
            <AgentTab
              book={book}
              chatMessages={chatMessages}
              messagesLoading={messagesLoading}
              isAgentThinking={chat.isAgentThinking}
              currentAgentStatus={chat.currentAgentStatus}
              promptInput={chat.promptInput}
              setPromptInput={chat.setPromptInput}
              onSendPrompt={chat.sendPrompt}
              pendingConfirmation={chat.pendingConfirmation}
              onResume={chat.resume}
              streamedDocumentText={chat.streamedDocumentText}
              streamedArtifactType={chat.streamedArtifactType}
              chatSessions={chatSessions}
              activeChatSessionId={activeChatSessionId ?? ''}
              onSwitchChatSession={switchChatSession}
              onNewChatSession={startNewChatSession}
              onClearChatSession={clearActiveChatSession}
            />
          )}
          {activeTab === 'Book' &&
            (bookSectionLoading ? (
              <TabLoading label="Loading manuscript…" />
            ) : (
              <BookTab
                book={book}
                projectId={projectId}
                onBookUpdate={updateBook}
                streamedDocumentText={chat.streamedDocumentText}
              />
            ))}
          {activeTab === 'Memory' &&
            (memorySectionLoading || bookSectionLoading ? (
              <TabLoading label="Loading sources & canon…" />
            ) : (
              <MemoryTab
                book={book}
                memorySubTab={memorySubTab}
                setMemorySubTab={setMemorySubTab}
                selectedPreviewItem={selectedPreviewItem}
                setSelectedPreviewItem={setSelectedPreviewItem}
                setIsAddAssetOpen={setIsAddAssetOpen}
              />
            ))}
          {activeTab === 'Settings' && (
            <SettingsTab
              plannerProvider={settings.plannerProvider}
              setPlannerProvider={settings.setPlannerProvider}
              plannerModel={settings.plannerModel}
              setPlannerModel={settings.setPlannerModel}
              plannerApiKey={settings.plannerApiKey}
              setPlannerApiKey={settings.setPlannerApiKey}
              writerProvider={settings.writerProvider}
              setWriterProvider={settings.setWriterProvider}
              writerModel={settings.writerModel}
              setWriterModel={settings.setWriterModel}
              writerApiKey={settings.writerApiKey}
              setWriterApiKey={settings.setWriterApiKey}
              worldBuilderProvider={settings.worldBuilderProvider}
              setWorldBuilderProvider={settings.setWorldBuilderProvider}
              worldBuilderModel={settings.worldBuilderModel}
              setWorldBuilderModel={settings.setWorldBuilderModel}
              worldBuilderApiKey={settings.worldBuilderApiKey}
              setWorldBuilderApiKey={settings.setWorldBuilderApiKey}
              isSavingSettings={settings.isSavingSettings}
              settingsSaved={settings.settingsSaved}
              onSaveSettings={settings.saveSettings}
            />
          )}
          <AddAssetModal
            isOpen={isAddAssetOpen}
            onClose={() => setIsAddAssetOpen(false)}
            onSubmit={handleRegisterUserAsset}
            newAssetName={newAssetName}
            setNewAssetName={setNewAssetName}
            newAssetType={newAssetType}
            setNewAssetType={setNewAssetType}
            newAssetContent={newAssetContent}
            setNewAssetContent={setNewAssetContent}
            selectedAssetFile={selectedAssetFile}
            setSelectedAssetFile={setSelectedAssetFile}
          />
        </main>
      </div>
    </div>
  );
}

function WorkspaceSidebar({
  activeChatSessionId,
  activeTab,
  chatSessions,
  isHistoryPanelOpen,
  onNewChatSession,
  onSwitchChatSession,
  onTabChange,
  setIsHistoryPanelOpen,
}: {
  activeChatSessionId: string;
  activeTab: WorkspaceTab;
  chatSessions: { id: string; title: string; messageCount?: number }[];
  isHistoryPanelOpen: boolean;
  onNewChatSession: () => void;
  onSwitchChatSession: (sessionId: string) => void;
  onTabChange: (tab: WorkspaceTab) => void;
  setIsHistoryPanelOpen: (open: boolean) => void;
}) {
  const tabs: { id: WorkspaceTab; label: string; title: string; icon: React.ReactNode }[] = [
    {
      id: 'Agent',
      label: 'Agent',
      title: 'Chat & studio',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-3.658A8.967 8.967 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
        />
      ),
    },
    {
      id: 'Book',
      label: 'Book',
      title: 'Chapters & editor',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        />
      ),
    },
    {
      id: 'Memory',
      label: 'Memory',
      title: 'Sources & canon',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
        />
      ),
    },
    {
      id: 'Settings',
      label: 'Settings',
      title: 'Model routing',
      icon: (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </>
      ),
    },
  ];

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-[var(--bookish-line)] bg-[var(--bookish-paper)] transition-[width] duration-200 ${
        isHistoryPanelOpen ? 'w-52' : 'w-16'
      }`}
    >
      <div
        className={`flex h-14 shrink-0 items-center ${
          isHistoryPanelOpen ? 'justify-between px-3' : 'justify-center px-2'
        }`}
      >
        {isHistoryPanelOpen ? (
          <>
            <Link
              href="/workspace"
              className="bookish-display inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--bookish-ink)] transition hover:opacity-80"
              title="Back to workspace"
            >
              <Feather className="h-5 w-5 shrink-0 text-[var(--bookish-accent)]" />
              <span>Bookish</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsHistoryPanelOpen(false)}
              className="flex size-9 items-center justify-center rounded-lg text-[var(--bookish-muted)] transition hover:bg-[var(--bookish-accent-soft)] hover:text-[var(--bookish-ink)]"
              title="Close sidebar"
            >
              <PanelLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <div className="group relative flex size-10 items-center justify-center">
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center transition-opacity group-hover:opacity-0"
              title="Back to workspace"
            >
              <Feather className="h-5 w-5 shrink-0 text-[var(--bookish-accent)]" />
            </Link>
            <button
              type="button"
              onClick={() => setIsHistoryPanelOpen(true)}
              className="absolute inset-0 flex items-center justify-center rounded-lg text-[var(--bookish-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--bookish-accent-soft)] hover:text-[var(--bookish-ink)]"
              title="Open sidebar"
            >
              <PanelLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 px-2">
        <button
          type="button"
          onClick={onNewChatSession}
          title="New chat"
          className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--bookish-ink)] transition hover:bg-[var(--bookish-accent-soft)] ${
            isHistoryPanelOpen ? 'justify-start' : 'justify-center px-0'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="size-4 shrink-0"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125 16.875 4.5" />
          </svg>
          {isHistoryPanelOpen && <span>New chat</span>}
        </button>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            title={tab.title}
            className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition ${
              activeTab === tab.id
                ? 'bg-[var(--bookish-accent-soft)] font-medium text-[var(--bookish-accent)]'
                : 'text-[var(--bookish-ink)] hover:bg-black/[0.03]'
            } ${isHistoryPanelOpen ? 'justify-start' : 'justify-center px-0'}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="size-4 shrink-0"
            >
              {tab.icon}
            </svg>
            {isHistoryPanelOpen && <span>{tab.label}</span>}
          </button>
        ))}
      </div>

      {isHistoryPanelOpen && (
        <div className="mt-5 min-h-0 flex-1 overflow-hidden px-3">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--bookish-muted)]">
            History
          </div>
          <div className="h-full space-y-1 overflow-y-auto pb-6">
            {chatSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSwitchChatSession(session.id)}
                className={`w-full truncate rounded-xl px-3 py-2 text-left text-xs transition ${
                  session.id === activeChatSessionId
                    ? 'bg-[var(--bookish-accent-soft)] font-semibold text-[var(--bookish-accent)]'
                    : 'text-[var(--bookish-ink)] hover:bg-black/[0.03]'
                }`}
                title={session.title || 'Chat'}
              >
                {session.title || 'Chat'}{' '}
                <span className="font-normal text-[var(--bookish-muted)]">({session.messageCount ?? 0})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-[var(--bookish-muted)]">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--bookish-line)] border-t-[var(--bookish-accent)]" />
        {label}
      </div>
    </div>
  );
}
