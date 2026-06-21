'use client';

import React from 'react';
import { BookProject, PreviewItem } from '@/lib/types';

interface UserContextTimelineProps {
  book: BookProject;
  selectedPreviewItem: PreviewItem | null;
  setSelectedPreviewItem: (item: PreviewItem | null) => void;
  setIsAddAssetOpen: (open: boolean) => void;
}

export default function UserContextTimeline({
  book,
  selectedPreviewItem,
  setSelectedPreviewItem,
  setIsAddAssetOpen
}: UserContextTimelineProps) {
  const userAssets = book.assets.filter(a => a.name !== 'Project Initial Brief');
  const initialAssets = userAssets.filter(a => new Date(a.addedAt).getTime() - new Date(book.createdAt).getTime() < 60000);
  const subsequentAssets = userAssets.filter(a => new Date(a.addedAt).getTime() - new Date(book.createdAt).getTime() >= 60000);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center font-sans">
        <div>
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Sources</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Initial brief, guidelines, and documents you uploaded for this book.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddAssetOpen(true)}
          className="rounded bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 transition shadow-xxs cursor-pointer shrink-0"
        >
          + Add
        </button>
      </div>

      <div className="space-y-6 select-none font-sans">
        {/* Initial Group */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Project Initiation</h4>
          </div>
          <div className="pl-3.5 border-l border-zinc-200 ml-0.5 space-y-2.5">
            {/* Initial Brief */}
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
    </div>
  );
}
