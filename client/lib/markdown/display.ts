/** Insert line breaks so inline markdown blocks render without corrupting headings. */
export function normalizeMarkdownForDisplay(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    // Break inline horizontal rules onto their own line.
    .replace(/\s+---\s+/g, '\n\n---\n\n')
    // Break inline ATX headings onto their own line (do not touch existing ### at line start).
    .replace(/([^\n])\s+(#{1,6}\s+)/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** One-line plain-text snippet for cards and list previews. */
export function markdownToPlainExcerpt(text: string, maxLength = 140): string {
  const plain = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/---+/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
