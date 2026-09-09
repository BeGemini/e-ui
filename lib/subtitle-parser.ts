import { ParsedSubtitle } from './types';
import { parseSRT } from './parsers/srt';
import { parseVTT } from './parsers/vtt';
import { parseSSAASS } from './parsers/ssa-ass';

export type SubtitleFormat = 'srt' | 'vtt' | 'ssa' | 'ass';

/**
 * Parse subtitles based on format
 * @param content - Subtitle file content as string
 * @param format - Format of subtitle file (srt, vtt, ssa, ass)
 * @returns Normalized subtitle array
 * @throws Error if format is unsupported or parsing fails
 */
export function parseSubtitles(content: string, format: SubtitleFormat): ParsedSubtitle[] {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid subtitle content: must be a non-empty string');
  }

  const normalizedFormat = format.toLowerCase() as SubtitleFormat;

  switch (normalizedFormat) {
    case 'srt':
      return parseSRT(content);

    case 'vtt':
      return parseVTT(content);

    case 'ssa':
    case 'ass':
      return parseSSAASS(content);

    default:
      throw new Error(`Unsupported subtitle format: ${format}`);
  }
}

/**
 * Detect subtitle format from file extension or content
 * @param filename - Subtitle filename
 * @returns Detected format or null if unable to detect
 */
export function detectSubtitleFormat(filename: string): SubtitleFormat | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'srt':
      return 'srt';
    case 'vtt':
      return 'vtt';
    case 'ssa':
      return 'ssa';
    case 'ass':
      return 'ass';
    default:
      return null;
  }
}

/**
 * Get all supported subtitle formats
 */
export function getSupportedFormats(): SubtitleFormat[] {
  return ['srt', 'vtt', 'ssa', 'ass'];
}

/**
 * Validate if format is supported
 */
export function isFormatSupported(format: string): boolean {
  return getSupportedFormats().includes(format.toLowerCase() as SubtitleFormat);
}
