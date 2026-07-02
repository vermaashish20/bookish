export const MANUSCRIPT_PAGE_WIDTH_PX = 595;
export const MANUSCRIPT_PAGE_HEIGHT_PX = 842;
/** Print-like margins for A4 (595×842 px at 72 dpi ≈ 8.27×11.69 in). */
export const MANUSCRIPT_MARGIN_X_PX = 56;
export const MANUSCRIPT_MARGIN_TOP_PX = 48;
/** Minimal bottom margin — page number is absolutely positioned inside this inset. */
export const MANUSCRIPT_MARGIN_BOTTOM_PX = 12;
export const MANUSCRIPT_HEADER_BAND_PX = 22;

/**
 * Character budgets derived from A4 body area (595×842 px) at text-xs / leading 1.65.
 * Page 1 reserves space for the chapter title block rendered in BookEditor.
 */
const MANUSCRIPT_BODY_LINE_HEIGHT_PX = 12 * 1.65;
const MANUSCRIPT_BODY_CHARS_PER_LINE = 68;
const MANUSCRIPT_BODY_LINES =
  (MANUSCRIPT_PAGE_HEIGHT_PX -
    MANUSCRIPT_MARGIN_TOP_PX -
    MANUSCRIPT_MARGIN_BOTTOM_PX -
    MANUSCRIPT_HEADER_BAND_PX -
    8) /
  MANUSCRIPT_BODY_LINE_HEIGHT_PX;
const MANUSCRIPT_CHAPTER_HEADER_LINES = 3;

export const MANUSCRIPT_PAGE_BODY_FIRST = Math.floor(
  (MANUSCRIPT_BODY_LINES - MANUSCRIPT_CHAPTER_HEADER_LINES) * MANUSCRIPT_BODY_CHARS_PER_LINE,
);
export const MANUSCRIPT_PAGE_BODY = Math.floor(
  MANUSCRIPT_BODY_LINES * MANUSCRIPT_BODY_CHARS_PER_LINE,
);

/** Last page below this fraction of pageBudget is merged into the previous page when it fits. */
const TRAILING_PAGE_MIN_FILL_RATIO = 0.35;

function normalizeHeading(value: string): string {
  return value
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/[_*`~]/g, '')
    .replace(/[""''""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function headingsMatch(a: string, b: string): boolean {
  const left = normalizeHeading(a);
  const right = normalizeHeading(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftCore = left.replace(/^chapter\s+\d+\s*[–—-]?\s*/i, '');
  const rightCore = right.replace(/^chapter\s+\d+\s*[–—-]?\s*/i, '');
  return Boolean(leftCore && rightCore && (leftCore === rightCore || left.includes(rightCore) || right.includes(leftCore)));
}

function isChapterHeadingLine(line: string, chapterNumber: number, chapterTitle: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (headingsMatch(trimmed, chapterTitle)) return true;
  const norm = normalizeHeading(trimmed);
  if (!norm.startsWith(`chapter ${chapterNumber}`)) return false;
  const titleNorm = normalizeHeading(chapterTitle);
  const titleCore = titleNorm.replace(/^chapter\s+\d+\s*[–—-]?\s*/i, '');
  if (!titleCore) return true;
  return norm.includes(titleCore);
}

/** Remove leading chapter title lines already shown in the page header. */
export function stripLeadingChapterHeading(
  content: string,
  chapter: { number: number; title: string },
): string {
  const lines = content.split('\n');
  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && !lines[index].trim()) index += 1;
    if (index >= lines.length) break;

    const line = lines[index]!;
    const trimmed = line.trim();

    if (/^[-*_]{3,}\s*$/.test(trimmed)) {
      index += 1;
      continue;
    }

    if (isChapterHeadingLine(line, chapter.number, chapter.title)) {
      index += 1;
      continue;
    }

    if (/^#+\s*chapter\s+\d+/i.test(trimmed)) {
      index += 1;
      continue;
    }

    break;
  }

  return lines.slice(index).join('\n').trim();
}

export function formatChapterHeading(number: number, title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return `Chapter ${number}`;
  if (new RegExp(`^chapter\\s+${number}\\b`, 'i').test(trimmed)) return trimmed;
  return `Chapter ${number}: ${trimmed}`;
}

/** Plain-text manuscript view — drop common inline markdown without rendering. */
export function stripManuscriptMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function estimateBlockWeight(text: string): number {
  if (text.includes('```')) {
    const lineCount = text.split('\n').length;
    return Math.max(text.length, lineCount * 52);
  }
  return text.length;
}

function splitIntoBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split('\n');
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    if (buffer.length === 0) return;
    blocks.push(buffer.join('\n'));
    buffer = [];
  };

  for (const line of lines) {
    const fenceToggle = line.trim().startsWith('```');
    if (fenceToggle) inFence = !inFence;

    if (!inFence && line.trim() === '' && buffer.length > 0) {
      flush();
      continue;
    }

    buffer.push(line);
  }

  flush();
  return blocks.filter((block) => block.trim());
}

function hardSplitBlock(block: string, budget: number): string[] {
  const lines = block.split('\n');
  const pages: string[] = [];
  let current: string[] = [];
  let weight = 0;

  for (const line of lines) {
    const lineWeight = estimateBlockWeight(line);
    if (weight + lineWeight > budget && current.length > 0) {
      pages.push(current.join('\n').trim());
      current = [line];
      weight = lineWeight;
    } else {
      current.push(line);
      weight += lineWeight;
    }
  }

  if (current.length) pages.push(current.join('\n').trim());
  return pages.length ? pages : [block];
}

export function paginateChapterContent(
  content: string,
  options?: { firstPageBudget?: number; pageBudget?: number },
): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [''];

  const firstBudget = options?.firstPageBudget ?? MANUSCRIPT_PAGE_BODY_FIRST;
  const pageBudget = options?.pageBudget ?? MANUSCRIPT_PAGE_BODY;
  const blocks = splitIntoBlocks(trimmed);

  const pages: string[] = [];
  let current = '';
  let budget = firstBudget;

  for (const block of blocks) {
    const blockWeight = estimateBlockWeight(block);
    const separator = current ? '\n\n' : '';
    const combined = current ? `${current}${separator}${block}` : block;
    const combinedWeight = estimateBlockWeight(combined);

    if (combinedWeight > budget && current) {
      pages.push(current.trim());
      current = block;
      budget = pageBudget;

      if (estimateBlockWeight(current) > budget) {
        const splits = hardSplitBlock(current, budget);
        pages.push(...splits.slice(0, -1));
        current = splits[splits.length - 1] ?? '';
      }
      continue;
    }

    if (blockWeight > budget && !current) {
      pages.push(...hardSplitBlock(block, budget));
      budget = pageBudget;
      continue;
    }

    current = combined;
  }

  if (current.trim()) pages.push(current.trim());
  return mergeShortTrailingPages(pages.length ? pages : [''], pageBudget, firstBudget);
}

function mergeShortTrailingPages(
  pages: string[],
  pageBudget: number,
  firstPageBudget: number,
): string[] {
  if (pages.length <= 1) return pages;

  const result = [...pages];
  const minFill = Math.floor(pageBudget * TRAILING_PAGE_MIN_FILL_RATIO);

  while (result.length > 1) {
    const last = result[result.length - 1]!.trim();
    if (!last) {
      result.pop();
      continue;
    }
    if (estimateBlockWeight(last) >= minFill) break;

    const prevIndex = result.length - 2;
    const prev = result[prevIndex]!.trim();
    const merged = `${prev}\n\n${last}`;
    const budget = prevIndex === 0 ? firstPageBudget : pageBudget;
    if (estimateBlockWeight(merged) <= budget) {
      result[prevIndex] = merged;
      result.pop();
    } else {
      break;
    }
  }

  return result;
}

export function prepareChapterForDisplay(
  content: string,
  chapter: { number: number; title: string },
): string[] {
  return paginateChapterContent(stripLeadingChapterHeading(content, chapter));
}
