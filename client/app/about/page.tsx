'use client';

import Link from 'next/link';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';

const PRINCIPLES = [
  {
    title: 'Memory that lasts',
    body: 'Your brief, characters, and world facts live in one project memory — so agents pick up where you left off without re-explaining the story.',
  },
  {
    title: 'You approve what sticks',
    body: 'Canon writes and major memory updates go through you. Agents propose; you approve or reject before anything durable is saved.',
  },
  {
    title: 'Built for real books',
    body: 'Planning, drafting, and revision in a single workspace — structured for long-form work, not one-off chat replies.',
  },
  {
    title: 'Agents with roles',
    body: 'A planner routes work, a writer handles prose, and a world builder maintains lore. Each step is visible, not a black box.',
  },
];

export default function AboutPage() {
  return (
    <div className="bookish-public flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1 pb-[88px] pt-20">
        <div className="bookish-wrap">
          <header className="mb-14 max-w-[720px]">
            <p className="mb-2 text-[13px] font-[720] uppercase tracking-[0.12em] text-[var(--bookish-accent)]">
              About Bookish
            </p>
            <h1 className="text-[clamp(30px,4vw,50px)] leading-none tracking-[-0.065em] text-[var(--bookish-ink)]">
              Writing software for authors who think in arcs, not prompts.
            </h1>
            <p className="mt-4 max-w-[54ch] text-[15px] leading-[1.65] text-[var(--bookish-muted)]">
              Bookish is a workspace where specialized AI agents help you plan, remember, and draft
              long-form fiction and non-fiction — with you in control at every durable step.
            </p>
          </header>

          <section className="mb-16 max-w-[720px] border-t border-[var(--bookish-line)] pt-10">
            <h2 className="text-[clamp(16px,1.8vw,18px)] font-[720] uppercase tracking-[0.12em] text-[var(--bookish-accent)]">
              Our mission
            </h2>
            <p className="mt-4 text-[17px] leading-[1.6] tracking-[-0.02em] text-[var(--bookish-ink)]">
              We want every serious writer to finish the book in their head — without losing plot,
              voice, or world detail along the way.
            </p>
            <p className="mt-4 text-[15px] leading-[1.65] text-[var(--bookish-muted)]">
              Most AI writing tools treat each session like a blank slate. Bookish treats your
              project as a living manuscript: sources you upload, canon you approve, and chapters
              that accumulate over time. Agents retrieve what matters, propose the next move, and
              wait for your sign-off before changing the record.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="mb-6 text-[clamp(16px,1.8vw,18px)] font-[720] uppercase tracking-[0.12em] text-[var(--bookish-accent)]">
              What we believe
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PRINCIPLES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_92%,transparent)] p-5"
                >
                  <h3 className="text-[15px] font-semibold tracking-tight text-[var(--bookish-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[var(--bookish-muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="max-w-[720px] border-t border-[var(--bookish-line)] pt-10">
            <h2 className="text-[clamp(16px,1.8vw,18px)] font-[720] uppercase tracking-[0.12em] text-[var(--bookish-accent)]">
              How it works
            </h2>
            <ol className="mt-5 space-y-4 text-[15px] leading-[1.65] text-[var(--bookish-muted)]">
              <li>
                <span className="font-semibold text-[var(--bookish-ink)]">Start with intent.</span>{' '}
                Describe your book, genre, and goals. Upload references or a brief as sources.
              </li>
              <li>
                <span className="font-semibold text-[var(--bookish-ink)]">Build memory.</span>{' '}
                Agents extract characters, world facts, and voice — you approve what becomes canon.
              </li>
              <li>
                <span className="font-semibold text-[var(--bookish-ink)]">Draft in the open.</span>{' '}
                Chapters stream into your workspace. Revise, branch chats, and keep continuity
                checked against project knowledge.
              </li>
              <li>
                <span className="font-semibold text-[var(--bookish-ink)]">Ship when ready.</span>{' '}
                Export your manuscript and share finished work on the public shelf when you choose.
              </li>
            </ol>

            <p className="mt-10 text-[14px] text-[var(--bookish-muted)]">
              Ready to start?{' '}
              <Link href="/" className="font-[720] text-[var(--bookish-accent)] hover:underline">
                Create your first project
              </Link>{' '}
              or{' '}
              <Link href="/explore" className="font-[720] text-[var(--bookish-accent)] hover:underline">
                browse the community shelf
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
