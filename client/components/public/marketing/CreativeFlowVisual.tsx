'use client';

import { motion, useReducedMotion } from 'motion/react';

const STEPS = [
  { label: 'You write the brief', detail: 'Premise, tone, constraints' },
  { label: 'Agents plan & build', detail: 'Outline, world, characters' },
  { label: 'Chapters draft in context', detail: 'Voice, pace, callbacks intact' },
  { label: 'You approve & publish', detail: 'Edit, refine, share' },
] as const;

export function CreativeFlowVisual() {
  const reduce = useReducedMotion();

  return (
    <div
      className="overflow-hidden rounded-[20px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_78%,transparent)] p-5 sm:p-6"
      aria-hidden
    >
      <div className="space-y-3">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.label}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bookish-accent)] text-[12px] font-[760] text-white">
                {index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span className="my-1 w-px flex-1 min-h-[20px] bg-[var(--bookish-line)]" />
              )}
            </div>
            <div className="pb-3">
              <p className="text-[14px] font-[760] text-[var(--bookish-ink)]">{step.label}</p>
              <p className="mt-0.5 text-[12px] text-[var(--bookish-muted)]">{step.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div
        className="mt-2 rounded-xl px-4 py-3 text-center text-[12px] font-[720] text-[var(--bookish-accent)]"
        style={{ background: 'rgb(35 92 69 / 0.08)' }}
      >
        Your imagination sets direction. Agents handle the lift.
      </div>
    </div>
  );
}
