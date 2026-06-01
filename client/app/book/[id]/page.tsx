'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookProject, ChatMessage, Asset, ProjectSettings } from '../../types';
import { submitMessageStream, saveSettings as apiSaveSettings, uploadAsset as apiUploadAsset, uploadAssetFile as apiUploadAssetFile, fetchProject as apiFetchProject, fetchSettings as apiFetchSettings, SettingsPayload, resumeAgent } from '../../lib/api';
import AddAssetModal from '../../components/AddAssetModal';
import AgentTab from '../../pages/AgentTab';
import BookTab from '../../pages/BookTab';
import MemoryTab from '../../pages/MemoryTab';
import SettingsTab from '../../pages/SettingsTab';

export default function BookWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookId = resolvedParams.id;

  const [book, setBook] = useState<BookProject | null>(null);
  const [booksList, setBooksList] = useState<BookProject[]>([]);
  const [activeTab, setActiveTab] = useState<'Agent' | 'Book' | 'Memory' | 'Settings'>('Agent');
  const [activeSubTab, setActiveSubTab] = useState<'Registry' | 'Bible' | 'Callbacks' | 'Tonality' | 'Decisions'>('Registry');

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
  const [currentAgentStatus, setCurrentAgentStatus] = useState<string>('');
  const [streamedDocumentText, setStreamedDocumentText] = useState<string>('');
  const [pendingConfirmation, setPendingConfirmation] = useState<{ text: string, run_id: string } | null>(null);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('Markdown File');

  // Project settings states
  type ProviderType = 'Ollama' | 'Gemini' | 'Claude' | 'OpenAI' | 'Nvidia' | 'Custom';
  const [plannerProvider, setPlannerProvider] = useState<ProviderType>('Nvidia');
  const [plannerModel, setPlannerModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
  const [writerProvider, setWriterProvider] = useState<ProviderType>('Nvidia');
  const [writerModel, setWriterModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
  const [checkerProvider, setCheckerProvider] = useState<ProviderType>('Nvidia');
  const [checkerModel, setCheckerModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
  const [researcherProvider, setResearcherProvider] = useState<ProviderType>('Nvidia');
  const [researcherModel, setResearcherModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
  const [humanizerProvider, setHumanizerProvider] = useState<ProviderType>('Nvidia');
  const [humanizerModel, setHumanizerModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
  const [editorProvider, setEditorProvider] = useState<ProviderType>('Nvidia');
  const [editorModel, setEditorModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
  const [worldBuilderProvider, setWorldBuilderProvider] = useState<ProviderType>('Nvidia');
  const [worldBuilderModel, setWorldBuilderModel] = useState('mistralai/mistral-large-3-675b-instruct-2512');
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
            setPlannerProvider(settings.plannerModel?.provider || 'Nvidia');
            setPlannerModel(settings.plannerModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');
            setWriterProvider(settings.writerModel?.provider || 'Nvidia');
            setWriterModel(settings.writerModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');
            setCheckerProvider(settings.factCheckerModel?.provider || 'Nvidia');
            setCheckerModel(settings.factCheckerModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');
            setResearcherProvider(settings.researcherModel?.provider || 'Nvidia');
            setResearcherModel(settings.researcherModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');
            setHumanizerProvider(settings.humanizerModel?.provider || 'Nvidia');
            setHumanizerModel(settings.humanizerModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');
            setEditorProvider(settings.editorModel?.provider || 'Nvidia');
            setEditorModel(settings.editorModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');
            setWorldBuilderProvider(settings.worldBuilderModel?.provider || 'Nvidia');
            setWorldBuilderModel(settings.worldBuilderModel?.modelName || 'mistralai/mistral-large-3-675b-instruct-2512');

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
      writerModel: { provider: writerProvider, modelName: writerModel, apiKey: resolveKey(writerProvider), endpointUrl: resolveEndpoint(writerProvider) },
      factCheckerModel: { provider: checkerProvider, modelName: checkerModel, apiKey: resolveKey(checkerProvider), endpointUrl: resolveEndpoint(checkerProvider) },
      humanizerModel: { provider: humanizerProvider, modelName: humanizerModel, apiKey: resolveKey(humanizerProvider), endpointUrl: resolveEndpoint(humanizerProvider) },
      researcherModel: { provider: researcherProvider, modelName: researcherModel, apiKey: resolveKey(researcherProvider), endpointUrl: resolveEndpoint(researcherProvider) },
      editorModel: { provider: editorProvider, modelName: editorModel, apiKey: resolveKey(editorProvider), endpointUrl: resolveEndpoint(editorProvider) },
      worldBuilderModel: { provider: worldBuilderProvider, modelName: worldBuilderModel, apiKey: resolveKey(worldBuilderProvider), endpointUrl: resolveEndpoint(worldBuilderProvider) }
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

  // Handle Prompt Submission - hits real backend with streaming
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    console.log('='.repeat(80));
    console.log('[DEBUG PAGE] handleSendPrompt called');
    console.log('[DEBUG PAGE] Prompt:', promptInput);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptInput,
      timestamp: new Date().toISOString()
    };

    const capturedInput = promptInput;
    const updatedMessages = [...chatMessages, userMsg];
    
    // Create a placeholder message for the System response to stream into
    const agentMsgId = `msg-${Date.now() + 1}`;
    const initialAgentMsg: ChatMessage = {
      id: agentMsgId,
      sender: 'System',
      text: '',
      timestamp: new Date().toISOString(),
      thinking: '',
      cost: 0,
      tokens: 0
    };

    console.log('[DEBUG PAGE] Agent message ID:', agentMsgId);
    console.log('[DEBUG PAGE] Setting initial messages...');

    setChatMessages([...updatedMessages, initialAgentMsg]);
    setPromptInput('');
    setIsAgentThinking(true);
    setCurrentAgentStatus('');
    setStreamedDocumentText('');
    setPendingConfirmation(null);

    let tokenCount = 0;

    try {
      console.log('[DEBUG PAGE] Calling submitMessageStream...');
      
      await submitMessageStream(book.id, capturedInput, (chunk) => {
        console.log('[DEBUG PAGE] Chunk received:', chunk.event, chunk.text ? `"${chunk.text.substring(0, 30)}..."` : '');
        
        if (chunk.event === 'chat_message' || chunk.event === 'token') {
          tokenCount++;
          if (tokenCount % 10 === 0) {
            console.log(`[DEBUG PAGE] ✅ Token #${tokenCount} - updating UI`);
          }
          
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMsgId
                ? { ...msg, text: msg.text + (chunk.text || '') }
                : msg
            )
          );
        } else if (chunk.event === 'document_stream') {
          setStreamedDocumentText((prev) => prev + (chunk.text || ''));
        } else if (chunk.event === 'agent_status') {
          setCurrentAgentStatus(chunk.text || '');
        } else if (chunk.event === 'user_confirmation') {
          setPendingConfirmation({ text: chunk.text || 'Do you approve?', run_id: chunk.run_id || '' });
        } else if (chunk.event === 'done') {
          console.log('[DEBUG PAGE] ✅ Done event received');
          console.log('[DEBUG PAGE] Final reply length:', chunk.reply?.length || 0);
          console.log('[DEBUG PAGE] Total tokens in session:', tokenCount);
          
          // Refresh local book state from the completed backend state payload
          if (chunk.projectState) {
            const fresh = chunk.projectState as BookProject;
            setBook((curr) => (curr ? { ...curr, ...fresh } : curr));
          }
          
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMsgId
                ? {
                    ...msg,
                    text: chunk.reply || msg.text,
                    thinking: chunk.thinking || '',
                    cost: chunk.cost || 0,
                    tokens: chunk.tokens || 0
                  }
                : msg
            )
          );
        } else if (chunk.event === 'error') {
          console.error('[DEBUG PAGE] ❌ Error event:', chunk.error);
          
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMsgId
                ? { ...msg, text: `Orchestration Error: ${chunk.error}` }
                : msg
            )
          );
        }
      });
      
      console.log('[DEBUG PAGE] ✅ submitMessageStream completed');
      console.log('='.repeat(80));
    } catch (err) {
      console.error('[DEBUG PAGE] ❌ Failed to stream prompt:', err);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === agentMsgId
            ? {
                ...msg,
                text: 'Failed to connect to the backend. Please ensure the server is running.'
              }
            : msg
        )
      );
    } finally {
      setIsAgentThinking(false);
      setCurrentAgentStatus('');
      setPendingConfirmation(null);
      console.log('[DEBUG PAGE] Agent thinking set to false');
    }
  };

  const handleResume = async (decision: string) => {
    if (!pendingConfirmation || !book) return;
    
    console.log('='.repeat(80));
    console.log('[DEBUG RESUME] handleResume called');
    console.log('[DEBUG RESUME] Decision:', decision);
    console.log('[DEBUG RESUME] Run ID:', pendingConfirmation.run_id);
    console.log('[DEBUG RESUME] Project ID:', book.id);
    
    try {
      console.log('[DEBUG RESUME] Calling resumeAgent API...');
      await resumeAgent(book.id, pendingConfirmation.run_id, decision);
      console.log('[DEBUG RESUME] ✅ Agent resumed successfully');
      setPendingConfirmation(null);
    } catch (err) {
      console.error('[DEBUG RESUME] ❌ Failed to resume agent:', err);
    }
    
    console.log('='.repeat(80));
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
            <AgentTab
              book={book}
              chatMessages={chatMessages}
              isAgentThinking={isAgentThinking}
              currentAgentStatus={currentAgentStatus}
              promptInput={promptInput}
              setPromptInput={setPromptInput}
              onSendPrompt={handleSendPrompt}
              pendingConfirmation={pendingConfirmation}
              onResume={handleResume}
              streamedDocumentText={streamedDocumentText}
            />
          )}

          {/* TAB 2: BOOK LAYOUT OUTLINE & SIMULATED A4 TIPTAP EDITOR */}
          {activeTab === 'Book' && <BookTab book={book} streamedDocumentText={streamedDocumentText} />}

          {/* TAB 3: COGNITIVE MEMORY WORKSPACE */}
          {activeTab === 'Memory' && book && (
            <MemoryTab
              book={book}
              memorySubTab={memorySubTab}
              setMemorySubTab={setMemorySubTab}
              selectedPreviewItem={selectedPreviewItem}
              setSelectedPreviewItem={setSelectedPreviewItem}
              setIsAddAssetOpen={setIsAddAssetOpen}
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

          {/* TAB 4: ROUTING SETTINGS CONFIGURATION PANEL */}
          {activeTab === 'Settings' && (
            <SettingsTab
              plannerProvider={plannerProvider}
              setPlannerProvider={setPlannerProvider}
              plannerModel={plannerModel}
              setPlannerModel={setPlannerModel}
              writerProvider={writerProvider}
              setWriterProvider={setWriterProvider}
              writerModel={writerModel}
              setWriterModel={setWriterModel}
              checkerProvider={checkerProvider}
              setCheckerProvider={setCheckerProvider}
              checkerModel={checkerModel}
              setCheckerModel={setCheckerModel}
              researcherProvider={researcherProvider}
              setResearcherProvider={setResearcherProvider}
              researcherModel={researcherModel}
              setResearcherModel={setResearcherModel}
              humanizerProvider={humanizerProvider}
              setHumanizerProvider={setHumanizerProvider}
              humanizerModel={humanizerModel}
              setHumanizerModel={setHumanizerModel}
              editorProvider={editorProvider}
              setEditorProvider={setEditorProvider}
              editorModel={editorModel}
              setEditorModel={setEditorModel}
              worldBuilderProvider={worldBuilderProvider}
              setWorldBuilderProvider={setWorldBuilderProvider}
              worldBuilderModel={worldBuilderModel}
              setWorldBuilderModel={setWorldBuilderModel}
              anthropicKey={anthropicKey}
              setAnthropicKey={setAnthropicKey}
              geminiKey={geminiKey}
              setGeminiKey={setGeminiKey}
              openaiKey={openaiKey}
              setOpenaiKey={setOpenaiKey}
              nvidiaKey={nvidiaKey}
              setNvidiaKey={setNvidiaKey}
              ollamaEndpoint={ollamaEndpoint}
              setOllamaEndpoint={setOllamaEndpoint}
              customEndpoint={customEndpoint}
              setCustomEndpoint={setCustomEndpoint}
              customApiKey={customApiKey}
              setCustomApiKey={setCustomApiKey}
              isSavingSettings={isSavingSettings}
              settingsSaved={settingsSaved}
              onSaveSettings={handleSaveSettings}
            />
          )}

        </main>
      </div>

    </div>
  );
}



