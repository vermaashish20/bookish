'use client';

import Link from 'next/link';
import { FormEvent } from 'react';

interface HomeHeroProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isAuthenticated: boolean;
  promptChips: string[];
  onChipClick: (chip: string) => void;
}

export function HomeHero({
  prompt,
  onPromptChange,
  onSubmit,
  isAuthenticated,
  promptChips,
  onChipClick,
}: HomeHeroProps) {
  return (
    <section className="py-[82px] pb-14 text-center sm:py-14">
      <div className="bookish-wrap">
        <p className="bookish-fade mx-auto mb-4 w-fit rounded-full border border-[var(--bookish-line)] bg-[rgb(255_255_251/0.62)] px-3 py-2 text-[13px] font-[680] text-[var(--bookish-accent)]">
          Multi-agent book workspace
        </p>
        <h1 className="bookish-fade mx-auto max-w-[720px] text-[clamp(38px,6.2vw,68px)] leading-[0.98] tracking-[-0.07em] text-balance text-[var(--bookish-ink)]">
          A quiet place to make books with AI.
        </h1>
        <p className="bookish-fade mx-auto mt-5 max-w-[540px] text-[15px] leading-[1.6] text-[var(--bookish-muted)]">
          You bring the imagination: plots, characters, worlds, tone. Bookish agents remember it
          all and help you plan, draft, and refine chapters without losing the thread.
        </p>

        <div
          className="bookish-fade mx-auto mt-9 w-full max-w-[820px] text-left sm:mt-9"
          aria-label="Start writing with AI"
        >
          <div className="bookish-composer">
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto]"
            >
              <label className="sr-only" htmlFor="bookPrompt">
                Book idea
              </label>
              <input
                id="bookPrompt"
                type="text"
                autoComplete="off"
                placeholder="Write a cozy fantasy about a city that trades in memories"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-w-0 border-0 bg-transparent px-[18px] py-3.5 text-base text-[var(--bookish-ink)] outline-none placeholder:text-[#808478]"
              />
              <button type="submit" className="bookish-cta w-full sm:w-auto">
                Start book
              </button>
            </form>
          </div>

          <div
            className="flex flex-wrap justify-center gap-2 px-1.5 pt-3.5"
            aria-label="Prompt examples"
          >
            {promptChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipClick(chip)}
                className="rounded-full border border-[color-mix(in_srgb,var(--bookish-line)_76%,transparent)] bg-[rgb(255_255_251/0.34)] px-2.5 py-1.5 text-xs text-[var(--bookish-muted)] transition hover:text-[var(--bookish-ink)]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {isAuthenticated && (
          <div className="bookish-fade mx-auto mt-6 grid max-w-[620px] justify-center gap-2.5">
            <Link
              href="/workspace"
              className="grid grid-cols-1 items-center gap-5 rounded-[18px] border border-[var(--bookish-line)] bg-[rgb(255_255_251/0.64)] px-4 py-3.5 text-left transition hover:border-[color-mix(in_srgb,var(--bookish-accent)_34%,var(--bookish-line))] sm:grid-cols-[1fr_auto]"
            >
              <div>
                <strong className="block text-sm tracking-[-0.025em] text-[var(--bookish-ink)]">
                  Open your workspace
                </strong>
                <span className="mt-0.5 block text-[13px] text-[var(--bookish-muted)]">
                  Continue drafting, reviewing chapters, and managing agent memory.
                </span>
              </div>
              <span className="border-b border-current text-[13px] font-[720] text-[var(--bookish-accent)]">
                Open
              </span>
            </Link>
          </div>
        )}

        <div className="bookish-fade mt-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[13px] font-[720] text-[var(--bookish-accent)] hover:underline"
          >
            Browse public books
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
