'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import type { BookProject } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { createProject, deleteProject, fetchProjects, invalidateProjectsList, uploadAssetFile } from '@/lib/api';
import { PublicNav } from '@/components/public/PublicNav';
import { CreateBookModal } from '@/components/workspace/CreateBookModal';
import {
  WorkspaceProjectCard,
  WorkspaceProjectCardSkeleton,
} from '@/components/workspace/WorkspaceProjectCard';

const PROMPT_STORAGE_KEY = 'bookish-start-prompt';

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const greeting = useMemo(() => timeGreeting(), []);
  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : 'Writer';

  const [books, setBooks] = useState<BookProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Fiction / Novella');
  const [brief, setBrief] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  const handleFilesAdd = (incoming: File[]) => {
    setSelectedFiles((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        const dup = next.some((f) => f.name === file.name && f.size === file.size);
        if (!dup) next.push(file);
      }
      return next;
    });
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const loadProjects = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects(force ? { force: true } : undefined);
      setBooks(data);
    } catch (err) {
      console.error('Failed to load projects from backend', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void loadProjects();
  }, [authLoading, isAuthenticated, loadProjects]);

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

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await uploadAssetFile(newBook.id, file);
          } catch (err) {
            console.error('Failed to upload file', file.name, err);
          }
        }
      }

      setIsModalOpen(false);
      setTitle('');
      setGenre('Fiction / Novella');
      setBrief('');
      setSelectedFiles([]);
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
        invalidateProjectsList();
        setBooks((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  return (
    <div className="bookish-public flex min-h-screen flex-col bg-[#FAFAFA]">
      <PublicNav variant="app" />

      <main className="bookish-wrap flex-1 py-10">
        {/* Row 1 — greeting + actions */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="bookish-display text-[clamp(2rem,3.8vw,2.85rem)] font-medium leading-tight tracking-tight text-[var(--bookish-ink)]">
            {greeting},{' '}
            <em className="not-italic italic text-[var(--bookish-accent)]">{displayName}.</em>
          </h1>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => loadProjects(true)}
              disabled={isLoading}
              className="workspace-btn workspace-btn--outline"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="workspace-btn workspace-btn--primary"
            >
              <Plus className="h-3.5 w-3.5" />
              New book
            </button>
          </div>
        </div>

        {/* Divider — padded above and below */}
        <div className="py-8" aria-hidden="true">
          <hr className="border-0 border-t border-[var(--bookish-line)]" />
        </div>

        {/* Row 2 — project cards */}
        <section aria-label="Your book projects">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <WorkspaceProjectCardSkeleton compact />
              <WorkspaceProjectCardSkeleton compact />
              <WorkspaceProjectCardSkeleton compact />
              <WorkspaceProjectCardSkeleton compact />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-14 text-center">
              <h3 className="bookish-display text-xl font-medium text-red-900">Could not load projects</h3>
              <p className="mt-2 max-w-sm text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => loadProjects(true)} className="bookish-cta mt-6">
                Try again
              </button>
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--bookish-line)] bg-[#FAFAFA] p-16 text-center">
              <BookOpen className="mb-4 h-9 w-9 text-[var(--bookish-muted)] opacity-50" />
              <h3 className="bookish-display mb-2 text-2xl font-medium text-[var(--bookish-ink)]">
                No manuscripts yet
              </h3>
              <p className="mb-6 max-w-[34ch] text-[14px] text-[var(--bookish-muted)]">
                Create your first book project and let the agents help you draft chapters.
              </p>
              <button type="button" onClick={() => setIsModalOpen(true)} className="bookish-cta">
                Start your first book
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {books.map((book) => (
                <WorkspaceProjectCard key={book.id} book={book} onDelete={handleDeleteProject} compact />
              ))}
            </div>
          )}

          {books.length > 0 && (
            <p className="mt-10 text-center text-[13px] text-[var(--bookish-muted)]">
              Need inspiration?{' '}
              <Link href="/explore" className="font-medium text-[var(--bookish-accent)] hover:underline">
                Browse the community shelf
              </Link>
            </p>
          )}
        </section>
      </main>

      <CreateBookModal
        isOpen={isModalOpen}
        isCreating={isCreating}
        title={title}
        genre={genre}
        brief={brief}
        selectedFiles={selectedFiles}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateBook}
        onTitleChange={setTitle}
        onGenreChange={setGenre}
        onBriefChange={setBrief}
        onFilesAdd={handleFilesAdd}
        onFileRemove={handleFileRemove}
      />
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="bookish-public flex min-h-screen items-center justify-center text-sm text-[var(--bookish-muted)]">
          Loading workspace…
        </div>
      }
    >
      <WorkspaceDashboard />
    </Suspense>
  );
}
