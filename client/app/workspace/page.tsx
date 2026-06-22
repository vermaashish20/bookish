'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { BookProject } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { createProject, deleteProject, fetchProjects, uploadAssetFile } from '@/lib/api';

const PROMPT_STORAGE_KEY = 'bookish-start-prompt';

function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();
  const [books, setBooks] = useState<BookProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Non-Fiction / Personal Finance');
  const [brief, setBrief] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    const prompt =
      searchParams.get('prompt') ??
      (typeof window !== 'undefined' ? sessionStorage.getItem(PROMPT_STORAGE_KEY) : null);

    if (prompt) {
      setBrief(prompt);
      sessionStorage.removeItem(PROMPT_STORAGE_KEY);
    }
    if (shouldCreate || prompt) {
      setIsModalOpen(true);
    }
  }, [searchParams]);

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

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load projects from backend', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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

      if (selectedFile) {
        try {
          await uploadAssetFile(newBook.id, selectedFile);
        } catch (err) {
          console.error('Failed to upload selected file', err);
        }
      }

      setIsModalOpen(false);
      setTitle('');
      setGenre('Non-Fiction / Personal Finance');
      setBrief('');
      setSelectedFile(null);
      router.push(`/book/${newBook.id}`);
    } catch (err) {
      console.error('Failed to create book project', err);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        setBooks((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-zinc-200">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold text-zinc-950 tracking-tight hover:text-zinc-700">
              Bookish
            </Link>
            <span className="h-4 w-px bg-zinc-200" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
              Workspace Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {user && <span className="hidden sm:inline text-zinc-400">Signed in as {user.username}</span>}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={logout}
              className="text-zinc-600 hover:text-zinc-900 transition"
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 pb-8 border-b border-zinc-200/80">
          <div>
            <h1 className="text-xl font-medium text-zinc-900 tracking-tight">Your Book Projects</h1>
            <p className="mt-1 text-xs text-zinc-500 max-w-lg">
              Manage your publication-ready book workspaces. Switch projects to review dynamic chapter
              generations, inspect agent memory states, or download compiled PDFs.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 focus:outline-none shadow-sm hover:scale-[1.01]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create New Book
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 text-center">
            <svg
              className="w-8 h-8 text-zinc-400 animate-spin mb-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <h3 className="text-xs font-semibold text-zinc-800">Loading projects...</h3>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-12 text-center">
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
            <h3 className="text-xs font-semibold text-zinc-800">No projects found</h3>
            <p className="mt-1 text-[11px] text-zinc-500 max-w-xs">
              Get started by creating your first automated book pipeline.
            </p>
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
                year: 'numeric',
              });

              return (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="group relative flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md cursor-pointer"
                >
                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                        {book.title}
                      </h2>
                      {book.subtitle && (
                        <p className="text-[11px] text-zinc-500 font-normal italic mt-0.5 truncate">
                          {book.subtitle}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                        {book.brief || 'No brief description provided for this book project.'}
                      </p>
                    </div>
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
                          type="button"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-950">Create New Book Project</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-500 transition focus:outline-none"
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Book Title
                  </label>
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Genre Category
                  </label>
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

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Project Brief & Text Area Guidelines
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your book brief, outline, characters, reader profiles, or targeted compilation goals..."
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Initial Assets & Reference Uploads
                </label>
                <input
                  type="file"
                  id="initial-asset-upload"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-zinc-600"
                />
                {selectedFile && (
                  <p className="text-[10px] text-zinc-500">{selectedFile.name}</p>
                )}
              </div>

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
                  className="rounded-md bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Confirm & Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-xs text-zinc-500">
          Loading workspace…
        </div>
      }
    >
      <WorkspaceDashboard />
    </Suspense>
  );
}
