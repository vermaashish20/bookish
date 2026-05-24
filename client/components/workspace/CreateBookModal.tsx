'use client';

import { useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GENRES = [
  'Fiction / Novella',
  'Non-Fiction / Personal Finance',
  'Academic / Textbook',
  'Business / Leadership',
  'Creative / Narrative Essay',
] as const;

const ACCEPTED_EXT = new Set(['txt', 'md']);

function isAcceptedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return !!ext && ACCEPTED_EXT.has(ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

interface CreateBookModalProps {
  isOpen: boolean;
  isCreating: boolean;
  title: string;
  genre: string;
  brief: string;
  selectedFiles: File[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onBriefChange: (value: string) => void;
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
}

export function CreateBookModal({
  isOpen,
  isCreating,
  title,
  genre,
  brief,
  selectedFiles,
  onClose,
  onSubmit,
  onTitleChange,
  onGenreChange,
  onBriefChange,
  onFilesAdd,
  onFileRemove,
}: CreateBookModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFiles = () => fileInputRef.current?.click();

  const ingestFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const valid = Array.from(fileList).filter(isAcceptedFile);
    const rejected = fileList.length - valid.length;
    if (valid.length) onFilesAdd(valid);
    if (rejected > 0) {
      alert('Only .txt and .md files are supported. Some files were skipped.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ingestFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    ingestFiles(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div
        className="bookish-glass w-full max-w-2xl rounded-2xl p-8 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-book-title"
      >
        <div className="mb-6 flex items-center justify-between border-b border-[var(--bookish-line)] pb-4">
          <h3 id="create-book-title" className="bookish-display text-2xl font-medium text-[var(--bookish-ink)]">
            Start a book project
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--bookish-muted)] transition hover:bg-black/5 hover:text-[var(--bookish-ink)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="book-title"
                className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-muted)]"
              >
                Book title
                <RequiredMark />
              </label>
              <input
                id="book-title"
                type="text"
                required
                aria-required="true"
                placeholder="Shadows of the Ledger"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="bookish-field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-muted)]">
                Genre
              </label>
              <Select value={genre} onValueChange={onGenreChange}>
                <SelectTrigger className="bookish-field h-auto w-full min-h-[42px] shadow-none focus:ring-[3px] focus:ring-[rgb(5_150_105/0.08)]">
                  <SelectValue placeholder="Choose a genre" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="w-[var(--radix-select-trigger-width)] rounded-xl border-[var(--bookish-line)] bg-white p-1 shadow-lg"
                >
                  {GENRES.map((g) => (
                    <SelectItem
                      key={g}
                      value={g}
                      className="rounded-lg text-sm text-[var(--bookish-ink)] focus:bg-[var(--bookish-accent-soft)] focus:text-[var(--bookish-accent)]"
                    >
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-muted)]">
              Project brief <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Describe your story, characters, tone, and goals…"
              value={brief}
              onChange={(e) => onBriefChange(e.target.value)}
              className="bookish-field resize-none leading-relaxed"
              style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic' }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-muted)]">
                Reference files <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              {selectedFiles.length > 0 && (
                <span className="text-[10px] font-medium text-[var(--bookish-muted)]">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleInputChange}
              className="sr-only"
            />

            <button
              type="button"
              onClick={pickFiles}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--bookish-line)] bg-[#FAFAFA] px-3 py-2.5 text-center transition hover:border-[var(--bookish-accent)] hover:bg-[var(--bookish-accent-soft)]/30"
            >
              <Upload className="h-3.5 w-3.5 shrink-0 text-[var(--bookish-accent)]" />
              <span className="text-xs font-medium text-[var(--bookish-ink)]">Click to upload</span>
              <span className="text-[10px] text-[var(--bookish-muted)]">· .txt, .md</span>
            </button>

            {selectedFiles.length > 0 && (
              <div className="grid max-h-28 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                {selectedFiles.map((file, index) => {
                  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
                  return (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--bookish-line)] bg-white px-2 py-1.5"
                      title={file.name}
                    >
                      <FileText className="h-3 w-3 shrink-0 text-[var(--bookish-accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-medium leading-tight text-[var(--bookish-ink)]">
                          {file.name}
                        </p>
                        <p className="text-[9px] leading-tight text-[var(--bookish-muted)]">
                          {ext} · {formatSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onFileRemove(index)}
                        className="shrink-0 rounded p-0.5 text-[var(--bookish-muted)] hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--bookish-line)] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-full border border-[var(--bookish-line)] px-5 py-2.5 text-sm font-medium text-[var(--bookish-muted)] transition hover:text-[var(--bookish-ink)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button type="submit" disabled={isCreating} className="bookish-cta disabled:opacity-50">
              {isCreating ? 'Creating…' : 'Create & open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
