'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BookProject } from '@/lib/types';
import { createProject, deleteProject, fetchProjects, uploadAssetFile } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState<BookProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Simplified Form states
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Non-Fiction / Personal Finance');
  const [brief, setBrief] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Handle uploaded file validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        setSelectedFile(file);
      } else {
        alert('Only .txt and .md files are supported!');
      }
    }
  };

  // Load books function
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setBooks(data);
    } catch (err) {
      console.error("Failed to load projects from backend", err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load books on component mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Form submit handler to create new book project
  const handleCreateBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      const newBook = await createProject({
        title: title.trim(),
        genre,
        brief: brief.trim(),
      });

      // If a real file was selected, upload it for backend parsing.
      if (selectedFile) {
        try {
          await uploadAssetFile(newBook.id, selectedFile);
        } catch (err) {
          console.error("Failed to upload selected file", err);
        }
      }

      setIsModalOpen(false);

      // Reset Form
      setTitle('');
      setGenre('Non-Fiction / Personal Finance');
      setBrief('');
      setSelectedFile(null);

      // Route to working area
      router.push(`/book/${newBook.id}`);
    } catch (err) {
      console.error("Failed to create book project", err);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteProject(id);
        setBooks(prev => prev.filter(b => b.id !== id));
      } catch (err) {
        console.error("Failed to delete project", err);
      }
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
            <button
              onClick={loadProjects}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh projects"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2} 
                stroke="currentColor" 
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 text-center">
            <svg 
              className="w-8 h-8 text-zinc-400 animate-spin mb-3" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-xs font-semibold text-zinc-800">Loading projects...</h3>
            <p className="mt-1 text-[11px] text-zinc-500">Please wait while we fetch your book projects.</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500 mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h3 className="text-xs font-semibold text-red-800">Failed to load projects</h3>
            <p className="mt-1 text-[11px] text-red-600 max-w-xs">{error}</p>
            <button
              onClick={loadProjects}
              className="mt-4 rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50 transition"
            >
              Try Again
            </button>
          </div>
        ) : books.length === 0 ? (
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
                <div className="relative">
                  <input
                    type="file"
                    id="initial-asset-upload"
                    accept=".txt,.md,text/plain,text/markdown"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base select-none">
                          {selectedFile.name.toLowerCase().endsWith('.md') ? '📝' : '📖'}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-zinc-900 truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-250 hover:text-zinc-600 transition focus:outline-none cursor-pointer"
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="initial-asset-upload"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 hover:border-zinc-350 bg-white p-5 text-center cursor-pointer transition-all hover:bg-zinc-50/20 select-none group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-zinc-400 group-hover:text-zinc-500 transition mb-1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <p className="text-[11px] font-semibold text-zinc-700 group-hover:text-zinc-950 transition">Click to select reference file</p>
                      <p className="text-[9px] text-zinc-400 font-medium mt-0.5">Supports TXT or MD references (max 10MB)</p>
                    </label>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Confirm & Create'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
