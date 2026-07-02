export {
  MANUSCRIPT_HEADER_BAND_PX,
  MANUSCRIPT_MARGIN_BOTTOM_PX,
  MANUSCRIPT_MARGIN_TOP_PX,
  MANUSCRIPT_MARGIN_X_PX,
  MANUSCRIPT_PAGE_BODY,
  MANUSCRIPT_PAGE_BODY_FIRST,
  MANUSCRIPT_PAGE_HEIGHT_PX,
  MANUSCRIPT_PAGE_WIDTH_PX,
  formatChapterHeading,
  paginateChapterContent,
  prepareChapterForDisplay,
  stripLeadingChapterHeading,
  stripManuscriptMarkdown,
} from './chapterContent';

/** @deprecated Use MANUSCRIPT_PAGE_BODY */
export const CHAPTER_CHARS_PER_PAGE = 1500;
