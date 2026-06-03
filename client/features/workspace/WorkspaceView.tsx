'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { uploadAsset, uploadAssetFile } from '@/lib/api';
import type { Asset, PreviewItem, WorkspaceTab } from '@/lib/types';
import AddAssetModal from '@/components/workspace/AddAssetModal';
import AgentTab from '@/features/workspace/tabs/AgentTab';
import BookTab from '@/features/workspace/tabs/BookTab';
import MemoryTab from '@/features/workspace/tabs/MemoryTab';
import SettingsTab from '@/features/workspace/tabs/SettingsTab';
import { useChatStream } from '@/features/workspace/hooks/useChatStream';
import { useModelSettings } from '@/features/workspace/hooks/useModelSettings';
import { useProject } from '@/features/workspace/hooks/useProject';

type MemorySubTab = 'User' | 'AgentMemory' | 'Timeline';

export function WorkspaceView({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Agent');
  const [memorySubTab, setMemorySubTab] = useState<MemorySubTab>('User');
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<PreviewItem | null>(null);
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
  } =
    useProject(projectId);

  const chat = useChatStream(book, chatMessages, setChatMessages, setBook, activeChatSessionId);

  const settings = useModelSettings(projectId, book, updateBook, activeTab === 'Settings');

  useEffect(() => {
    setSelectedPreviewItem(null);
  }, [activeTab, memorySubTab]);

  if (loading || !book) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-xs text-zinc-500">
        Loading workspace…
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

  const triggerDownload = (format: 'pdf' | 'docx') => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(book, null, 2)], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${book.title.replace(/\s+/g, '_')}_compiled.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-zinc-200">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 text-xs">
          <Link href="/" className="text-zinc-400 hover:text-zinc-700 transition font-medium">
            Dashboard
          </Link>
          <span className="text-zinc-300 font-light select-none">/</span>
          <span className="font-semibold text-zinc-900 tracking-tight">{book.title}</span>
        </div>
        <button
          type="button"
          onClick={() => triggerDownload('pdf')}
          className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 shadow-xs"
        >
          Export as PDF
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <WorkspaceSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'Agent' && (
            <AgentTab
              book={book}
              chatMessages={chatMessages}
              isAgentThinking={chat.isAgentThinking}
              currentAgentStatus={chat.currentAgentStatus}
              promptInput={chat.promptInput}
              setPromptInput={chat.setPromptInput}
              onSendPrompt={chat.sendPrompt}
              pendingConfirmation={chat.pendingConfirmation}
              onResume={chat.resume}
              streamedDocumentText={chat.streamedDocumentText}
              chatSessions={chatSessions}
              activeChatSessionId={activeChatSessionId}
              onSwitchChatSession={switchChatSession}
              onNewChatSession={startNewChatSession}
              onClearChatSession={clearActiveChatSession}
            />
          )}
          {activeTab === 'Book' && (
            <BookTab book={book} streamedDocumentText={chat.streamedDocumentText} />
          )}
          {activeTab === 'Memory' && (
            <MemoryTab
              book={book}
              memorySubTab={memorySubTab}
              setMemorySubTab={setMemorySubTab}
              selectedPreviewItem={selectedPreviewItem}
              setSelectedPreviewItem={setSelectedPreviewItem}
              setIsAddAssetOpen={setIsAddAssetOpen}
            />
          )}
          {activeTab === 'Settings' && (
            <SettingsTab
              plannerProvider={settings.plannerProvider}
              setPlannerProvider={settings.setPlannerProvider}
              plannerModel={settings.plannerModel}
              setPlannerModel={settings.setPlannerModel}
              writerProvider={settings.writerProvider}
              setWriterProvider={settings.setWriterProvider}
              writerModel={settings.writerModel}
              setWriterModel={settings.setWriterModel}
              checkerProvider={settings.checkerProvider}
              setCheckerProvider={settings.setCheckerProvider}
              checkerModel={settings.checkerModel}
              setCheckerModel={settings.setCheckerModel}
              researcherProvider={settings.researcherProvider}
              setResearcherProvider={settings.setResearcherProvider}
              researcherModel={settings.researcherModel}
              setResearcherModel={settings.setResearcherModel}
              humanizerProvider={settings.humanizerProvider}
              setHumanizerProvider={settings.setHumanizerProvider}
              humanizerModel={settings.humanizerModel}
              setHumanizerModel={settings.setHumanizerModel}
              editorProvider={settings.editorProvider}
              setEditorProvider={settings.setEditorProvider}
              editorModel={settings.editorModel}
              setEditorModel={settings.setEditorModel}
              worldBuilderProvider={settings.worldBuilderProvider}
              setWorldBuilderProvider={settings.setWorldBuilderProvider}
              worldBuilderModel={settings.worldBuilderModel}
              setWorldBuilderModel={settings.setWorldBuilderModel}
              anthropicKey={settings.anthropicKey}
              setAnthropicKey={settings.setAnthropicKey}
              geminiKey={settings.geminiKey}
              setGeminiKey={settings.setGeminiKey}
              openaiKey={settings.openaiKey}
              setOpenaiKey={settings.setOpenaiKey}
              openrouterKey={settings.openrouterKey}
              setOpenrouterKey={settings.setOpenrouterKey}
              sarvamKey={settings.sarvamKey}
              setSarvamKey={settings.setSarvamKey}
              nvidiaKey={settings.nvidiaKey}
              setNvidiaKey={settings.setNvidiaKey}
              ollamaEndpoint={settings.ollamaEndpoint}
              setOllamaEndpoint={settings.setOllamaEndpoint}
              customEndpoint={settings.customEndpoint}
              setCustomEndpoint={settings.setCustomEndpoint}
              customApiKey={settings.customApiKey}
              setCustomApiKey={settings.setCustomApiKey}
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
  activeTab,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
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
      title: 'Assets & bible',
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
    <aside className="w-16 flex flex-col items-center border-r border-zinc-200 bg-white py-6 shrink-0 gap-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          title={tab.title}
          className={`flex flex-col items-center gap-1 p-2 w-12 rounded-lg transition-all ${
            activeTab === tab.id
              ? 'bg-zinc-100 text-zinc-900 font-medium'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="w-4 h-4"
          >
            {tab.icon}
          </svg>
          <span className="text-[9px]">{tab.label}</span>
        </button>
      ))}
    </aside>
  );
}
