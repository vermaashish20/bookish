'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookProject, ChatMessage, ChapterItem, Asset, FactItem, CharacterBibleItem, CallbackItem, DecisionItem, ProjectSettings } from '../../types';

// Standard mock responses for agents based on prompts
const MOCK_AGENT_REPLIES = {
  plan: {
    text: "I have analyzed your initial brief and assets. I've successfully generated the 10-chapter structured outline for 'The Intelligent Pocket'. Registered compound interest facts in the Fact Registry, mapped Sarah's notebook as a primary callback index setup in Chapter 1, and tuned the conversational style metrics in the Tonality Fingerprint.",
    agent: "Planner" as const,
    thinking: "[Planner] Parsing brief target: Gen-Z budgeters.\n[Planner] Constructing 10 chapter nodes...\n[Planner] Formatting front matter outline (TOC, Preface, Dedication).\n[Planner] Checking logical sequence flow: Budgeting -> Emergency -> Debt -> Compounding -> Passive Investing.\n[Planner] Saving outline models into system graph state.",
    cost: 0.045,
    tokens: 4500
  },
  research: {
    text: "Semantic research complete. Retrieved 5 high-density context documents regarding passive index investing vs active trading. Verified S&P 500 yields (approx. 9.8% annual compound rate). Registered verified sources into the Fact Registry.",
    agent: "Researcher" as const,
    thinking: "[Researcher] Quering Vector Store with hybrid dense/sparse search: 'Low-cost index funds historical returns'\n[Researcher] Retrieved 8 chunks from Malkiel (2020) and Bogle (2018).\n[Researcher] Applying BM25 exact match weights for 'ETF' and 'S&P 500'.\n[Researcher] Passing top-5 scored context blocks to orchestrator state.",
    cost: 0.012,
    tokens: 1200
  },
  write: {
    text: "Draft complete for Chapter 5: 'The Lazy Investor: Low-Cost Index Funds'. Initial output registered ~2,400 words. Fact-checker successfully verified all historical S&P yields. Humanizer applied the 'Conversational' preset rules, eliminating AI-tells (such as 'delve' and 'it's important to note') and varying sentence structures.",
    agent: "Writer" as const,
    thinking: "[Writer] Initiating generation module using Claude 3.5 Sonnet.\n[Writer] Inputs: Chapter outline focus areas + RAG context.\n[Writer] Drafted 2,420 words of conversational non-fiction narrative.\n[Fact-Checker] Auditing drafted text...\n[Fact-Checker] Verified: Malkiel index fund performance assertion matches source document.\n[Humanizer] Flagged: 3 occurrences of 'delve into' and 2 instances of mechanical triads.\n[Humanizer] Replacing and varying sentence length to target standard average of 14.5 tokens.\n[Assembler] Compiling chapter output to document store.",
    cost: 0.098,
    tokens: 8200
  }
};

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

  // Input states
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [activeBookSection, setActiveBookSection] = useState<string>('ch1');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('PDF Reference');

  // Project settings states
  const [plannerProvider, setPlannerProvider] = useState<'Ollama' | 'Gemini' | 'Claude' | 'OpenAI'>('Claude');
  const [plannerModel, setPlannerModel] = useState('claude-3-5-sonnet');
  const [writerProvider, setWriterProvider] = useState<'Ollama' | 'Gemini' | 'Claude' | 'OpenAI'>('Claude');
  const [writerModel, setWriterModel] = useState('claude-3-5-sonnet');
  const [checkerProvider, setCheckerProvider] = useState<'Ollama' | 'Gemini' | 'Claude' | 'OpenAI'>('OpenAI');
  const [checkerModel, setCheckerModel] = useState('gpt-4o-mini');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');

  // Load book details from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aiuthor_projects');
    if (saved) {
      try {
        const list: BookProject[] = JSON.parse(saved);
        setBooksList(list);
        const active = list.find(b => b.id === bookId);
        if (active) {
          setBook(active);
          
          // Re-load settings states
          if (active.settings) {
            setPlannerProvider(active.settings.plannerModel.provider);
            setPlannerModel(active.settings.plannerModel.modelName);
            setWriterProvider(active.settings.writerModel.provider);
            setWriterModel(active.settings.writerModel.modelName);
            setCheckerProvider(active.settings.factCheckerModel.provider);
            setCheckerModel(active.settings.factCheckerModel.modelName);
            setAnthropicKey(active.settings.plannerModel.apiKey || '');
            setGeminiKey(active.settings.writerModel.apiKey || '');
            setOllamaEndpoint(active.settings.plannerModel.endpointUrl || 'http://localhost:11434');
          }

          // Set initial chat messages
          const initialMsgs: ChatMessage[] = [
            {
              id: 'init-1',
              sender: 'System',
              text: `Welcome to the '${active.title}' workspace. All orchestration models are initialized. Click Settings to modify LLM nodes.`,
              timestamp: new Date(new Date(active.createdAt).getTime() + 1000).toISOString()
            }
          ];

          // Reconstruct agent thinking logs if decision log is present
          if (active.memory.decisionLog.length > 0) {
            active.memory.decisionLog.forEach((log, idx) => {
              initialMsgs.push({
                id: `init-log-${idx}`,
                sender: log.agent as ChatMessage['sender'],
                text: `${log.action} - ${log.resolution}`,
                timestamp: log.timestamp,
                thinking: `[${log.agent}] Executing ${log.step}...\n[${log.agent}] Resolution details: ${log.resolution}`
              });
            });
          }

          setChatMessages(initialMsgs);
        } else {
          router.push('/');
        }
      } catch (e) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [bookId, router]);

  // Reset preview item selection when switching tabs to prevent stale data display
  useEffect(() => {
    setSelectedPreviewItem(null);
  }, [activeTab, memorySubTab]);

  // Save book changes back to localStorage
  const updateBookProject = (updatedBook: BookProject) => {
    setBook(updatedBook);
    const updatedList = booksList.map(b => b.id === updatedBook.id ? updatedBook : b);
    setBooksList(updatedList);
    localStorage.setItem('aiuthor_projects', JSON.stringify(updatedList));
  };

  // Save Settings configuration
  const handleSaveSettings = () => {
    if (!book) return;

    const newSettings: ProjectSettings = {
      plannerModel: { provider: plannerProvider, modelName: plannerModel, apiKey: anthropicKey, endpointUrl: ollamaEndpoint },
      writerModel: { provider: writerProvider, modelName: writerModel, apiKey: geminiKey, endpointUrl: ollamaEndpoint },
      factCheckerModel: { provider: checkerProvider, modelName: checkerModel, apiKey: openaiKey, endpointUrl: ollamaEndpoint },
      humanizerModel: { provider: writerProvider, modelName: writerModel, apiKey: geminiKey, endpointUrl: ollamaEndpoint }
    };

    const updatedBook: BookProject = {
      ...book,
      settings: newSettings
    };

    updateBookProject(updatedBook);
    alert("Workspace model configurations saved successfully!");
  };

  if (!book) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-xs text-zinc-500 font-sans">
        Loading workspace parameters...
      </div>
    );
  }

  // Handle Prompt Submission in Split Studio Chat
  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptInput,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setPromptInput('');
    setIsAgentThinking(true);
    setStudioTab('Flow'); // auto focus the graph execution trace panel!

    // Simulate Agent DAG logic
    setTimeout(() => {
      let replyData: {
        text: string;
        agent: ChatMessage['sender'];
        thinking: string;
        cost: number;
        tokens: number;
      } = MOCK_AGENT_REPLIES.write; 
      const textLower = userMsg.text.toLowerCase();

      if (textLower.includes('plan') || textLower.includes('outline')) {
        replyData = MOCK_AGENT_REPLIES.plan;
      } else if (textLower.includes('research') || textLower.includes('rag') || textLower.includes('source')) {
        replyData = MOCK_AGENT_REPLIES.research;
      } else if (textLower.includes('write') || textLower.includes('draft') || textLower.includes('chapter')) {
        replyData = MOCK_AGENT_REPLIES.write;
      }

      // If drafting chapter 5
      if (textLower.includes('chapter 5') || textLower.includes('draft chapter 5') || textLower.includes('index funds')) {
        const updatedChapters = book.chapters.map((c: ChapterItem) => {
          if (c.number === 5) {
            return {
              ...c,
              status: 'completed' as const,
              wordCount: 2420,
              content: "Index funds represent the ultimate triumph of elegant simplicity over hyper-active complexity. In this chapter, we outline why index fund investing is mathematically superior for 99% of people. By purchasing an S&P 500 fund, you instantly buy a small slice of America's 500 largest corporate balance sheets. Instead of trying to find the needle in the haystack, we follow Jack Bogle's advice: buy the whole haystack. Historically, this lazy approach compound-yields roughly 9.8% annually, beating active hedge fund managers who charge high expense ratios just to underperform the broader market..."
            };
          }
          return c;
        });

        const newFact: FactItem = {
          id: `f-${Date.now()}`,
          assertion: "John C. Bogle founded Vanguard in 1975, launching the first retail low-cost index mutual fund tracking the S&P 500 index.",
          source: "Bogle, J. C. (2017). The Little Book of Common Sense Investing.",
          verifiedBy: "Fact-Checker-Agent",
          timestamp: new Date().toISOString()
        };

        const newDecision = {
          timestamp: new Date().toISOString(),
          step: "Chapter 5 Generation",
          agent: "Writer",
          action: "Drafted low-cost index investing chapter under Conversational rules.",
          resolution: "Chapter marked as completed; S&P 500 yield historical statistics registered in Fact database."
        };

        const updatedBook: BookProject = {
          ...book,
          status: 'Reviewing',
          chapters: updatedChapters,
          memory: {
            ...book.memory,
            factRegistry: [...book.memory.factRegistry, newFact],
            decisionLog: [...book.memory.decisionLog, newDecision]
          }
        };

        updateBookProject(updatedBook);
        setStudioTab('Preview'); // auto-focus the preview tab to see the drafted A4 TipTap page!
      }

      // If outline self-healing (Test case D)
      if (textLower.includes('insert') || textLower.includes('new chapter') || textLower.includes('self-heal')) {
        const currentChapters = [...book.chapters];
        const newChapter: ChapterItem = {
          id: `ch-inserted-${Date.now()}`,
          number: 5,
          title: "Chapter 5: The Psychological Ledger",
          content: "Why do we panic sell? In this newly inserted chapter, we examine the behavioral finance errors that sabotage most index investment plans. We explore loss aversion bias and detail self-healing structures to keep your asset allocation bulletproof.",
          wordCount: 1520,
          status: 'completed'
        };

        const shiftedChapters = currentChapters.map(c => {
          if (c.number >= 5) {
            return { ...c, number: c.number + 1 };
          }
          return c;
        });

        shiftedChapters.splice(4, 0, newChapter);

        const newCallback: CallbackItem = {
          id: `cb-heal-${Date.now()}`,
          setupChapter: 5,
          payoffChapter: 6,
          context: "Reference to Sarah's loss aversion panic threshold introduced in chapter 5",
          resolved: false
        };

        const newDecision = {
          timestamp: new Date().toISOString(),
          step: "Downstream Self-Healing Repair",
          agent: "Editor",
          action: "Inserted new Chapter 5; shifted downstream indexes and regenerated TOC markers.",
          resolution: "Glossary updated; new behavioral callback index setup registered successfully."
        };

        const updatedBook: BookProject = {
          ...book,
          chapters: shiftedChapters,
          memory: {
            ...book.memory,
            callbackIndex: [...book.memory.callbackIndex, newCallback],
            decisionLog: [...book.memory.decisionLog, newDecision]
          }
        };

        updateBookProject(updatedBook);
        setStudioTab('Preview');

        replyData = {
          text: "Downstream self-healing pipeline triggered! Successfully inserted 'Chapter 5: The Psychological Ledger' between Chapter 4 and 6. I've automatically shifted subsequent chapter indexes, repaired TOC bindings, registered a new behavioral callback setup for Chapter 6, and updated the Glossary index cards.",
          agent: "Editor" as const,
          thinking: "[Editor] Scanning book graph state for structural insertions...\n[Editor] Shifting indexes for Chapters 5-10 (+1 shift completed).\n[Editor] Inserting newly compiled chapter content.\n[Memory Keeper] Re-compiling callback graph index to register setup cb_heal.\n[Assembler] Regenerated dynamic TOC binding references.",
          cost: 0.034,
          tokens: 2800
        };
      }

      const agentMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: replyData.agent,
        text: replyData.text,
        timestamp: new Date().toISOString(),
        thinking: replyData.thinking,
        cost: replyData.cost,
        tokens: replyData.tokens
      };

      setChatMessages([...updatedMessages, agentMsg]);
      setIsAgentThinking(false);
    }, 1500);
  };

  // Add asset / prompt modal submit handler
  const handleRegisterUserAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;
    if (!book) return;

    const sizeVal = newAssetType === 'Prompt' 
      ? `${Math.round(newAssetContent.length / 100) / 10 + 0.1} KB` 
      : '120 KB';

    const newAsset: Asset & { content?: string } = {
      id: `as-${Date.now()}`,
      name: newAssetName.trim(),
      type: newAssetType,
      size: sizeVal,
      addedAt: new Date().toISOString(),
      content: newAssetContent.trim() || `Reference content registered for file: ${newAssetName.trim()}`
    };

    const updatedBook: BookProject = {
      ...book,
      assets: [...book.assets, newAsset]
    };

    updateBookProject(updatedBook);
    
    // Set active preview immediately to show the newly added asset!
    setSelectedPreviewItem({
      type: 'user_asset',
      id: newAsset.id,
      title: newAsset.name,
      subtitle: `${newAsset.type} · ${newAsset.size}`,
      content: newAsset.content || ''
    });

    setNewAssetName('');
    setNewAssetContent('');
    setIsAddAssetOpen(false);
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

    // Group assets chronologically relative to project creation time (mocking dates)
    const initialAssets = book.assets.filter(a => new Date(a.addedAt).getTime() - new Date(book.createdAt).getTime() < 60000);
    const subsequentAssets = book.assets.filter(a => new Date(a.addedAt).getTime() - new Date(book.createdAt).getTime() >= 60000);

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

    const isPdf = selectedPreviewItem.subtitle?.toLowerCase().includes('pdf');

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
            ✕
          </button>
        </div>

        {/* Editor content wrapper */}
        <div className="flex-1 p-5 overflow-y-auto bg-zinc-50/10 font-mono text-xs leading-relaxed text-zinc-800">
          {isPdf ? (
            // If it is a mock PDF reference file, render it inside a clean page format
            <div className="w-full min-h-[450px] bg-white border border-zinc-200 shadow-xxs p-8 font-serif leading-relaxed text-[11px] relative select-text mb-2 rounded">
              <div className="flex justify-between text-[8px] font-sans text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1.5 mb-5 shrink-0 select-none">
                <span>PDF Context Reference</span>
                <span>Page 1 of 1</span>
              </div>
              <h2 className="text-center font-sans text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-4 select-none">Supplied File Context</h2>
              <div className="whitespace-pre-wrap leading-relaxed text-zinc-800 text-justify font-serif font-light">
                {selectedPreviewItem.content}
              </div>
            </div>
          ) : (
            // For txt, md, prompts, timelines, render inside a clean full-screen editor text field
            <div className="space-y-3 font-sans">
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider select-none border-b border-zinc-100 pb-1 flex justify-between items-center">
                <span>{selectedPreviewItem.type.replace('_', ' ')} source stream</span>
                <span className="text-zinc-300 font-mono normal-case text-[8px] font-medium">UTF-8 File Layout</span>
              </div>
              <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-zinc-50/50 p-4 border border-zinc-100 rounded-md text-zinc-800 font-light max-h-[480px] overflow-y-auto">
                {selectedPreviewItem.content}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
            <div className="flex-1 flex overflow-hidden bg-zinc-100">
              
              {/* Left Column (40%) - Unified Chat Interface */}
              <div className="w-[40%] flex flex-col justify-between bg-white border-r border-zinc-200 overflow-hidden shrink-0">
                
                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
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
                          RAG context retrieval, fact checker validation, and style человеческое voice.
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
                    placeholder="Ask agent to plan, write (e.g. 'Draft Chapter 5') or repair outlines..."
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
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase">{book.tonality} preset active</span>
                        </div>
                        
                        <div className="space-y-3 font-sans text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-zinc-700 font-semibold w-24">1. Planner</span>
                            <span className="text-zinc-400">TOC Outline compiled & registered</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${isAgentThinking ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-zinc-700 font-semibold w-24">2. Researcher</span>
                            <span className="text-zinc-400">RAG Semantic document lookups indexed</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${isAgentThinking ? 'bg-indigo-500 animate-pulse' : book.chapters.find(c => c.number === 5)?.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                            <span className="text-zinc-700 font-semibold w-24">3. Writer</span>
                            <span className="text-zinc-400">Chapter draft assembly compiling</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${isAgentThinking ? 'bg-zinc-300' : book.chapters.find(c => c.number === 5)?.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                            <span className="text-zinc-700 font-semibold w-24">4. Fact-Checker</span>
                            <span className="text-zinc-400">Claim citation alignment check complete</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${isAgentThinking ? 'bg-zinc-300' : book.chapters.find(c => c.number === 5)?.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                            <span className="text-zinc-700 font-semibold w-24">5. Humanizer</span>
                            <span className="text-zinc-400">AI-tells vocabulary filter finalized</span>
                          </div>
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
                        
                        {/* Mock Pages List */}
                        {[1, 2, 3].map((pageNum) => {
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
                              {/* Scaled-down miniature A4 canvas mockup */}
                              <div className={`w-[56px] h-[79px] bg-white border ${isActive ? 'border-zinc-800' : 'border-zinc-200'} rounded p-1 relative flex flex-col justify-between overflow-hidden`}>
                                {/* Tiny page header */}
                                <div className="flex justify-between items-center text-[2.5px] text-zinc-300 border-b border-zinc-100 pb-0.5 scale-90 origin-top">
                                  <span>Ch 5</span>
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
                            <span>Preview Page {selectedPreviewPage} of 3</span>
                          </div>

                          <div className="space-y-4">
                            <h2 className="text-center font-sans text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Chapter 5 · Page {selectedPreviewPage}</h2>
                            
                            {selectedPreviewPage === 1 && (
                              <>
                                <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">The Lazy Investor: Low-Cost Index Funds</h1>
                                {book.chapters.find(c => c.number === 5)?.content ? (
                                  <div className="space-y-4">
                                    <p className="indent-6 text-justify leading-relaxed">
                                      {book.chapters.find(c => c.number === 5)?.content.slice(0, 500)}...
                                    </p>
                                    <p className="indent-6 text-justify leading-relaxed text-zinc-400 italic text-[10px] pt-4 border-t border-dashed border-zinc-100 text-center">
                                      [This chapter text continues on Page 2 and Page 3. Select pages from the left outline panels to preview.]
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                                    <span className="text-zinc-400 text-xs mb-2">No chapter text generated yet</span>
                                    <p className="text-[10px] text-zinc-400 max-w-xs">Ask the Agent in the chat panel to "Draft Chapter 5" to watch the real-time page compilation stream.</p>
                                  </div>
                                )}
                              </>
                            )}

                            {selectedPreviewPage === 2 && (
                              <>
                                <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">Section I: Mechanics of Compounding Returns</h1>
                                {book.chapters.find(c => c.number === 5)?.content ? (
                                  <div className="space-y-4">
                                    <p className="indent-6 text-justify leading-relaxed">
                                      Index funds derive their long-term power from the elegant simplicity of compounding dividends and automated rebalancing. When you invest in a broad-market fund like the S&P 500 or a total stock market ETF, you are acquiring tiny fractional stakes in hundreds of stable, productive enterprises. You are effectively capturing the aggregate performance of the entire economy.
                                    </p>
                                    <p className="indent-6 text-justify leading-relaxed">
                                      Rather than guessing which particular company will perform best over the next quarter, index fund passive structures rely on the wisdom of the crowds. Markets adjust pricing efficiently. The compounding rate acts like a snowball rolling down a mountain—growing incrementally at first, then exponentially.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                                    <span className="text-zinc-400 text-xs mb-2">No chapter text generated yet</span>
                                    <p className="text-[10px] text-zinc-400 max-w-xs">Ask the Agent in the chat panel to "Draft Chapter 5" to watch the real-time page compilation stream.</p>
                                  </div>
                                )}
                              </>
                            )}

                            {selectedPreviewPage === 3 && (
                              <>
                                <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">Section II: Passive vs Active Portfolio Audits</h1>
                                {book.chapters.find(c => c.number === 5)?.content ? (
                                  <div className="space-y-4">
                                    <p className="indent-6 text-justify leading-relaxed">
                                      Historical index yields indicate a compound annual growth rate of approximately 9.8% over multi-decade cycles. A significant percentage of professional fund managers fail to beat this baseline over a ten-year horizon. High expense ratios, excessive trading commissions, and emotional cognitive biases drag down active trading performance metrics.
                                    </p>
                                    <p className="indent-6 text-justify leading-relaxed">
                                      By selecting low-cost passive index funds with expense ratios below 0.05%, you are bypassing high commissions and ensuring that almost 100% of your capital is put directly to work. This forms the foundation of what we define as the lazy investor's primary edge.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                                    <span className="text-zinc-400 text-xs mb-2">No chapter text generated yet</span>
                                    <p className="text-[10px] text-zinc-400 max-w-xs">Ask the Agent in the chat panel to "Draft Chapter 5" to watch the real-time page compilation stream.</p>
                                  </div>
                                )}
                              </>
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
                  <div>Word Count: <strong>{book.chapters.reduce((s: number, c: ChapterItem) => s + c.wordCount, 0)}</strong> / 25000</div>
                  <div>TOC self-healing: <strong className="text-emerald-600">Active</strong></div>
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
                            <p className="font-semibold text-zinc-800">AIuthor Publishing Studio</p>
                            <p className="mt-1">Generated under Next.js & Turbopack configurations</p>
                          </div>
                        </div>
                      )}

                      {activeBookSection === 'copyright' && (
                        <div className="text-left font-sans text-[10px] text-zinc-500 max-w-md py-10 space-y-4">
                          <h2 className="text-xs font-bold text-zinc-800">COPYRIGHT REGISTRATION</h2>
                          <p>© 2026 AIuthor Publishing Group. All rights reserved.</p>
                          <p>ISBN: 978-3-16-148410-0 (Placeholder)</p>
                          <p>Edition: First Digital Edition</p>
                          <p>CIP Block: Data registered under active graph execution state checkers.</p>
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
                          <p className="indent-6">
                            This book was compiled using the AIuthor multi-agent pipeline system, a framework dedicated to ensuring facts are grounded and styling is refined under strict human-centric constraints.
                          </p>
                          <p className="indent-6">
                            We invite the reader to explore these chapters with the confidence that every claim has been audited, checked, and humanized to resemble the voice of a professional practitioner dedicated to the domain.
                          </p>
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
                                  <p className="text-[10px] text-zinc-400 font-sans italic mt-10">Word count: {ch.wordCount} words · Status: Humanized & Verified</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                                  <span className="text-zinc-400 text-xs mb-2">Chapter Content Empty</span>
                                  <p className="text-[9px] text-zinc-400 max-w-xs">Ask the Agent in the chat workspace to "Draft Chapter {ch.number}" to trigger the dynamic writing and fact-checking pipeline.</p>
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
                                • {f.source} (Verified by Fact-Checker-Agent on {new Date(f.timestamp).toLocaleDateString()})
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
                          <p className="indent-6">
                            This book was fully compiled by the <strong>AIuthor Agentic pipeline</strong>, an automated multi-agent layout generator combining modern software patterns in LangGraph, Pydantic data schemas, vector index lookups, and specialized prose editors.
                          </p>
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
                                        content: `ENTITY NAME:\n${char.name}\n\nROLE / CONCEPT KEY:\n${char.role}\n\nCHARACTER DEVELOPMENT ARC:\n${char.arc}\n\nACTIVE REGISTERED CHAPTERS:\nChapters ${char.activeChapters.join(', ')}\n\nCOGNITIVE ATTRIBUTES:\n${Object.entries(char.attributes).map(([k, v]) => `• ${k}: ${v}`).join('\n')}`
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
                                        <span>Ch {cb.setupChapter} ➔ Ch {cb.payoffChapter}</span>
                                        <span className={`font-semibold ${cb.resolved ? 'text-emerald-600' : 'text-amber-600'}`}>{cb.resolved ? '✓ Resolved' : '○ Setup'}</span>
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
                              content: `ACTIVE WRITING PRESET:\n${book.tonality} style metrics active\n\nSTYLE DIMENSION TARGETS:\n${Object.entries(book.memory.tonalityFingerprint)
                                .filter(([_, v]) => typeof v === 'number')
                                .map(([k, v]) => `• ${k.charAt(0).toUpperCase() + k.slice(1)}: ${Math.round((v as number) * 100)}%`)
                                .join('\n')}\n\nFORBIDDEN AI VOCABULARY (ALERT MODULE):\nThe humanizer node actively scans and strips these tokens:\n${book.memory.tonalityFingerprint.forbiddenPhrases.map(phrase => `🚫 "${phrase}"`).join('\n')}`
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
                                    content: `AGENT NODE:\n${log.agent}\n\nSTEP ACTION:\n${log.action}\n\nTIME RESOLVED:\n${new Date(log.timestamp).toLocaleString()}\n\nCOGNITIVE SUMMARY:\n${log.resolution}\n\nSTATE RECOVERY CHECKPOINT:\nCheckpointer initialized successfully.`
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
                        onClick={() => setIsAddAssetOpen(false)}
                        className="text-zinc-400 hover:text-zinc-600 text-xs font-medium cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <form onSubmit={handleRegisterUserAsset} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Asset Name / Prompt Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., SARAH_DIARY_MOCK.md or Chapter 5 Outline Edit"
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
                          }}
                          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-xxs"
                        >
                          <option>PDF Reference</option>
                          <option>Markdown File</option>
                          <option>Text Guidelines</option>
                          <option>Prompt</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                          {newAssetType === 'Prompt' ? 'Prompt Text Content' : 'Reference Content / Guidelines'}
                        </label>
                        <textarea
                          required
                          rows={6}
                          placeholder={newAssetType === 'Prompt' 
                            ? "Enter prompt instructions, e.g., 'Ensure Sarah resolves her relationship with Marcus by Chapter 10...'"
                            : "Paste context files details here..."
                          }
                          value={newAssetContent}
                          onChange={(e) => setNewAssetContent(e.target.value)}
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-xxs leading-relaxed font-sans"
                        />
                      </div>

                      <div className="flex gap-2 justify-end border-t border-zinc-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsAddAssetOpen(false)}
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
                  
                  {/* Planner Agent config */}
                  <div className="grid gap-4 sm:grid-cols-3 items-center">
                    <span className="text-xs font-semibold text-zinc-700">Planner Agent Node</span>
                    <select
                      value={plannerProvider}
                      onChange={(e) => setPlannerProvider(e.target.value as any)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="Claude">Anthropic Claude</option>
                      <option value="Gemini">Google Gemini</option>
                      <option value="OpenAI">OpenAI GPT-4</option>
                      <option value="Ollama">Ollama (Localhost)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Model Name"
                      value={plannerModel}
                      onChange={(e) => setPlannerModel(e.target.value)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Writer Agent config */}
                  <div className="grid gap-4 sm:grid-cols-3 items-center">
                    <span className="text-xs font-semibold text-zinc-700">Writer Agent Node</span>
                    <select
                      value={writerProvider}
                      onChange={(e) => setWriterProvider(e.target.value as any)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="Claude">Anthropic Claude</option>
                      <option value="Gemini">Google Gemini</option>
                      <option value="OpenAI">OpenAI GPT-4</option>
                      <option value="Ollama">Ollama (Localhost)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Model Name"
                      value={writerModel}
                      onChange={(e) => setWriterModel(e.target.value)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Fact-checker config */}
                  <div className="grid gap-4 sm:grid-cols-3 items-center">
                    <span className="text-xs font-semibold text-zinc-700">Fact-Checker Node</span>
                    <select
                      value={checkerProvider}
                      onChange={(e) => setCheckerProvider(e.target.value as any)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="OpenAI">OpenAI GPT-4</option>
                      <option value="Gemini">Google Gemini</option>
                      <option value="Claude">Anthropic Claude</option>
                      <option value="Ollama">Ollama (Localhost)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Model Name"
                      value={checkerModel}
                      onChange={(e) => setCheckerModel(e.target.value)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
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

                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                    <button
                      onClick={handleSaveSettings}
                      className="rounded bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 shadow-sm w-full"
                    >
                      Save Configuration Settings
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
