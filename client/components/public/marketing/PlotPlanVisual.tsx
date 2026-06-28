'use client';

import { motion, useReducedMotion } from 'motion/react';

const OUTLINE = [
  { act: 'Act I', label: 'Setup', chapters: ['Ch 1: The orchard gate', 'Ch 2: Letters in jars', 'Ch 3: First harvest'] },
  { act: 'Act II', label: 'Confrontation', chapters: ['Ch 4: Ministry audit', 'Ch 5: The stolen memory', 'Ch 6: Root cellar fire'] },
  { act: 'Act III', label: 'Resolution', chapters: ['Ch 7: Return what was taken', 'Ch 8: The city remembers'] },
] as const;

export function PlotPlanVisual() {
  const reduce = useReducedMotion();

  return (
    <div
      className="overflow-hidden rounded-[20px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_78%,transparent)]"
      aria-hidden
    >
      <div className="border-b border-[var(--bookish-line)] px-5 py-3.5">
        <p className="text-[13px] font-[760] text-[var(--bookish-ink)]">Story outline</p>
        <p className="text-[11px] text-[var(--bookish-muted)]">Planner agent, 8 chapters, mystery fantasy</p>
      </div>
      <div className="space-y-0 p-4">
        {OUTLINE.map((block, blockIndex) => (
          <div key={block.act} className="relative pl-6">
            {blockIndex < OUTLINE.length - 1 && (
              <span className="absolute bottom-0 left-[7px] top-8 w-px bg-[var(--bookish-line)]" />
            )}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: blockIndex * 0.1, duration: 0.45 }}
              className="relative"
            >
              <span className="absolute left-[-18px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--bookish-accent)] bg-[var(--bookish-paper)]" />
              <p className="text-[11px] font-[720] text-[var(--bookish-accent)]">{block.act}</p>
              <p className="text-[13px] font-[760] text-[var(--bookish-ink)]">{block.label}</p>
              <ul className="mt-2 space-y-1.5 pb-5">
                {block.chapters.map((ch) => (
                  <li
                    key={ch}
                    className="rounded-lg border border-[var(--bookish-line)] bg-[rgb(255_255_251/0.55)] px-3 py-2 text-[11px] text-[var(--bookish-muted)]"
                  >
                    {ch}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
