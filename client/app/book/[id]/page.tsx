'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookProject, ChatMessage, ChapterItem, Asset, FactItem, CharacterBibleItem, CallbackItem, DecisionItem, ProjectSettings } from '../../types';
import { submitPrompt as apiSubmitPrompt, saveSettings as apiSaveSettings, uploadAsset as apiUploadAsset, uploadAssetFile as apiUploadAssetFile, fetchProject as apiFetchProject, fetchSettings as apiFetchSettings, SettingsPayload } from '../../lib/api';

export default function BookWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookId = resolvedParams.id;

  const [book, setBook] = useState<BookProject | null>(null);
  const [booksList, setBooksList] = useState<BookProject[]>([]);
  const [activeTab, setActiveTab] = useState<'Agent' | 'Book' | 'Memory' | 'Settings'>('Agent');
  const [activeSubTab, setActiveSubTab] = useState<'Registry' | 'Bible' | 'Callbacks' | 'Tonality' | 'Decisions'>('Registry');
  const [studioTab, setStudioTab] = useState<'Flow' | 'Preview'>('Flow');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState(1);

  // Cognitive Memory Tab sub-navigation and preview states
  const [memorySubTab, setMemorySubTab] = useState<'User' | 'AgentMemory' | 'Timeline'>('User');
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<{
    type: 'user_asset' | 'fact' | 'character' | 'callback' | 'style' | 'timeline';
    id: string;
    title: string;
    subtitle?: string;
    content: string;
  } | null>(null);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAssetContent, setNewAssetContent] = useState('');
  const [selectedAssetFile, setSelectedAssetFile] = useState<File | null>(null);

  // Input states
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [activeBookSection, setActiveBookSection] = useState<string>('ch1');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('Markdown File');

  // Project settings states
  type ProviderType = 'Ollama' | 'Gemini' | 'Claude' | 'OpenAI' | 'Nvidia' | 'Custom';
  const [plannerProvider, setPlannerProvider] = useState<ProviderType>('Claude');
  const [plannerModel, setPlannerModel] = useState('claude-3-5-sonnet');
  const [writerProvider, setWriterProvider] = useState<ProviderType>('Claude');
  const [writerModel, setWriterModel] = useState('claude-3-5-sonnet');
  const [checkerProvider, setCheckerProvider] = useState<ProviderType>('OpenAI');
  const [checkerModel, setCheckerModel] = useState('gpt-4o-mini');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Load book details from backend
  useEffect(() => {
    apiFetchProject(bookId)
      .then((active: any) => {
        if (active) {
          setBook(active as BookProject);
          
          // Re-load settings states
          if (active.settings) {
            setPlannerProvider(active.settings.plannerModel?.provider || 'Claude');
            setPlannerModel(active.settings.plannerModel?.modelName || 'claude-3-5-sonnet');
            setWriterProvider(active.settings.writerModel?.provider || 'Claude');
            setWriterModel(active.settings.writerModel?.modelName || 'claude-3-5-sonnet');
            setCheckerProvider(active.settings.factCheckerModel?.provider || 'OpenAI');
            setCheckerModel(active.settings.factCheckerModel?.modelName || 'gpt-4o-mini');
            
            // Map keys
            const allModels = [
              active.settings.plannerModel,
              active.settings.writerModel,
              active.settings.factCheckerModel,
              active.settings.humanizerModel
            ].filter(Boolean);

            const claudeConf = allModels.find(m => m.provider === 'Claude');
            if (claudeConf?.apiKey) setAnthropicKey(claudeConf.apiKey);

            const geminiConf = allModels.find(m => m.provider === 'Gemini');
            if (geminiConf?.apiKey) setGeminiKey(geminiConf.apiKey);

            const openaiConf = allModels.find(m => m.provider === 'OpenAI');
            if (openaiConf?.apiKey) setOpenaiKey(openaiConf.apiKey);

            const nvidiaConf = allModels.find(m => m.provider === 'Nvidia');
            if (nvidiaConf?.apiKey) setNvidiaKey(nvidiaConf.apiKey);

            const customConf = allModels.find(m => m.provider === 'Custom');
            if (customConf) {
              if (customConf.apiKey) setCustomApiKey(customConf.apiKey);
              if (customConf.endpointUrl) setCustomEndpoint(customConf.endpointUrl);
            }

            const ollamaConf = allModels.find(m => m.provider === 'Ollama');
            if (ollamaConf?.endpointUrl) setOllamaEndpoint(ollamaConf.endpointUrl);
          }

          const initialMsgs: ChatMessage[] = [];

          // Reconstruct agent thinking logs if decision log is present
          if (active.memory?.decisionLog?.length > 0) {
            active.memory.decisionLog.forEach((log: any, idx: number) => {
              initialMsgs.push({
                id: `init-log-${idx}`,
                sender: log.agent as ChatMessage['sender'],
                text: `${log.action} - ${log.resolution}`,
                timestamp: log.timestamp
              });
            });
          }

          setChatMessages(initialMsgs);
        } else {
          router.push('/');
        }
      })
      .catch((err) => {
        console.error("Failed to load project details", err);
        router.push('/');
      });
  }, [bookId, router]);

  // Reset preview item selection when switching tabs to prevent stale data display
  useEffect(() => {
    setSelectedPreviewItem(null);
  }, [activeTab, memorySubTab]);

  // Synchronize and refresh settings from backend settings GET endpoint when tab becomes active
  useEffect(() => {
    if (activeTab === 'Settings' && bookId) {
      apiFetchSettings(bookId)
        .then((settings: any) => {
          if (settings) {
            setPlannerProvider(settings.plannerModel?.provider || 'Claude');
            setPlannerModel(settings.plannerModel?.modelName || 'claude-3-5-sonnet');
            setWriterProvider(settings.writerModel?.provider || 'Claude');
            setWriterModel(settings.writerModel?.modelName || 'claude-3-5-sonnet');
            setCheckerProvider(settings.factCheckerModel?.provider || 'OpenAI');
            setCheckerModel(settings.factCheckerModel?.modelName || 'gpt-4o-mini');

            const allModels = [
              settings.plannerModel,
              settings.writerModel,
              settings.factCheckerModel,
              settings.humanizerModel
            ].filter(Boolean);

            const claudeConf = allModels.find(m => m.provider === 'Claude');
            if (claudeConf?.apiKey) setAnthropicKey(claudeConf.apiKey);

            const geminiConf = allModels.find(m => m.provider === 'Gemini');
            if (geminiConf?.apiKey) setGeminiKey(geminiConf.apiKey);

            const openaiConf = allModels.find(m => m.provider === 'OpenAI');
            if (openaiConf?.apiKey) setOpenaiKey(openaiConf.apiKey);

            const nvidiaConf = allModels.find(m => m.provider === 'Nvidia');
            if (nvidiaConf?.apiKey) setNvidiaKey(nvidiaConf.apiKey);

            const customConf = allModels.find(m => m.provider === 'Custom');
            if (customConf) {
              if (customConf.apiKey) setCustomApiKey(customConf.apiKey);
              if (customConf.endpointUrl) setCustomEndpoint(customConf.endpointUrl);
            }

            const ollamaConf = allModels.find(m => m.provider === 'Ollama');
            if (ollamaConf?.endpointUrl) setOllamaEndpoint(ollamaConf.endpointUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch fresh settings from backend settings GET endpoint", err);
        });
    }
  }, [activeTab, bookId]);

  // Save book changes locally (API changes are processed dynamically through submits)
  const updateBookProject = (updatedBook: BookProject) => {
    setBook(updatedBook);
  };

  // Save Settings configuration - persists locally and pushes to backend
  const handleSaveSettings = async () => {
    if (!book) return;
    setIsSavingSettings(true);
    setSettingsSaved(false);

    // Resolve the correct API key per provider
    const resolveKey = (provider: string) => {
      switch (provider) {
        case 'Claude': return anthropicKey;
        case 'Gemini': return geminiKey;
        case 'OpenAI': return openaiKey;
        case 'Nvidia': return nvidiaKey;
        case 'Ollama': return ollamaEndpoint;
        case 'Custom': return customApiKey;
        default: return '';
      }
    };
    const resolveEndpoint = (provider: string) => {
      if (provider === 'Ollama') return ollamaEndpoint;
      if (provider === 'Custom') return customEndpoint;
      return '';
    };

    const newSettings: ProjectSettings = {
      plannerModel: { provider: plannerProvider, modelName: plannerModel, apiKey: resolveKey(plannerProvider), endpointUrl: resolveEndpoint(plannerProvider) },
      writerModel:  { provider: writerProvider,  modelName: writerModel,  apiKey: resolveKey(writerProvider),  endpointUrl: resolveEndpoint(writerProvider)  },
      factCheckerModel: { provider: checkerProvider, modelName: checkerModel, apiKey: resolveKey(checkerProvider), endpointUrl: resolveEndpoint(checkerProvider) },
      humanizerModel: { provider: writerProvider, modelName: writerModel, apiKey: resolveKey(writerProvider), endpointUrl: resolveEndpoint(writerProvider) }
    };

    const updatedBook: BookProject = { ...book, settings: newSettings };
    updateBookProject(updatedBook);

    try {
      await apiSaveSettings(book.id, newSettings as unknown as SettingsPayload);
    } catch (err) {
      console.warn('[Settings] Backend unreachable, saved locally only.', err);
    }
    setIsSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  if (!book) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-xs text-zinc-500 font-sans">
        Loading workspace parameters...
      </div>
    );
  }

  // Handle Prompt Submission - hits real backend
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptInput,
      timestamp: new Date().toISOString()
    };

    const capturedInput = promptInput;
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setPromptInput('');
    setIsAgentThinking(true);
    setStudioTab('Flow');

    try {
      const result = await apiSubmitPrompt(book.id, capturedInput);

      // Refresh local book state from the backend response
      if (result.projectState) {
        const fresh = result.projectState as BookProject;
        // Merge fresh updates to preserve already loaded chapters/characters list
        updateBookProject({ ...book, ...fresh });
        if (fresh.chapters?.some((c: ChapterItem) => c.status === 'completed')) {
          setStudioTab('Preview');
        }
      }

      const agentMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'System',
        text: result.reply,
        timestamp: new Date().toISOString(),
        thinking: result.thinking,
        cost: result.cost,
        tokens: result.tokens
      };
      setChatMessages([...updatedMessages, agentMsg]);

    } catch (err) {
      console.error('[Agent] Failed to submit prompt:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'System',
        text: 'Failed to connect to the backend. Please ensure the server is running.',
        timestamp: new Date().toISOString()
      };
      setChatMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  // Add asset / prompt modal submit handler - persists to backend then updates local state
  const handleRegisterUserAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;

    const assetName = (newAssetName.trim() || selectedAssetFile?.name || '').trim();
    if (!assetName) return;

    if (selectedAssetFile) {
      try {
        const fresh = await apiUploadAssetFile(book.id, selectedAssetFile, newAssetType) as BookProject;
        if (fresh) updateBookProject(fresh);
      } catch (err) {
        console.warn('[Assets] Backend file upload failed.', err);
      }

      setNewAssetName('');
      setNewAssetContent('');
      setSelectedAssetFile(null);
      setIsAddAssetOpen(false);
      return;
    }

    const content = newAssetContent.trim();
    if (!content) return;

    const sizeVal = newAssetType === 'Prompt'
      ? `${Math.round(content.length / 100) / 10 + 0.1} KB`
      : '120 KB';

    const newAsset: Asset & { content?: string } = {
      id: `as-${Date.now()}`,
      name: assetName,
      type: newAssetType,
      size: sizeVal,
      addedAt: new Date().toISOString(),
      content
    };

    // Optimistic local update
    updateBookProject({ ...book, assets: [...book.assets, newAsset] });
    setSelectedPreviewItem({
      type: 'user_asset',
      id: newAsset.id,
      title: newAsset.name,
      subtitle: `${newAsset.type} · ${newAsset.size}`,
      content: newAsset.content || ''
    });

    setNewAssetName('');
    setNewAssetContent('');
    setSelectedAssetFile(null);
    setIsAddAssetOpen(false);

    // Sync to backend
    try {
      const fresh = await apiUploadAsset(book.id, { name: newAsset.name, type: newAsset.type, content }) as BookProject;
      if (fresh) updateBookProject(fresh);
    } catch (err) {
      console.warn('[Assets] Backend unreachable, saved locally only.', err);
    }
  };


  // Download simulation
  const triggerDownload = (format: 'pdf' | 'docx') => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(book, null, 2)], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${book.title.replace(/\s+/g, '_')}_compiled.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper to group assets in timeline
  const renderUserAssetsTimeline = () => {
    if (!book) return null;

    // Group assets chronologically relative to project creation time
    const userAssets = book.assets.filter(a => a.name !== 'Project Initial Brief');
    const initialAssets = userAssets.filter(a => new Date(a.addedAt).getTime() - new Date(book.createdAt).getTime() < 60000);
    const subsequentAssets = userAssets.filter(a => new Date(a.addedAt).getTime() - new Date(book.createdAt).getTime() >= 60000);

    return (
      <div className="space-y-6 select-none font-sans">
        {/* Initial Group */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Project Initiation</h4>
          </div>
          <div className="pl-3.5 border-l border-zinc-200 ml-0.5 space-y-2.5">
            {/* Initial Brief (Built-in primary context) */}
            <button
              type="button"
              onClick={() => setSelectedPreviewItem({
                type: 'user_asset',
                id: 'initial-brief',
                title: 'Project Initial Brief',
                subtitle: 'Initial Context · Primary Prompt',
                content: book.brief || 'No initial brief text supplied.'
              })}
              className={`w-full text-left p-3 rounded-lg border text-xs transition shadow-xxs cursor-pointer block ${
                selectedPreviewItem?.id === 'initial-brief'
                  ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 border'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold truncate">Initial Outline Brief</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-mono uppercase tracking-wider scale-90 ${
                  selectedPreviewItem?.id === 'initial-brief' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-800 text-zinc-300'
                }`}>Prompt</span>
              </div>
              <p className="line-clamp-2 text-[10px] opacity-75 font-serif italic">"{book.brief}"</p>
              <span className="text-[8px] block mt-2 opacity-50 font-mono">{new Date(book.createdAt).toLocaleString()}</span>
            </button>

            {/* Other Initial Assets */}
            {initialAssets.map((asset) => {
              const isActive = selectedPreviewItem?.id === asset.id;
              const assetContent = (asset as any).content || `Reference content registered for file: ${asset.name}`;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedPreviewItem({
                    type: 'user_asset',
                    id: asset.id,
                    title: asset.name,
                    subtitle: `${asset.type} · ${asset.size || '120 KB'}`,
                    content: assetContent
                  })}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition shadow-xxs cursor-pointer block ${
                    isActive
                      ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 border'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold truncate">{asset.name}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded font-mono uppercase tracking-wider scale-90 ${
                      isActive ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-200 text-zinc-600'
                    }`}>{asset.type.replace(' Reference', '').replace(' Guidelines', '').replace(' File', '')}</span>
                  </div>
                  <p className="line-clamp-1 text-[10px] opacity-75">Registered file reference context.</p>
                  <span className="text-[8px] block mt-2 opacity-50 font-mono">{new Date(asset.addedAt).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subsequent Group */}
        {subsequentAssets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <h4 className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">In-Between Contributions</h4>
            </div>
            <div className="pl-3.5 border-l border-zinc-200 ml-0.5 space-y-2.5">
              {subsequentAssets.map((asset) => {
                const isActive = selectedPreviewItem?.id === asset.id;
                const assetContent = (asset as any).content || `Reference content registered for file: ${asset.name}`;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedPreviewItem({
                      type: 'user_asset',
                      id: asset.id,
                      title: asset.name,
                      subtitle: `${asset.type} · ${asset.size || '120 KB'}`,
                      content: assetContent
                    })}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition shadow-xxs cursor-pointer block ${
                      isActive
                        ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
                        : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 border'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold truncate">{asset.name}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider scale-90 ${
                        isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-100 text-indigo-700'
                      }`}>{asset.type.replace(' Reference', '').replace(' Guidelines', '').replace(' File', '')}</span>
                    </div>
                    <p className="line-clamp-2 text-[10px] opacity-75">{assetContent.slice(0, 80)}...</p>
                    <span className="text-[8px] block mt-2 opacity-50 font-mono">{new Date(asset.addedAt).toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to render preview items formatted inside a simple, elegant text container / code editor
  const renderPreviewCanvasContent = () => {
    if (!selectedPreviewItem) return null;

    return (
      <div className="w-full h-full flex flex-col bg-white border border-zinc-250 rounded-lg shadow-xs overflow-hidden font-sans select-text">
        
        {/* Editor header bar */}
        <div className="flex justify-between items-center bg-zinc-50 px-4 py-2 border-b border-zinc-200 select-none text-[10px] shrink-0 text-zinc-500 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-zinc-700 truncate max-w-[180px]">{selectedPreviewItem.title}</span>
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-400 normal-case">{selectedPreviewItem.subtitle || selectedPreviewItem.type}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPreviewItem(null)}
            className="text-zinc-400 hover:text-zinc-700 text-xs font-bold transition focus:outline-none cursor-pointer"
            title="Close Preview"
          >
            x
          </button>
        </div>

        {/* Editor content wrapper */}
        <div className="flex-1 p-5 overflow-y-auto bg-zinc-50/10 font-mono text-xs leading-relaxed text-zinc-800">
          <div className="space-y-3 font-sans">
            <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider select-none border-b border-zinc-100 pb-1 flex justify-between items-center">
              <span>{selectedPreviewItem.type.replace('_', ' ')} source stream</span>
              <span className="text-zinc-300 font-mono normal-case text-[8px] font-medium">UTF-8 File Layout</span>
            </div>
            <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-zinc-50/50 p-4 border border-zinc-100 rounded-md text-zinc-800 font-light max-h-[480px] overflow-y-auto">
              {selectedPreviewItem.content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const previewChapter = book.chapters.find((ch) => ch.status === 'completed') || book.chapters[0];
  const previewChunks = previewChapter?.content
    ? previewChapter.content.match(/[\s\S]{1,1200}/g) || []
    : [];
  const previewPages = Array.from({ length: Math.max(previewChunks.length, 1) }, (_, idx) => idx + 1);
  const activePreviewContent = previewChunks[selectedPreviewPage - 1] || '';


  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-zinc-200">
      
      {/* Workspace Header Navbar with Breadcrumbs */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/"
            className="text-zinc-400 hover:text-zinc-700 transition font-medium flex items-center gap-1"
          >
            Dashboard
          </Link>
          <span className="text-zinc-300 font-light select-none">/</span>
          <span className="font-semibold text-zinc-900 tracking-tight">{book.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerDownload('pdf')}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 shadow-xs"
          >
            Export as PDF
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left tabs selector sidebar */}
        <aside className="w-16 flex flex-col items-center justify-start border-r border-zinc-200 bg-white py-6 shrink-0 gap-6">
          <button
            onClick={() => setActiveTab('Agent')}
            className={`flex flex-col items-center gap-1 p-2 w-12 rounded-lg transition-all focus:outline-none ${
              activeTab === 'Agent' ? 'bg-zinc-100 text-zinc-900 font-medium animate-fade-in' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title="Chat & Studio Viewer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-3.658A8.967 8.967 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            <span className="text-[9px]">Agent</span>
          </button>

          <button
            onClick={() => setActiveTab('Book')}
            className={`flex flex-col items-center gap-1 p-2 w-12 rounded-lg transition-all focus:outline-none ${
              activeTab === 'Book' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title="Book chapters outline & page preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <span className="text-[9px]">Book</span>
          </button>

          <button
            onClick={() => setActiveTab('Memory')}
            className={`flex flex-col items-center gap-1 p-2 w-12 rounded-lg transition-all focus:outline-none ${
              activeTab === 'Memory' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title="User prompts feed, timeline logs, and cognitive agent memories"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <span className="text-[9px]">Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('Settings')}
            className={`flex flex-col items-center gap-1 p-2 w-12 rounded-lg transition-all focus:outline-none ${
              activeTab === 'Settings' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title="Configure routing models & API key credentials"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <span className="text-[9px]">Settings</span>
          </button>
        </aside>

        {/* Right Tab Content Viewer */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* TAB 1: SPLIT AGENT CHAT & STUDIO CANVAS PREVIEWER */}
          {activeTab === 'Agent' && (
            <div className="flex-1 flex overflow-hidden bg-zinc-100">
              
              {/* Left Column (40%) - Unified Chat Interface */}
              <div className="w-[40%] flex flex-col justify-between bg-white border-r border-zinc-200 overflow-hidden shrink-0">
                
                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center">
                      <div className="max-w-xs rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5">
                        <h3 className="text-xs font-semibold text-zinc-800">No agent conversation yet</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                          Send a prompt to plan, draft, revise, or repair this project. Real agent replies will appear here.
                        </p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div key={msg.id} className={`flex gap-2.5 max-w-full ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                        
                        {/* Custom minimal icon avatar */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          isUser ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}>
                          {msg.sender.charAt(0)}
                        </div>

                        {/* Text bubble space */}
                        <div className="space-y-1 max-w-[82%]">
                          <div className={`flex items-center gap-1.5 text-[9px] text-zinc-400 font-medium ${isUser ? 'justify-end' : ''}`}>
                            <span className="text-zinc-600 font-semibold">{msg.sender}</span>
                            <span>·</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className={`text-xs px-3 py-2 rounded-lg leading-relaxed shadow-xs ${
                            isUser ? 'bg-zinc-950 text-white rounded-tr-none' : 'bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-tl-none'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {/* Agent thinking bubbles */}
                  {isAgentThinking && (
                    <div className="flex gap-2.5 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center justify-center text-[9px] font-bold animate-pulse">
                        G
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="text-[9px] text-zinc-400 font-medium">Orchestration Graph processing...</div>
                        <div className="bg-zinc-50 border border-zinc-100 text-xs px-3 py-2.5 rounded-lg rounded-tl-none text-zinc-400 italic flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping shrink-0" />
                          Running the orchestration graph for this request.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unified Prompt Entry Input Bar */}
                <form onSubmit={handleSendPrompt} className="p-4 border-t border-zinc-100 flex gap-2 items-center bg-zinc-50">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Ask the agent to plan, draft, revise, or repair outlines..."
                    className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={isAgentThinking || !promptInput.trim()}
                    className="rounded-md bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-50 shadow-xs cursor-pointer shrink-0"
                  >
                    Send
                  </button>
                </form>

              </div>

              {/* Right Column (60%) - Dynamic Studio Viewer (Flow & Preview tabs) */}
              <div className="w-[60%] flex flex-col bg-zinc-100 overflow-hidden shrink-0">
                
                {/* Flow vs Preview Tabs bar */}
                <div className="h-12 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0 select-none">
                  <div className="flex gap-4 text-xs font-semibold text-zinc-400">
                    <button
                      onClick={() => setStudioTab('Flow')}
                      className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none ${
                        studioTab === 'Flow' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
                      }`}
                    >
                      Agent Flow
                    </button>
                    <button
                      onClick={() => setStudioTab('Preview')}
                      className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none ${
                        studioTab === 'Preview' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
                      }`}
                    >
                      Preview Canvas
                    </button>
                  </div>
                </div>

                {/* Trace Logs or TipTap preview canvas */}
                <div className={`flex-1 ${studioTab === 'Preview' ? 'overflow-hidden' : 'overflow-y-auto p-6 flex flex-col items-center'}`}>
                  
                  {/* STUDIO TAB: AGENT FLOW GRAPH */}
                  {studioTab === 'Flow' && (
                    <div className="w-full max-w-xl space-y-6">
                      
                      {/* Active nodes trace */}
                      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Orchestration Graph Trace</h3>
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase">{book.memory.decisionLog.length} real events</span>
                        </div>
                        
                        <div className="space-y-3 font-sans text-xs">
                          {book.memory.decisionLog.length === 0 && !isAgentThinking ? (
                            <p className="text-[11px] text-zinc-400 italic">No graph events yet. Run an agent prompt to populate this trace.</p>
                          ) : (
                            book.memory.decisionLog.map((log, idx) => (
                              <div key={`${log.timestamp}-${idx}`} className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-zinc-700 font-semibold w-24 truncate">{log.agent}</span>
                                <span className="text-zinc-400 truncate">{log.resolution}</span>
                              </div>
                            ))
                          )}
                          {isAgentThinking && (
                            <div className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              <span className="text-zinc-700 font-semibold w-24">Running</span>
                              <span className="text-zinc-400">Awaiting backend response.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STUDIO TAB: A4 EDITOR PREVIEW */}
                  {studioTab === 'Preview' && (
                    <div className="flex flex-row items-stretch w-full h-full overflow-hidden">
                      
                      {/* Leftside thumbnail page panel (Scrollable) */}
                      <div className="w-24 border-r border-zinc-200 bg-white p-2.5 flex flex-col gap-3 overflow-y-auto shrink-0 select-none">
                        <span className="text-[7.5px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5 text-center">Pages</span>
                        
                        {/* Pages List */}
                        {previewPages.map((pageNum) => {
                          const isActive = selectedPreviewPage === pageNum;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setSelectedPreviewPage(pageNum)}
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
                                  <span>{previewChapter ? `Ch ${previewChapter.number}` : 'Book'}</span>
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
                                <span className="text-[2px] text-zinc-300 tracking-wide text-center scale-75 origin-bottom">Draft</span>
                              </div>
                              <span className="text-[8px] uppercase font-bold tracking-wider">
                                Page {pageNum}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Rightside active A4 page view (Scrollable) */}
                      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                        {/* A4 Canvas Page frame */}
                        <div className="w-[500px] min-h-[707px] bg-white border border-zinc-300 shadow-md p-10 font-serif leading-relaxed text-xs relative select-text mb-10">
                          
                          {/* Running Header */}
                          <div className="flex justify-between text-[9px] font-sans text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-6 shrink-0">
                            <span>{book.title}</span>
                            <span>Preview Page {selectedPreviewPage} of {previewPages.length}</span>
                          </div>

                          <div className="space-y-4">
                            <h2 className="text-center font-sans text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                              {previewChapter ? `Chapter ${previewChapter.number}` : 'Manuscript'} · Page {selectedPreviewPage}
                            </h2>
                            {previewChapter && activePreviewContent ? (
                              <div className="space-y-4">
                                <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">{previewChapter.title}</h1>
                                <p className="indent-6 whitespace-pre-wrap text-justify leading-relaxed">{activePreviewContent}</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                                <span className="text-zinc-400 text-xs mb-2">No generated chapter preview yet</span>
                                <p className="text-[10px] text-zinc-400 max-w-xs">Generated chapter text will render here in manuscript pages.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOK LAYOUT OUTLINE & SIMULATED A4 TIPTAP EDITOR */}
          {activeTab === 'Book' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Chapters & Structure outline tree (Left - Scrollable) */}
              <div className="w-64 border-r border-zinc-200 bg-white p-4 flex flex-col shrink-0 justify-between h-full">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <h3 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Book Layout Nodes</h3>
                  
                  {/* Front Matter Tree */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">Front Matter</span>
                    {['half-title', 'title-page', 'copyright', 'contents', 'preface'].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setActiveBookSection(sec)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                          activeBookSection === sec ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {sec.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>

                  {/* Body Chapters Tree */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">Body Chapters</span>
                    {book.chapters.map((ch: ChapterItem) => (
                      <button
                        key={ch.id}
                        onClick={() => setActiveBookSection(ch.id)}
                        className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                          activeBookSection === ch.id ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-200' : 'text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <span className="truncate pr-1">Ch {ch.number}: {ch.title.split(':')[0]}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          ch.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-200'
                        }`} title={ch.status} />
                      </button>
                    ))}
                  </div>

                  {/* Back Matter Tree */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">Back Matter</span>
                    {['glossary', 'references', 'about-author'].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setActiveBookSection(sec)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                          activeBookSection === sec ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {sec.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 text-[10px] text-zinc-400 space-y-1 shrink-0">
                  <div>Word Count: <strong>{book.chapters.reduce((s: number, c: ChapterItem) => s + c.wordCount, 0)}</strong></div>
                  <div>Chapters: <strong>{book.chapters.length}</strong></div>
                </div>
              </div>

              {/* simulated editor canvas (Right) */}
              <div className="flex-1 bg-zinc-100 p-8 overflow-y-auto flex flex-col items-center">
                
                {/* Editor page container */}
                <div className="flex flex-col items-center w-full">
                  <div className="w-[595px] min-h-[842px] bg-white border border-zinc-300 shadow-md p-14 font-serif leading-relaxed text-xs relative select-text mb-10">
                    
                    {/* Running Header */}
                    <div className="flex justify-between text-[9px] font-sans text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-8 shrink-0">
                      <span>{book.title}</span>
                      <span>Active Editor Draft</span>
                    </div>

                    {/* Editor Content Area */}
                    <div className="flex-1 flex flex-col justify-start">
                      {activeBookSection === 'half-title' && (
                        <div className="text-center py-20 font-sans">
                          <h1 className="text-xl font-light text-zinc-900 tracking-widest mb-2 uppercase">{book.title}</h1>
                          {book.subtitle && <p className="text-[10px] text-zinc-400 italic tracking-wider">{book.subtitle}</p>}
                        </div>
                      )}

                      {activeBookSection === 'title-page' && (
                        <div className="text-center py-20 font-sans flex flex-col justify-between h-96">
                          <div>
                            <h1 className="text-2xl font-light text-zinc-950 tracking-widest uppercase">{book.title}</h1>
                            {book.subtitle && <p className="text-[10px] text-zinc-500 italic mt-2 tracking-wider">{book.subtitle}</p>}
                          </div>
                          <div className="text-[10px] text-zinc-400 tracking-wider">
                            <p className="font-semibold text-zinc-800">Author / Publisher</p>
                            <p className="mt-1">Publication details will appear here.</p>
                          </div>
                        </div>
                      )}

                      {activeBookSection === 'copyright' && (
                        <div className="text-left font-sans text-[10px] text-zinc-500 max-w-md py-10 space-y-4">
                          <h2 className="text-xs font-bold text-zinc-800">COPYRIGHT REGISTRATION</h2>
                          <p>Copyright, ISBN, edition, and rights information will appear here when supplied.</p>
                        </div>
                      )}

                      {activeBookSection === 'contents' && (
                        <div className="space-y-6">
                          <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-8">Table of Contents</h2>
                          <div className="font-sans text-xs space-y-2.5 max-w-md mx-auto">
                            <div className="flex justify-between border-b border-dashed border-zinc-200 pb-0.5">
                              <span>Introduction & Preface</span>
                              <span>v</span>
                            </div>
                            {book.chapters.map((ch: ChapterItem, idx: number) => (
                              <div key={ch.id} className="flex justify-between border-b border-dashed border-zinc-200 pb-0.5">
                                <span>Chapter {ch.number}: {ch.title}</span>
                                <span className={ch.status === 'completed' ? 'text-zinc-900 font-semibold' : 'text-zinc-300 italic'}>
                                  {ch.status === 'completed' ? `${(idx + 1) * 12}` : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeBookSection === 'preface' && (
                        <div className="space-y-4 leading-relaxed text-xs">
                          <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">Preface</h2>
                          <p className="text-center text-zinc-400 italic font-sans">Preface content has not been generated yet.</p>
                        </div>
                      )}

                      {/* Render Chapters */}
                      {book.chapters.map((ch: ChapterItem) => {
                        if (activeBookSection === ch.id) {
                          return (
                            <div key={ch.id} className="space-y-4">
                              <h2 className="text-center font-sans text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Chapter {ch.number}</h2>
                              <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">{ch.title}</h1>
                              {ch.status === 'completed' ? (
                                <div className="text-xs leading-relaxed space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                  <p className="indent-6 text-justify">{ch.content}</p>
                                  <p className="text-[10px] text-zinc-400 font-sans italic mt-10">Word count: {ch.wordCount} words · Status: {ch.status}</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                                  <span className="text-zinc-400 text-xs mb-2">Chapter Content Empty</span>
                                  <p className="text-[9px] text-zinc-400 max-w-xs">Generated content for this chapter will appear here.</p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}

                      {activeBookSection === 'glossary' && (
                        <div className="space-y-4">
                          <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">Glossary</h2>
                          <div className="space-y-4 text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                            {book.memory.factRegistry.length > 0 ? (
                              book.memory.factRegistry.map((f: FactItem, idx: number) => (
                                <div key={f.id} className="border-b border-zinc-100 pb-2">
                                  <strong className="text-zinc-900 font-sans text-[11px] block">{idx + 1}. Fact Assertion Audit</strong>
                                  <p className="text-[11px] text-zinc-600 mt-1 italic">"{f.assertion}"</p>
                                  <span className="text-[9px] text-zinc-400 block mt-1">Source: {f.source}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-zinc-400 text-center italic">No glossary definitions compiled yet. Drafting chapters registers key terms.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeBookSection === 'references' && (
                        <div className="space-y-4">
                          <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">References</h2>
                          <div className="space-y-3 text-[10px] leading-relaxed max-w-md mx-auto font-sans">
                            {book.memory.factRegistry.map((f: FactItem) => (
                              <div key={f.id} className="text-zinc-600 pl-4 -indent-4">
                                - {f.source} (Verified by {f.verifiedBy} on {new Date(f.timestamp).toLocaleDateString()})
                              </div>
                            ))}
                            {book.memory.factRegistry.length === 0 && (
                              <div className="text-zinc-400 italic text-center">No references registered yet.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeBookSection === 'about-author' && (
                        <div className="space-y-4 text-xs leading-relaxed">
                          <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">About the Author</h2>
                          <p className="text-center text-zinc-400 italic font-sans">Author bio has not been added yet.</p>
                        </div>
                      )}
                    </div>

                    {/* Footer page number */}
                    <div className="flex justify-center text-[10px] font-sans text-zinc-400 border-t border-zinc-100 pt-3 mt-8 shrink-0 select-none">
                      <span>
                        {activeBookSection === 'half-title' || activeBookSection === 'title-page' ? '' : '12'}
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: COGNITIVE MEMORY WORKSPACE */}
          {activeTab === 'Memory' && book && (
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              
              {/* Memory Header Tabs */}
              <div className="h-12 border-b border-zinc-200 bg-zinc-50 px-6 flex items-center justify-between shrink-0 select-none">
                <div className="flex gap-4 text-xs font-semibold text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setMemorySubTab('User')}
                    className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
                      memorySubTab === 'User' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
                    }`}
                  >
                    User Context Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemorySubTab('AgentMemory')}
                    className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
                      memorySubTab === 'AgentMemory' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
                    }`}
                  >
                    Agent Memory Stores
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemorySubTab('Timeline')}
                    className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
                      memorySubTab === 'Timeline' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
                    }`}
                  >
                    Execution Timeline
                  </button>
                </div>
                
                <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest font-sans">Cognitive Checkpoint System</div>
              </div>

              {/* Sub tab grid container split layout */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Left column - lists (dynamic 60% or 100% width) */}
                <div className={`${selectedPreviewItem ? 'w-[60%]' : 'w-full'} border-r border-zinc-200 bg-zinc-50/30 flex flex-col overflow-hidden shrink-0 transition-all duration-300`}>
                  
                  {/* Scrollable list container */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    
                    {/* SUBTAB 1: USER CONTEXT */}
                    {memorySubTab === 'User' && (
                      <div className="space-y-4 max-w-3xl">
                        <div className="flex justify-between items-center font-sans">
                          <div>
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">User Context Timeline</h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Timeline of initial briefs, guidelines, and in-between uploaded documents.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAddAssetOpen(true)}
                            className="rounded bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 transition shadow-xxs cursor-pointer shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                        {renderUserAssetsTimeline()}
                      </div>
                    )}

                    {/* SUBTAB 2: AGENT MEMORY STORES */}
                    {memorySubTab === 'AgentMemory' && (
                      <div className="space-y-5 font-sans max-w-3xl">
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Orchestrator Memories</h3>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Cognitive indexes compiled during planning, fact checking, and style matrices scanning.</p>
                        </div>

                        <div className="space-y-4">
                          {/* Registry Fact count selector */}
                          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fact Registry ({book.memory.factRegistry.length})</span>
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded uppercase font-semibold scale-90">Grounded</span>
                            </div>
                            {book.memory.factRegistry.length === 0 ? (
                              <p className="text-[10px] italic text-zinc-400">No verified facts indexed in RAG memory yet.</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {book.memory.factRegistry.map((fact: FactItem) => {
                                  const isActive = selectedPreviewItem?.id === fact.id;
                                  return (
                                    <button
                                      key={fact.id}
                                      type="button"
                                      onClick={() => setSelectedPreviewItem({
                                        type: 'fact',
                                        id: fact.id,
                                        title: `Grounded Fact: ${fact.assertion.slice(0, 35)}...`,
                                        subtitle: `Verified Source · RAG Key`,
                                        content: `ASSERTION:\n"${fact.assertion}"\n\nSOURCE DOCUMENT:\n${fact.source}\n\nVERIFIER AGENT NODE:\n${fact.verifiedBy}\n\nTIME INDEXED:\n${new Date(fact.timestamp || book.createdAt).toLocaleString()}\n\nRELIABILITY SCORE:\n100% (Audited & Citations Aligned)`
                                      })}
                                      className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
                                        isActive ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
                                      }`}
                                    >
                                      <p className="line-clamp-2 italic font-serif">"{fact.assertion}"</p>
                                      <div className="text-[8px] text-zinc-400 flex justify-between mt-1.5 font-sans font-medium">
                                        <span>Source: {fact.source}</span>
                                        <span className="text-emerald-600">Verified by {fact.verifiedBy}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Character/Concept Bible count selector */}
                          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entity & Concept Bible ({book.memory.characterBible.length})</span>
                              <span className="text-[8px] bg-zinc-100 text-zinc-600 border border-zinc-200 px-1 py-0.5 rounded uppercase font-semibold scale-90">Bible</span>
                            </div>
                            {book.memory.characterBible.length === 0 ? (
                              <p className="text-[10px] italic text-zinc-400">Character bible is empty.</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {book.memory.characterBible.map((char: CharacterBibleItem) => {
                                  const isActive = selectedPreviewItem?.id === char.id;
                                  return (
                                    <button
                                      key={char.id}
                                      type="button"
                                      onClick={() => setSelectedPreviewItem({
                                        type: 'character',
                                        id: char.id,
                                        title: `Bible Entry: ${char.name}`,
                                        subtitle: `Role Profile · Continuity Tracking`,
                                        content: `ENTITY NAME:\n${char.name}\n\nROLE / CONCEPT KEY:\n${char.role}\n\nCHARACTER DEVELOPMENT ARC:\n${char.arc}\n\nACTIVE REGISTERED CHAPTERS:\nChapters ${char.activeChapters.join(', ')}\n\nCOGNITIVE ATTRIBUTES:\n${Object.entries(char.attributes).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
                                      })}
                                      className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
                                        isActive ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold">{char.name}</span>
                                        <span className="text-[8.5px] font-semibold text-zinc-500 bg-zinc-100 px-1 rounded">{char.role}</span>
                                      </div>
                                      <p className="line-clamp-1 text-[10px] text-zinc-500">Arc: {char.arc}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Callback index selector */}
                          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Setup/Payoff Callback Index ({book.memory.callbackIndex.length})</span>
                              <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1 py-0.5 rounded uppercase font-semibold scale-90">Callbacks</span>
                            </div>
                            {book.memory.callbackIndex.length === 0 ? (
                              <p className="text-[10px] italic text-zinc-400">No callbacks registered in index.</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {book.memory.callbackIndex.map((cb: CallbackItem) => {
                                  const isActive = selectedPreviewItem?.id === cb.id;
                                  return (
                                    <button
                                      key={cb.id}
                                      type="button"
                                      onClick={() => setSelectedPreviewItem({
                                        type: 'callback',
                                        id: cb.id,
                                        title: `Motif Callback: ${cb.context.slice(0, 35)}...`,
                                        subtitle: `Setup & Payoff Continuity Index`,
                                        content: `NARRATIVE MOTIF SETUP:\n"${cb.context}"\n\nSETUP STAGE:\nChapter ${cb.setupChapter}\n\nRESOLVING STAGE:\nChapter ${cb.payoffChapter}\n\nRESOLUTION STATUS:\n${cb.resolved ? 'RESOLVED AND CONFIRMED' : 'SETUP INDEXED - PENDING GENERATION'}\n\nAUDITED BY:\nOrchestration Planner Graph Node`
                                      })}
                                      className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
                                        isActive ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
                                      }`}
                                    >
                                      <p className="line-clamp-1">{cb.context}</p>
                                      <div className="flex justify-between items-center text-[8.5px] mt-1 font-medium text-zinc-400">
                                        <span>Ch {cb.setupChapter} to Ch {cb.payoffChapter}</span>
                                        <span className={`font-semibold ${cb.resolved ? 'text-emerald-600' : 'text-amber-600'}`}>{cb.resolved ? 'Resolved' : 'Setup'}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Tonality preset styleMatrix card clicker */}
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewItem({
                              type: 'style',
                              id: 'style-matrix',
                              title: `Tonality Fingerprint Matrix`,
                              subtitle: `Vocabulary Control & Style Metrics`,
                              content: `ACTIVE WRITING PRESET:\n${book.tonality}\n\nSTYLE DIMENSION TARGETS:\n${Object.entries(book.memory.tonalityFingerprint)
                                .filter(([_, v]) => typeof v === 'number')
                                .map(([k, v]) => `- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${Math.round((v as number) * 100)}%`)
                                .join('\n') || 'No style dimensions recorded yet.'}\n\nFORBIDDEN PHRASES:\n${book.memory.tonalityFingerprint.forbiddenPhrases.length > 0 ? book.memory.tonalityFingerprint.forbiddenPhrases.map(phrase => `- ${phrase}`).join('\n') : 'No forbidden phrases recorded yet.'}`
                            })}
                            className={`w-full rounded-lg border text-left p-4 shadow-xxs bg-white flex justify-between items-center transition cursor-pointer ${
                              selectedPreviewItem?.id === 'style-matrix' ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'border-zinc-200 hover:border-zinc-300 bg-white border'
                            }`}
                          >
                            <div>
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tonality Style Matrix</h4>
                              <p className="text-[10px] text-zinc-400 mt-0.5">Style scores and vocabulary bans for {book.tonality}.</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-zinc-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 3: TIMELINE / DECISION LOG */}
                    {memorySubTab === 'Timeline' && (
                      <div className="space-y-4 font-sans max-w-3xl">
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Execution Timeline Logs</h3>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Chronological records of orchestrator node completions and outline self-heals.</p>
                        </div>

                        <div className="relative border-l border-zinc-200 pl-4 ml-2 space-y-4 py-1">
                          {book.memory.decisionLog.length === 0 ? (
                            <p className="text-[10px] italic text-zinc-400">No logs in timeline yet.</p>
                          ) : (
                            book.memory.decisionLog.map((log: DecisionItem, idx: number) => {
                              const logId = `${idx}-${log.timestamp}`;
                              const isActive = selectedPreviewItem?.id === logId;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedPreviewItem({
                                    type: 'timeline',
                                    id: logId,
                                    title: `Timeline Log: ${log.step}`,
                                    subtitle: `${log.agent} Node Action`,
                                    content: `AGENT NODE:\n${log.agent}\n\nSTEP ACTION:\n${log.action}\n\nTIME RESOLVED:\n${new Date(log.timestamp).toLocaleString()}\n\nSUMMARY:\n${log.resolution}`
                                  })}
                                  className={`w-full text-left p-3 rounded-lg border text-xs relative transition shadow-xxs cursor-pointer block ${
                                    isActive
                                      ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
                                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 border'
                                  }`}
                                >
                                  <span className={`absolute -left-[21.5px] top-4 w-2 h-2 rounded-full border ${
                                    isActive ? 'border-zinc-950 bg-zinc-950' : 'border-zinc-300 bg-white'
                                  }`} />
                                  
                                  <div className="flex items-center justify-between text-[8px] opacity-60 mb-1 font-mono uppercase tracking-wider font-semibold">
                                    <span>{log.agent} Node</span>
                                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  
                                  <h4 className="font-bold text-[11px] truncate">{log.step}</h4>
                                  <p className="line-clamp-1 text-[10px] opacity-75 italic mt-0.5">"{log.action}"</p>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right column - Simple Editor Preview Canvas (40% width) */}
                {selectedPreviewItem && (
                  <div className="w-[40%] bg-zinc-50 p-5 overflow-y-auto flex flex-col items-center shrink-0 border-l border-zinc-200 transition-all duration-300 animate-fade-in">
                    {renderPreviewCanvasContent()}
                  </div>
                )}

              </div>

              {/* CSS overlay dialog modal to Add User Asset or Prompt */}
              {isAddAssetOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-955/40 backdrop-blur-xs select-none">
                  <div className="w-[500px] bg-white rounded-xl border border-zinc-250 p-6 shadow-xl space-y-4 animate-fade-in font-sans">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Add User Context Asset</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetFile(null);
                          setIsAddAssetOpen(false);
                        }}
                        className="text-zinc-400 hover:text-zinc-600 text-xs font-medium cursor-pointer"
                      >
                        x Close
                      </button>
                    </div>

                    <form onSubmit={handleRegisterUserAsset} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Asset Name / Prompt Title</label>
                        <input
                          type="text"
                          placeholder="Asset name or prompt title"
                          value={newAssetName}
                          onChange={(e) => setNewAssetName(e.target.value)}
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-xxs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Context Type</label>
                        <select
                          value={newAssetType}
                          onChange={(e) => {
                            setNewAssetType(e.target.value);
                            if (e.target.value === 'Prompt') {
                              setSelectedAssetFile(null);
                            }
                          }}
                          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-xxs"
                        >
                          <option>Markdown File</option>
                          <option>Text Guidelines</option>
                          <option>Prompt</option>
                        </select>
                      </div>

                      {newAssetType !== 'Prompt' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Upload Asset File</label>
                          <input
                            type="file"
                            accept=".md,.txt,text/markdown,text/plain"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (!file) {
                                setSelectedAssetFile(null);
                                return;
                              }

                              const ext = file.name.split('.').pop()?.toLowerCase();
                              if (ext !== 'md' && ext !== 'txt') {
                                alert('Only .md and .txt files are supported.');
                                e.currentTarget.value = '';
                                setSelectedAssetFile(null);
                                return;
                              }

                              setSelectedAssetFile(file);
                              setNewAssetName((current) => current || file.name);
                              setNewAssetType(ext === 'md' ? 'Markdown File' : 'Text Guidelines');
                            }}
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-zinc-700 focus:outline-none focus:border-zinc-500 shadow-xxs"
                          />
                          {selectedAssetFile && (
                            <p className="text-[10px] text-zinc-500">
                              Selected: {selectedAssetFile.name} ({(selectedAssetFile.size / 1024).toFixed(1)} KB)
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                          {newAssetType === 'Prompt' ? 'Prompt Text Content' : 'Manual Reference Content'}
                        </label>
                        <textarea
                          required={!selectedAssetFile}
                          rows={6}
                          placeholder={newAssetType === 'Prompt' 
                            ? "Enter prompt instructions, e.g., 'Ensure Sarah resolves her relationship with Marcus by Chapter 10...'"
                            : "Paste .md or .txt content here, or upload a file above..."
                          }
                          value={newAssetContent}
                          onChange={(e) => setNewAssetContent(e.target.value)}
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-xxs leading-relaxed font-sans"
                        />
                      </div>

                      <div className="flex gap-2 justify-end border-t border-zinc-100 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssetFile(null);
                            setIsAddAssetOpen(false);
                          }}
                          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-md bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition shadow-xxs cursor-pointer"
                        >
                          Add to Memory
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: ROUTING SETTINGS CONFIGURATION PANEL */}
          {activeTab === 'Settings' && (
            <div className="flex-1 p-8 overflow-y-auto bg-zinc-50 flex flex-col items-center">
              <div className="w-full max-w-2xl space-y-6 font-sans">

                <div>
                  <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">Model Routing Settings</h2>
                  <p className="text-[10px] text-zinc-500 mt-1">Configure orchestration providers, parameters, and credentials for active planner and writer agents.</p>
                </div>

                {/* Agent selectors card */}
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
                  <h3 className="text-xs font-bold text-zinc-800 border-b border-zinc-100 pb-2 uppercase tracking-wide">LLM Router Assignments</h3>

                  {/* Helper for provider select */}
                  {(['Planner', 'Writer', 'Fact-Checker'] as const).map((label) => {
                    const isChecker = label === 'Fact-Checker';
                    const provider = isChecker ? checkerProvider : label === 'Planner' ? plannerProvider : writerProvider;
                    const setProvider = isChecker ? setCheckerProvider : label === 'Planner' ? setPlannerProvider : setWriterProvider;
                    const model = isChecker ? checkerModel : label === 'Planner' ? plannerModel : writerModel;
                    const setModel = isChecker ? setCheckerModel : label === 'Planner' ? setPlannerModel : setWriterModel;

                    return (
                      <div key={label} className="grid gap-4 sm:grid-cols-3 items-center">
                        <span className="text-xs font-semibold text-zinc-700">{label} Agent Node</span>
                        <select
                          value={provider}
                          onChange={(e) => setProvider(e.target.value as any)}
                          className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                        >
                          <option value="Claude">Anthropic Claude</option>
                          <option value="Gemini">Google Gemini</option>
                          <option value="OpenAI">OpenAI GPT-4</option>
                          <option value="Nvidia">NVIDIA NIM</option>
                          <option value="Ollama">Ollama (Localhost)</option>
                          <option value="Custom">Custom Endpoint</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Model Name"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* API Credentials card */}
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-zinc-800 border-b border-zinc-100 pb-2 uppercase tracking-wide">Credentials & Connection Endpoints</h3>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Anthropic API Key</label>
                    <input
                      type="password"
                      placeholder="sk-ant-..."
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Google Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">OpenAI API Key</label>
                    <input
                      type="password"
                      placeholder="sk-proj-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="space-y-1.5 rounded-md border border-green-100 bg-green-50/50 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <label className="text-[9px] font-bold text-green-700 uppercase tracking-wider">NVIDIA NIM API Key</label>
                      <span className="text-[8px] text-green-500 font-mono bg-green-100 px-1 py-0.5 rounded">integrate.api.nvidia.com</span>
                    </div>
                    <input
                      type="password"
                      placeholder="nvapi-..."
                      value={nvidiaKey}
                      onChange={(e) => setNvidiaKey(e.target.value)}
                      className="w-full rounded border border-green-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-green-400"
                    />
                    <p className="text-[9px] text-green-600 mt-1">Default model: <span className="font-mono">mistralai/mistral-large-3-675b-instruct-2512</span></p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Ollama Local API Endpoint</label>
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={ollamaEndpoint}
                      onChange={(e) => setOllamaEndpoint(e.target.value)}
                      className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="space-y-2 rounded-md border border-indigo-100 bg-indigo-50/40 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <label className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Custom LLM Endpoint</label>
                      <span className="text-[8px] text-indigo-400 font-mono bg-indigo-100 px-1 py-0.5 rounded">OpenAI-compatible</span>
                    </div>
                    <input
                      type="text"
                      placeholder="https://your-llm-host.com/v1"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      className="w-full rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-400"
                    />
                    <input
                      type="password"
                      placeholder="Bearer token / API key for custom endpoint"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="w-full rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-400"
                    />
                    <p className="text-[9px] text-indigo-500">Any OpenAI-compatible API - LM Studio, vLLM, Together AI, Groq, etc.</p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className={`rounded px-4 py-2 text-xs font-semibold text-white transition shadow-sm w-full flex items-center justify-center gap-2 ${
                        settingsSaved
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-zinc-950 hover:bg-zinc-800'
                      } disabled:opacity-60`}
                    >
                      {isSavingSettings && (
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      )}
                      {settingsSaved ? 'Configuration Saved' : isSavingSettings ? 'Saving...' : 'Save Configuration Settings'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}



