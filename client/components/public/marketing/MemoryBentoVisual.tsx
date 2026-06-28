'use client';

import { motion, useReducedMotion } from 'motion/react';

const MEMORY_ITEMS = [
  {
    kind: 'Character',
    title: 'Mara Venn',
    body: 'Apprentice archivist. Fear: losing the memory she never wrote down.',
    tone: '#d9e3d1',
  },
  {
    kind: 'World',
    title: 'The Clockwork Orchard',
    body: 'Brass trees store traded memories. Gate opens on intent, not schedule.',
    tone: '#d8dde8',
  },
  {
    kind: 'Plot thread',
    title: 'The empty jar',
    body: 'Callback in Ch. 9. Foreshadowed Ch. 2. Pays off in final act.',
    tone: '#e7dfcf',
  },
  {
    kind: 'Tone',
    title: 'Project voice',
    body: 'Literary fantasy, warm melancholy, short declarative sentences.',
    tone: '#d7e4df',
  },
  {
    kind: 'Org',
    title: 'Ministry of Unsent Letters',
    body: 'Catalogues courage never mailed. Mara petitioned them for three years.',
    tone: '#dce5e2',
  },
  {
    kind: 'System',
    title: 'Memory trade rules',
    body: 'First harvest returns one forgotten moment to the city. Price scales with rarity.',
    tone: '#ddd8e8',
  },
] as const;

export function MemoryBentoVisual() {
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {MEMORY_ITEMS.map((item, index) => (
        <motion.article
          key={item.title}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-[16px] border border-[color-mix(in_srgb,var(--bookish-line)_88%,transparent)] p-4 ${
            index === 0 ? 'sm:col-span-2 lg:col-span-2 lg:row-span-1' : ''
          }`}
          style={{
            background: `linear-gradient(145deg, rgb(255 255 251 / 0.55), transparent 55%), ${item.tone}`,
          }}
        >
          <span className="text-[10px] font-[720] text-[var(--bookish-accent)]">{item.kind}</span>
          <h4 className="mt-1 text-[15px] font-[760] tracking-[-0.03em] text-[var(--bookish-ink)]">
            {item.title}
          </h4>
          <p className="mt-2 text-[12px] leading-[1.55] text-[var(--bookish-muted)]">{item.body}</p>
        </motion.article>
      ))}
    </div>
  );
}
