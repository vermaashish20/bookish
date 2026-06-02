'use client';

import React from 'react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newAssetName: string;
  setNewAssetName: (value: string) => void;
  newAssetType: string;
  setNewAssetType: (value: string) => void;
  newAssetContent: string;
  setNewAssetContent: (value: string) => void;
  selectedAssetFile: File | null;
  setSelectedAssetFile: (file: File | null) => void;
}

export default function AddAssetModal({
  isOpen,
  onClose,
  onSubmit,
  newAssetName,
  setNewAssetName,
  newAssetType,
  setNewAssetType,
  newAssetContent,
  setNewAssetContent,
  selectedAssetFile,
  setSelectedAssetFile
}: AddAssetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-955/40 backdrop-blur-xs select-none">
      <div className="w-[500px] bg-white rounded-xl border border-zinc-250 p-6 shadow-xl space-y-4 animate-fade-in font-sans">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Add User Context Asset</h3>
          <button
            type="button"
            onClick={() => {
              setSelectedAssetFile(null);
              onClose();
            }}
            className="text-zinc-400 hover:text-zinc-600 text-xs font-medium cursor-pointer"
          >
            x Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
                  setNewAssetName(newAssetName || file.name);
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
                onClose();
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
  );
}
