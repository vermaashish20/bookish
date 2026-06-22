'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { AgentHandoffVisual } from '@/components/public/marketing/AgentHandoffVisual';
import { CreativeFlowVisual } from '@/components/public/marketing/CreativeFlowVisual';
import { LongBookVisual } from '@/components/public/marketing/LongBookVisual';
import { MemoryBentoVisual } from '@/components/public/marketing/MemoryBentoVisual';
import { PlotPlanVisual } from '@/components/public/marketing/PlotPlanVisual';

// ─── Layout A: Asymmetric split ────────────────────────────────────────────────
// Text on one side, animated visual on the other. Used once.
export function ImagineSection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 sm:py-24">
      <div className="bookish-wrap">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          {/* Left: text */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-[clamp(28px,3.8vw,44px)] leading-[1.02] tracking-[-0.06em] text-[var(--bookish-ink)]">
              You imagine.<br />AI does the rest.
            </h2>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.7] text-[var(--bookish-muted)]">
              Bookish turns one prompt into a full writing pipeline. Agents plan, build world memory,
              draft chapters, and run editorial checks while you approve each step.
            </p>
            <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
              {[
                { label: 'Less context typing', body: 'Stop repeating your story brief every session.' },
                { label: 'Faster drafts', body: 'Move from outline to chapter in one workspace.' },
                { label: 'Clean revisions', body: 'Keep plot, tone, and callbacks aligned.' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-[var(--bookish-line)] bg-[rgb(255_255_251/0.55)] p-3"
                >
                  <p className="text-[13px] font-[760] text-[var(--bookish-ink)]">{item.label}</p>
                  <p className="mt-1 text-[12px] leading-[1.55] text-[var(--bookish-muted)]">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: visual */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <AgentHandoffVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Layout B: Full-width editorial header + spanning bento grid ───────────────
// Heading left-anchored, bento spans full width. Used once.
export function MemorySection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 sm:py-24">
      <div className="bookish-wrap">
        <div className="mb-12 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(28px,3.8vw,44px)] leading-[1.02] tracking-[-0.06em] text-[var(--bookish-ink)]"
          >
            Let AI remember everything
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[15px] leading-[1.7] text-[var(--bookish-muted)] lg:max-w-[44ch] lg:pb-1"
          >
            Characters, worlds, organizations, magic systems, plot threads, and callbacks live in
            structured story memory. Agents read from it on every pass so nothing drifts.
          </motion.p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ delay: 0.15, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <MemoryBentoVisual />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Layout C: Sticky-left editorial headline + right numbered list ─────────────
// Left col: big anchored statement. Right col: stacked items with dividers.
// Completely distinct from the 2-col split (Layout A) and full-width bento (Layout B).
const USE_CASES = [
  {
    title: 'Solo author',
    detail: 'Plan, draft, and revise one book from one clean prompt thread. Canon stays consistent whether you write for an hour or a month.',
    img: 'https://picsum.photos/seed/writer-alone-desk/80/80',
  },
  {
    title: 'Editorial team',
    detail: 'Share canon, world notes, and chapter progress across writers and editors. Everyone works from the same story memory.',
    img: 'https://picsum.photos/seed/editorial-meeting/80/80',
  },
  {
    title: 'Content studio',
    detail: 'Run multiple books in parallel with a repeatable planning and review workflow. Scale output without losing voice.',
    img: 'https://picsum.photos/seed/creative-studio-light/80/80',
  },
] as const;

export function UseCasesSection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 sm:py-24">
      <div className="bookish-wrap">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-20 lg:items-start">
          {/* Left: sticky headline */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28"
          >
            <h2 className="text-[clamp(30px,4vw,48px)] leading-[1.0] tracking-[-0.07em] text-[var(--bookish-ink)]">
              Built for whoever writes long-form.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-[var(--bookish-muted)]">
              Solo or team. One book or ten.
            </p>
            <div className="mt-8 overflow-hidden rounded-[18px] border border-[var(--bookish-line)]">
              <Image
                src="https://picsum.photos/seed/notebook-writing-calm/480/320"
                alt="Writing setup"
                width={480}
                height={320}
                className="h-[200px] w-full object-cover"
              />
            </div>
          </motion.div>

          {/* Right: numbered list */}
          <div className="divide-y divide-[var(--bookish-line)]">
            {USE_CASES.map((item, i) => (
              <motion.div
                key={item.title}
                initial={reduce ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: i * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-5 py-7 first:pt-0 last:pb-0"
              >
                <span className="mt-1.5 shrink-0 text-[11px] font-[760] tabular-nums tracking-[0.06em] text-[var(--bookish-muted)]">
                  0{i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-[21px] font-[760] leading-snug tracking-[-0.04em] text-[var(--bookish-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.65] text-[var(--bookish-muted)]">
                    {item.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Layout D: Centered editorial header + 2-col visual showcase ────────────────
// Header centered above a wide visual grid. Completely distinct from A, B, C.
export function PlanSection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 sm:py-24">
      <div className="bookish-wrap">
        {/* Centered header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-12 max-w-[580px] text-center"
        >
          <h2 className="text-[clamp(28px,3.8vw,44px)] leading-[1.02] tracking-[-0.06em] text-[var(--bookish-ink)]">
            Plan chapters like a writer,<br />not a spreadsheet
          </h2>
          <p className="mt-5 text-[15px] leading-[1.7] text-[var(--bookish-muted)]">
            Build acts, chapter beats, character arcs, and pacing goals. Then move straight into
            drafts with your canon loaded in memory.
          </p>
        </motion.div>

        {/* Wide visual grid */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"
        >
          <PlotPlanVisual />
          <div className="flex flex-col gap-4">
            <CreativeFlowVisual />
            <div className="rounded-[18px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_80%,transparent)] p-5">
              <p className="text-[14px] font-[760] text-[var(--bookish-ink)]">Built-in publishing flow</p>
              <p className="mt-2 text-[13px] leading-[1.65] text-[var(--bookish-muted)]">
                Draft, review, and publish from the same project. Published chapters are ready for
                your public shelf without copy-paste.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Layout E: Asymmetric feature card + right visual column ──────────────────
// Large card left + visual stacked right. Used once.
export function LongBookSection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 sm:py-24">
      <div className="bookish-wrap">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* Left feature card */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between rounded-[24px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_82%,transparent)] p-7 sm:p-9"
          >
            <div>
              <h2 className="text-[clamp(28px,3.8vw,44px)] leading-[1.02] tracking-[-0.06em] text-[var(--bookish-ink)]">
                Write as long a book as you want
              </h2>
              <p className="mt-5 max-w-[42ch] text-[15px] leading-[1.7] text-[var(--bookish-muted)]">
                Twenty chapters or two hundred. Bookish keeps tone, facts, and foreshadowing aligned
                across the full manuscript so long-form projects stay coherent.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="bookish-cta">
                Start book
              </Link>
              <Link
                href="/explore"
                className="rounded-full border border-[var(--bookish-line)] px-5 py-3 text-[14px] font-[720] text-[var(--bookish-muted)] transition hover:text-[var(--bookish-ink)]"
              >
                Explore published books
              </Link>
            </div>
          </motion.div>

          {/* Right visual column */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            <LongBookVisual />
            <div className="rounded-[18px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_74%,transparent)] p-5">
              <p className="text-[13px] font-[760] text-[var(--bookish-ink)]">
                Your imagination, our agents
              </p>
              <p className="mt-2 text-[12px] leading-[1.65] text-[var(--bookish-muted)]">
                Bookish handles structural heavy lifting - plot consistency, character callbacks,
                world facts - so you stay in the creative flow.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Layout F: Centered CTA band ──────────────────────────────────────────────
export function FinalCtaSection() {
  const reduce = useReducedMotion();

  return (
    <section className="pb-20 pt-4">
      <div className="bookish-wrap">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--bookish-accent)_34%,var(--bookish-line))] bg-[rgb(35_92_69/0.07)]"
        >
          {/* Top: image strip */}
          <div className="relative h-[180px] w-full overflow-hidden sm:h-[220px]">
            <Image
              src="https://picsum.photos/seed/open-book-forest-light/1200/400"
              alt=""
              fill
              className="object-cover opacity-40"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgb(35_92_69/0.12)]" />
          </div>

          {/* Bottom: CTA content */}
          <div className="px-8 pb-10 pt-8 text-center sm:px-12 sm:pb-12">
            <h2 className="mx-auto max-w-[18ch] text-[clamp(28px,4vw,46px)] leading-[1.03] tracking-[-0.06em] text-[var(--bookish-ink)]">
              Finish your next book with less friction
            </h2>
            <p className="mx-auto mt-4 max-w-[50ch] text-[15px] leading-[1.7] text-[var(--bookish-muted)]">
              Keep your imagination in flow. Let Bookish handle planning memory, chapter context,
              and revision structure in one clean workspace.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="bookish-cta">
                Start book
              </Link>
              <Link
                href="/explore"
                className="rounded-full border border-[var(--bookish-line)] px-5 py-3 text-[14px] font-[720] text-[var(--bookish-muted)] transition hover:text-[var(--bookish-ink)]"
              >
                Read public books
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
