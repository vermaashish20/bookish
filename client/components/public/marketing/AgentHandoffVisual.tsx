'use client';

import { motion, useReducedMotion } from 'motion/react';

const AGENTS = ['Planner', 'World Builder', 'Writer', 'Editor'] as const;

export function AgentHandoffVisual() {
  const reduce = useReducedMotion();

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_82%,transparent)] p-5 shadow-[0_24px_70px_rgb(31_35_28/0.08)] sm:p-6"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40"
        style={{
          background: 'radial-gradient(circle, rgb(35 92 69 / 0.35), transparent 70%)',
        }}
      />
      <p className="text-[10px] font-[720] uppercase tracking-[0.14em] text-[var(--bookish-muted)]">
        Your brief
      </p>
      <div className="mt-3 rounded-2xl border border-[var(--bookish-line)] bg-[rgb(255_255_251/0.72)] px-4 py-3 text-[13px] leading-relaxed text-[var(--bookish-ink)]">
        A city that trades memories for convenience. The protagonist discovers the orchard where
        forgotten moments are stored.
      </div>

      <div className="my-5 h-px bg-[var(--bookish-line)]" />

      <p className="text-[10px] font-[720] uppercase tracking-[0.14em] text-[var(--bookish-muted)]">
        Agents take it from here
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {AGENTS.map((agent, index) => (
          <motion.div
            key={agent}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: index * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-[color-mix(in_srgb,var(--bookish-accent)_18%,var(--bookish-line))] bg-[rgb(35_92_69/0.07)] px-3 py-2.5"
          >
            <p className="text-[11px] font-[760] text-[var(--bookish-accent)]">{agent}</p>
            <p className="mt-1 text-[10px] leading-snug text-[var(--bookish-muted)]">
              {agent === 'Planner' && 'Outline acts and chapter beats'}
              {agent === 'World Builder' && 'Expand lore and factions'}
              {agent === 'Writer' && 'Draft scenes in your voice'}
              {agent === 'Editor' && 'Check pace and continuity'}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--bookish-ink)] px-4 py-3 text-[11px] text-[var(--bookish-paper)]">
        <span>You stay in the creative seat</span>
        <span className="font-[720] text-[var(--bookish-accent-hover)]">Approve & refine</span>
      </div>
    </div>
  );
}
