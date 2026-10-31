/**
 * Lightweight helpers shared by the "My Sentences" export flow.
 *
 * IMPORTANT: this module must NOT import `docx` or `@react-pdf/renderer`.
 * Those are loaded on demand from ./build-docx and ./build-pdf when the user exports.
 */

import type { MySentence } from '@/lib/types';

/** Background of the "Original" block. Must match `bg-[#E8F5E9]` in SentenceList.tsx. */
export const ORIGINAL_BG_HEX = 'E8F5E9';
/** Text color of the "Original" block (contrast on ORIGINAL_BG_HEX ≈ 13:1). */
export const ORIGINAL_TEXT_HEX = '1F2937';

export interface SentenceExportInput {
  title: string;
  exportedAt: Date;
  includeOriginal: boolean;
  sentences: MySentence[];
}

export type ExportFormat = 'docx' | 'pdf';

export const EXPORT_MIME: Record<ExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

const MAX_TITLE_LENGTH = 80;

/** Format a date as YYYY-MM-DD in the local time zone. */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Build `<title>-我的句子-YYYY-MM-DD.<ext>` with a filesystem-safe title. */
export function buildExportFilename(title: string, ext: ExportFormat, date: Date): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, MAX_TITLE_LENGTH)
    .replace(/[.\s]+$/g, '');

  const safeTitle = cleaned || 'exercise';
  return `${safeTitle}-我的句子-${formatLocalDate(date)}.${ext}`;
}

/** True when the text contains CJK ideographs, CJK punctuation or full-width forms. */
export function containsCjk(text: string): boolean {
  return /[\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(text);
}

/** Trigger a browser download for a Blob via a temporary, non-rendered <a download>. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
