'use client';

import { FormEvent } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';

interface HomeHeroProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  promptChips: string[];
  onChipClick: (chip: string) => void;
}

export function HomeHero({
  prompt,
  onPromptChange,
  onSubmit,
  promptChips,
  onChipClick,
}: HomeHeroProps) {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-16 pb-24 text-center">
      {/* Fantasy world background image */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-bottom"
        style={{ backgroundImage: 'url(/hero-bg-full-size.png)' }}
      />

      {/* Soft white glow behind text for readability */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 35%, transparent 65%)',
        }}
      />

      <div className="bookish-wrap relative z-10 flex flex-col items-center">
        <h1 className="bookish-fade mb-6 max-w-[820px] text-[clamp(3.5rem,6.2vw,6rem)] font-medium leading-[1.05] tracking-tight drop-shadow-sm">
          Your story deserves{' '}
          <em className="not-italic italic text-[var(--bookish-accent)]">to be written.</em>
        </h1>

        <p
          className="bookish-fade mb-12 max-w-[58ch] text-lg font-semibold leading-relaxed text-[var(--bookish-ink)] drop-shadow-md md:text-xl"
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic' }}
        >
          A magical workspace where your ideas become legendary manuscripts. You direct the lore,
          characters, and plot. Bookish agents flawlessly write the chapters.
        </p>

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
                className="flex-1 min-w-0 border-0 bg-transparent px-5 py-3.5 text-base md:text-lg font-medium text-[var(--bookish-ink)] placeholder-[var(--bookish-muted)] outline-none"
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


      </div>
    </section>
  );
}
