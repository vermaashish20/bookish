'use client';

import { motion, useReducedMotion } from 'motion/react';

const CHAPTERS = Array.from({ length: 18 }, (_, i) => {
  const n = i + 1;
  const titles = [
    'The orchard gate',
    'Letters in jars',
    'First harvest',
    'Ministry audit',
    'Stolen memory',
    'Root cellar',
    'The Forester\'s key',
    'Market of echoes',
    'Empty jar callback',
    'Brass leaves',
    'City forgetting',
    'Apprentice oath',
    'Trade law',
    'Memory flood',
    'Return protocol',
    'Orchard wakes',
    'Last letter',
    'What the city lost',
  ];
  return { n, title: titles[i] ?? `Chapter ${n}`, words: 2400 + (i % 5) * 180 };
});

export function LongBookVisual() {
  const reduce = useReducedMotion();

  return (
    <div
      className="overflow-hidden rounded-[20px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_78%,transparent)]"
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-[var(--bookish-line)] px-5 py-3.5">
        <div>
          <p className="text-[13px] font-[760] text-[var(--bookish-ink)]">The Clockwork Orchard</p>
          <p className="text-[11px] text-[var(--bookish-muted)]">18 chapters, 47,200 words, context retained</p>
        </div>
        <span className="rounded-full bg-[rgb(35_92_69/0.12)] px-2.5 py-1 text-[10px] font-[720] text-[var(--bookish-accent)]">
          Memory synced
        </span>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-3">
        <div className="space-y-1">
          {CHAPTERS.map((ch, index) => (
            <motion.div
              key={ch.n}
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: Math.min(index * 0.02, 0.3) }}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-[11px] ${
                index === 8
                  ? 'border border-[color-mix(in_srgb,var(--bookish-accent)_35%,var(--bookish-line))] bg-[rgb(35_92_69/0.08)]'
                  : 'border border-transparent hover:border-[var(--bookish-line)] hover:bg-[rgb(255_255_251/0.45)]'
              }`}
            >
              <span className="font-[720] text-[var(--bookish-ink)]">
                Ch {ch.n}: {ch.title}
              </span>
              <span className="shrink-0 pl-3 text-[var(--bookish-muted)]">{ch.words.toLocaleString()} w</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="border-t border-[var(--bookish-line)] px-5 py-3 text-[10px] text-[var(--bookish-muted)]">
        Ch. 9 references the empty jar from Ch. 2. Agents tracked the callback automatically.
      </div>
    </div>
  );
}
