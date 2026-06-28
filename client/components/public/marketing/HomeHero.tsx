'use client';

import Link from 'next/link';
import { FormEvent, useMemo } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';

interface HomeHeroProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isAuthenticated: boolean;
  username?: string;
  promptChips: string[];
  onChipClick: (chip: string) => void;
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeHero({
  prompt,
  onPromptChange,
  onSubmit,
  isAuthenticated,
  username,
  promptChips,
  onChipClick,
}: HomeHeroProps) {
  const greeting = useMemo(() => timeGreeting(), []);
  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : '';

  return (
    <section className={`relative overflow-hidden bg-white text-center ${isAuthenticated ? 'pt-40 pb-16' : 'pt-36 pb-24'}`}>
      {/* Radial magic glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(5, 150, 105, 0.06) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(13, 148, 136, 0.04) 0%, transparent 50%)',
        }}
      />

      <div className="bookish-wrap relative z-10 flex flex-col items-center">
        {/* Heading — personalised when logged in */}
        {isAuthenticated && displayName ? (
          <h1 className="bookish-fade max-w-[820px] text-[clamp(2rem,3.2vw,2.8rem)] leading-[1.15] tracking-tight font-medium mb-10">
            {greeting},{' '}
            <em className="not-italic text-[var(--bookish-accent)] italic">{displayName}.</em>
          </h1>
        ) : (
          <>
            <h1 className="bookish-fade max-w-[820px] text-[clamp(3.5rem,6.2vw,6rem)] leading-[1.05] tracking-tight font-medium mb-6 drop-shadow-sm">
              Your story deserves{' '}
              <em className="not-italic text-[var(--bookish-accent)] italic">to be written.</em>
            </h1>

            {/* Subtitle — only when logged out */}
            <p
              className="bookish-fade text-[var(--bookish-muted)] text-lg md:text-xl max-w-[58ch] leading-relaxed mb-12"
              style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic' }}
            >
              A magical workspace where your ideas become legendary manuscripts. You direct the lore,
              characters, and plot. Bookish agents flawlessly write the chapters.
            </p>
          </>
        )}

        {/* Glowing pill search bar */}
        <div className="w-full max-w-[820px] relative group">
          <div className="absolute -inset-[3px] rounded-full bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />

          <div className="relative bookish-composer flex items-center transition-all duration-300 hover:ring-1 hover:ring-[color:var(--bookish-accent)]/20">
            <Sparkles className="ml-5 h-[18px] w-[18px] text-[var(--bookish-accent)] animate-pulse shrink-0" />

            <form onSubmit={onSubmit} className="flex flex-1 items-center">
              <label className="sr-only" htmlFor="bookPrompt">
                Book idea
              </label>
              <input
                id="bookPrompt"
                type="text"
                autoComplete="off"
                placeholder="A tale of a forgotten elven king who seeks vengeance..."
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="flex-1 min-w-0 border-0 bg-transparent px-5 py-3.5 text-base md:text-lg text-[var(--bookish-ink)] outline-none"
                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic' }}
              />
              <button type="submit" className="bookish-cta m-2 flex items-center gap-2 shrink-0">
                Start writing <Wand2 className="h-[14px] w-[14px]" />
              </button>
            </form>
          </div>
        </div>

        {/* Prompt chips */}
        <div
          className="flex flex-wrap justify-center gap-2 px-1.5 pt-5"
          aria-label="Prompt examples"
        >
          {promptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipClick(chip)}
              className="rounded-full border border-[var(--bookish-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--bookish-ink)] shadow-sm transition hover:border-[var(--bookish-accent)] hover:text-[var(--bookish-accent)]"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Browse public books — logged-out only */}
        {!isAuthenticated && (
          <div className="bookish-fade mt-8">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-[var(--bookish-accent)] hover:text-[var(--bookish-accent-hover)] transition-colors border-b border-[color:var(--bookish-accent)]/30 hover:border-[color:var(--bookish-accent)] pb-0.5 text-sm font-medium uppercase tracking-widest"
            >
              Browse the Grand Library <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
