'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookProject, ChapterItem, Asset } from './types';

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Mock initial data matching PRD Test Cases
const INITIAL_BOOKS: BookProject[] = [
  {
    id: 'test-case-a',
    title: "The Intelligent Pocket",
    subtitle: "A Beginner's Guide to Personal Finance",
    genre: "Non-Fiction / Personal Finance",
    targetWordCount: 25000,
    tonality: "Conversational",
    brief: "A highly accessible guide introducing young adults to budgeting, micro-savings, compound interest, and first investments.",
    readerProfile: "Gen-Z & Millennials starting their career with zero financial training.",
    status: "Reviewing",
    createdAt: "2026-05-20T10:00:00Z",
    chapters: [
      { id: 'ch1', number: 1, title: "The Cost of Coffee: Unmasking Small Expenditures", content: "Let's talk about that daily $5 latte. Over a year, that's nearly $1,800. In this chapter, we explore how minor daily cash leaks derail your long-term compound potential without asking you to live on bread and water...", wordCount: 2520, status: 'completed' },
      { id: 'ch2', number: 2, title: "Your First Vault: Building an Emergency Fund", content: "Life happens. Your car tire blows, your phone cracks, or your landlord raises rent. An emergency fund is your emotional cushion. We target three months of expenses, stashed away in a High-Yield Savings Account (HYSA)...", wordCount: 2480, status: 'completed' },
      { id: 'ch3', number: 3, title: "The Snowball & The Avalanche: Crushing Debt", content: "Not all debt is created equal. We analyze the mathematical efficiency of the Avalanche method versus the psychological victories of the Snowball method. In this chapter, we outline exactly how to structure your pay-off roadmap...", wordCount: 2610, status: 'completed' },
      { id: 'ch4', number: 4, title: "The Magic Engine: Compound Interest Demystified", content: "Albert Einstein reportedly called compound interest the eighth wonder of the world. He who understands it, earns it; he who doesn't, pays it. Let's look at how starting at age 22 versus 32 completely alters your retirement horizon...", wordCount: 2550, status: 'completed' },
      { id: 'ch5', number: 5, title: "The Lazy Investor: Low-Cost Index Funds", content: "You don't need to beat Wall Street. In fact, most professionals can't. We introduce the core mechanics of passive investing through index funds and ETFs, teaching you how to buy the entire market with a single recurring purchase...", wordCount: 1200, status: 'drafting' },
      { id: 'ch6', number: 6, title: "Tax Shelters: HYSAs, IRAs, and 401ks", content: "", wordCount: 0, status: 'pending' },
      { id: 'ch7', number: 7, title: "The Budget Myth: Designing a Conscious Spending Plan", content: "", wordCount: 0, status: 'pending' },
      { id: 'ch8', number: 8, title: "Salary Negotiation: The Easiest $5,000 You'll Make", content: "", wordCount: 0, status: 'pending' },
      { id: 'ch9', number: 9, title: "Credit Score Mastery: Playing the Bank's Game", content: "", wordCount: 0, status: 'pending' },
      { id: 'ch10', number: 10, title: "The Finish Line: Your Automation Framework", content: "", wordCount: 0, status: 'pending' }
    ],
    assets: [
      { id: 'as1', name: 'Federal Reserve Interest Rates 2026.pdf', type: 'PDF Reference', size: '1.2 MB', addedAt: '2026-05-21T09:00:00Z' },
      { id: 'as2', name: 'Standard Personal Finance Guidelines.txt', type: 'Text Guidelines', size: '14 KB', addedAt: '2026-05-21T09:15:00Z' }
    ],
    memory: {
      factRegistry: [
        { id: 'f1', assertion: "Compound interest calculates interest on both the initial principal and the accumulated interest from prior periods.", source: "Malkiel, B. G. (2020). A Random Walk Down Wall Street.", verifiedBy: "Fact-Checker-Agent", timestamp: "2026-05-21T11:20:00Z" },
        { id: 'f2', assertion: "High-Yield Savings Accounts currently yield 4.25% APY compared to the national brick-and-mortar bank average of 0.06%.", source: "FDIC National Average Rates Q1 2026.", verifiedBy: "Fact-Checker-Agent", timestamp: "2026-05-22T14:10:00Z" }
      ],
      characterBible: [],
      callbackIndex: [
        { id: 'cb1', setupChapter: 1, payoffChapter: 5, context: "Sarah's green velvet notebook containing her initial micro-savings calculations", resolved: false }
      ],
      tonalityFingerprint: {
        preset: "Conversational",
        conversational: 0.95,
        academic: 0.10,
        storyteller: 0.40,
        motivational: 0.70,
        witty: 0.60,
        forbiddenPhrases: ["it's important to note", "delve into", "in today's fast-paced world", "not only, but also", "landscape of"]
      },
      decisionLog: [
        { timestamp: "2026-05-21T10:05:00Z", step: "Outline Generation", agent: "Planner", action: "Structured 10 logical chapters covering finance basics.", resolution: "Outline saved to book state; verified sequence flow." },
        { timestamp: "2026-05-22T11:30:00Z", step: "Chapter 3 Fact Check", agent: "Fact-Checker", action: "Flagged definition of Avalanche debt payoff.", resolution: "Cross-referenced with RAG data; clarified that highest APR is targeted first." }
      ]
    }
  },
  {
    id: 'test-case-b',
    title: "Shadows of the Ledger",
    subtitle: "A Tale of Two Balance Sheets",
    genre: "Fiction / Novella",
    targetWordCount: 12000,
    tonality: "Storyteller",
    brief: "A corporate drama following a junior auditor who uncovers a discrepancy in a major tech firm's ledger, leading to a moral dilemma with her mentor.",
    readerProfile: "Fans of corporate thrillers and character-driven suspense.",
    status: "Drafting",
    createdAt: "2026-05-22T14:30:00Z",
    chapters: [
      { id: 'ch_b1', number: 1, title: "The Chestnut Desk", content: "The coffee was tepid, but Sarah didn't mind. Her eyes were glued to the eleventh column of the spreadsheet. On her desk sat a worn green velvet notebook, a graduation gift from her father. In it, she had scribbled a single recurring calculation. Today, the math wasn't adding up. Marcus, her senior manager, walked past her desk, his shadow stretching across the polished oak...", wordCount: 2200, status: 'completed' },
      { id: 'ch_b2', number: 2, title: "The Eleventh Column", content: "Marcus adjusted his silver cufflinks, a habit he did only when cornered. 'It's a rounding anomaly, Sarah,' he said, his voice smooth like bourbon. But she had seen the secondary account routing. The ledger wasn't just rounding; it was bleeding into a shell account registered in Delaware. She clutched the green notebook tighter, her nails biting into the velvet...", wordCount: 2350, status: 'completed' },
      { id: 'ch_b3', number: 3, title: "A Midnight Audit", content: "", wordCount: 0, status: 'pending' },
      { id: 'ch_b4', number: 4, title: "The Delaware Loophole", content: "", wordCount: 0, status: 'pending' },
      { id: 'ch_b5', number: 5, title: "The Final Balance", content: "", wordCount: 0, status: 'pending' }
    ],
    assets: [
      { id: 'as_b1', name: 'Auditing Guidelines & Fraud Standard.txt', type: 'Guidelines Document', size: '24 KB', addedAt: '2026-05-22T14:40:00Z' }
    ],
    memory: {
      factRegistry: [],
      characterBible: [
        { id: 'c_sarah', name: "Sarah", role: "Junior Auditor", attributes: { "Age": "24", "Style": "Meticulous, risk-averse", "Notebook": "Green velvet journal" }, arc: "Learns to trust her analytical instinct over corporate pressure.", activeChapters: [1, 2] },
        { id: 'c_marcus', name: "Marcus", role: "Senior Audit Partner", attributes: { "Age": "47", "Habit": "Adjusting silver cufflinks", "Tone": "Charming, patronizing" }, arc: "Desperately tries to cover compliance failures, leading to exposure.", activeChapters: [1, 2] }
      ],
      callbackIndex: [
        { id: 'cb_b1', setupChapter: 1, payoffChapter: 5, context: "Sarah's green velvet notebook containing private auditor logs", resolved: false }
      ],
      tonalityFingerprint: {
        preset: "Storyteller",
        conversational: 0.30,
        academic: 0.15,
        storyteller: 0.98,
        motivational: 0.40,
        witty: 0.35,
        forbiddenPhrases: ["it's important to note", "delve into", "first and foremost", "landscape of", "mechanical triads"]
      },
      decisionLog: [
        { timestamp: "2026-05-22T14:35:00Z", step: "Character Concept Setup", agent: "Planner", action: "Drafted character models for Sarah and Marcus.", resolution: "Registered character definitions in the Character Bible database." }
      ]
    }
  }
];

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState<BookProject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Simplified Form states
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Non-Fiction / Personal Finance');
  const [brief, setBrief] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [startAgent, setStartAgent] = useState(true); // true = Start Agent, false = Create Project Only

  // Load books on component mount
  useEffect(() => {
    const saved = localStorage.getItem('aiuthor_projects');
    if (saved) {
      try {
        setBooks(JSON.parse(saved));
      } catch (e) {
        setBooks(INITIAL_BOOKS);
        localStorage.setItem('aiuthor_projects', JSON.stringify(INITIAL_BOOKS));
      }
    } else {
      setBooks(INITIAL_BOOKS);
      localStorage.setItem('aiuthor_projects', JSON.stringify(INITIAL_BOOKS));
    }
  }, []);

  // Save books back to localstorage
  const saveProjects = (updated: BookProject[]) => {
    setBooks(updated);
    localStorage.setItem('aiuthor_projects', JSON.stringify(updated));
  };

  // Form submit handler to create new book project
  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newId = `book-${generateId()}`;
    const initialAssets: Asset[] = [];
    if (attachedFileName.trim()) {
      initialAssets.push({
        id: `as-init-${Date.now()}`,
        name: attachedFileName.trim(),
        type: attachedFileName.toLowerCase().endsWith('.pdf') ? 'PDF Reference' :
              attachedFileName.toLowerCase().endsWith('.md') ? 'Markdown Reference' : 'Text Guidelines',
        size: '180 KB',
        addedAt: new Date().toISOString()
      });
    }

    const tonalityPreset: BookProject['tonality'] = 
      genre.includes('Finance') ? 'Conversational' :
      genre.includes('Fiction') ? 'Storyteller' :
      genre.includes('Academic') ? 'Academic' : 'Motivational';

    // If starting agent immediately, compile standard active chapters.
    // If not, compile empty drafting chapters.
    const generatedChapters: ChapterItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: `ch-${newId}-${i+1}`,
      number: i + 1,
      title: startAgent ? `Chapter ${i + 1}: Generated Focus Outline` : `Chapter ${i + 1}: Empty Draft Canvas`,
      content: "",
      wordCount: 0,
      status: 'pending'
    }));

    const decisionLogItem = startAgent ? {
      timestamp: new Date().toISOString(),
      step: "Project Planner Activated",
      agent: "Planner",
      action: "Triggered active planner agent pipeline. Generated core chapters.",
      resolution: "Pipeline loaded; awaiting specific drafting tasks."
    } : {
      timestamp: new Date().toISOString(),
      step: "Project Registered Only",
      agent: "System",
      action: "Initialized blank project canvas without active agents. Assets loaded in background.",
      resolution: "Workspace created successfully; planner agent is currently paused."
    };

    const newBook: BookProject = {
      id: newId,
      title: title.trim(),
      subtitle: startAgent ? "Agent Initialized Project" : "Manual Draft Project",
      genre,
      targetWordCount: 25000,
      tonality: tonalityPreset,
      brief: brief.trim(),
      readerProfile: "Default target reader profile",
      status: startAgent ? 'Drafting' : 'Drafting',
      createdAt: new Date().toISOString(),
      chapters: generatedChapters,
      assets: initialAssets,
      memory: {
        factRegistry: [],
        characterBible: [],
        callbackIndex: [],
        tonalityFingerprint: {
          preset: tonalityPreset,
          conversational: tonalityPreset === 'Conversational' ? 0.9 : 0.3,
          academic: tonalityPreset === 'Academic' ? 0.9 : 0.2,
          storyteller: tonalityPreset === 'Storyteller' ? 0.9 : 0.3,
          motivational: tonalityPreset === 'Motivational' ? 0.9 : 0.3,
          witty: 0.4,
          forbiddenPhrases: ["it's important to note", "delve into", "in today's fast-paced world", "not only, but also"]
        },
        decisionLog: [decisionLogItem]
      }
    };

    const updated = [newBook, ...books];
    saveProjects(updated);
    setIsModalOpen(false);

    // Reset Form
    setTitle('');
    setGenre('Non-Fiction / Personal Finance');
    setBrief('');
    setAttachedFileName('');
    setStartAgent(true);

    // Route to working area
    router.push(`/book/${newId}`);
  };

  // Delete project
  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm("Are you sure you want to delete this project?")) {
      const updated = books.filter(b => b.id !== id);
      saveProjects(updated);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-zinc-200">
      {/* Top Header navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-zinc-950 tracking-tight">AIuthor</span>
            <span className="h-4 w-px bg-zinc-200"></span>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Workspace Dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Gateway Technical Assessment</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-10 flex-1">
        
        {/* Intro Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 pb-8 border-b border-zinc-200/80">
          <div>
            <h1 className="text-xl font-medium text-zinc-900 tracking-tight">Your Book Projects</h1>
            <p className="mt-1 text-xs text-zinc-500 max-w-lg">
              Manage your publication-ready book workspaces. Switch projects to review dynamic chapter generations, inspect agent memory states, or download compiled PDFs.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 focus:outline-none shadow-sm hover:scale-[1.01]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create New Book
          </button>
        </div>

        {/* Books Grid */}
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-8 h-8 text-zinc-400 mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <h3 className="text-xs font-semibold text-zinc-800">No projects found</h3>
            <p className="mt-1 text-[11px] text-zinc-500 max-w-xs">Get started by creating your first automated book pipeline.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Start Planner
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => {
              const formattedDate = new Date(book.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="group relative flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md cursor-pointer"
                >
                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div>
                      {/* Book Name */}
                      <h2 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                        {book.title}
                      </h2>
                      
                      {/* Description */}
                      {book.subtitle && (
                        <p className="text-[11px] text-zinc-500 font-normal italic mt-0.5 truncate">
                          {book.subtitle}
                        </p>
                      )}
                      
                      {/* Brief (2-3 lines) */}
                      <p className="mt-3 text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                        {book.brief || "No brief description provided for this book project."}
                      </p>
                    </div>

                    {/* Bottom Metadata Panel */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                      <span>Created: {formattedDate}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">
                          📁 {book.assets.length} {book.assets.length === 1 ? 'File' : 'Files'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteProject(book.id, e)}
                          className="text-zinc-400 hover:text-red-500 transition p-1 -m-1"
                          title="Delete book"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/20 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-8 shadow-xl animate-scale-up">
            
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-950">Create New Book Project</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-500 transition focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBook} className="mt-6 space-y-5">
              
              {/* Row 1: Title & Genre */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Book Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Shadows of the Ledger"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Genre Category</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-800 focus:border-zinc-500 focus:outline-none"
                  >
                    <option>Non-Fiction / Personal Finance</option>
                    <option>Fiction / Novella</option>
                    <option>Academic / Textbook</option>
                    <option>Business / Leadership</option>
                    <option>Creative / Narrative Essay</option>
                  </select>
                </div>
              </div>

              {/* Text Area for brief context */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Project Brief & Text Area Guidelines</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your book brief, outline, characters, reader profiles, or targeted compilation goals..."
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Initial Upload Asset Section */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Initial Assets & Reference Uploads</label>
                <div className="grid gap-4 sm:grid-cols-2 items-center">
                  <input
                    type="text"
                    placeholder="Enter file name (e.g., financial_rules_2026.pdf)"
                    value={attachedFileName}
                    onChange={(e) => setAttachedFileName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-zinc-400 italic">
                    Type a file name (.pdf, .txt, .md) to mock upload reference guides to the Assets tab.
                  </div>
                </div>
              </div>

              {/* Action Pipeline Options */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pipeline Execution Mode</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  
                  {/* Option 1: Start Agent */}
                  <button
                    type="button"
                    onClick={() => setStartAgent(true)}
                    className={`flex flex-col justify-start rounded-md border p-3 text-left transition-all ${
                      startAgent 
                        ? 'border-zinc-900 bg-zinc-950/5 text-zinc-950 ring-1 ring-zinc-900' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${startAgent ? 'bg-zinc-900 animate-pulse' : 'bg-zinc-300'}`} />
                      Start Agent immediately
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 leading-relaxed">Runs the initial Planner DAG pipeline to structure outline and compile characters in the background.</span>
                  </button>

                  {/* Option 2: Create Project Only */}
                  <button
                    type="button"
                    onClick={() => setStartAgent(false)}
                    className={`flex flex-col justify-start rounded-md border p-3 text-left transition-all ${
                      !startAgent 
                        ? 'border-zinc-900 bg-zinc-950/5 text-zinc-950 ring-1 ring-zinc-900' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${!startAgent ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                      Create project only for now
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 leading-relaxed">Registers the canvas space and files in the database. All agents remain paused until triggered manually in assets.</span>
                  </button>

                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 shadow-sm"
                >
                  Confirm & Create
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
