import { ParsedSubtitle } from '@/lib/types';

/**
 * Format milliseconds to time string (HH:MM:SS,mmm)
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * SRT format:
 * 1
 * 00:00:00,000 --> 00:00:05,000
 * First subtitle text
 *
 * 2
 * 00:00:05,000 --> 00:00:10,000
 * Second subtitle text
 */
export function parseSRT(content: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];

  // Split by double newlines to get subtitle blocks
  const blocks = content.split(/\n\s*\n/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n').map((line) => line.trim());
    if (lines.length < 3) continue;

    // First line should be sequence number (skip it)
    // Second line should be timing
    const timingLine = lines[1];
    const textLines = lines.slice(2);

    // Parse timing line: "00:00:00,000 --> 00:00:05,000"
    const timingMatch = timingLine.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );

    if (!timingMatch) continue;

    const startMs =
      parseInt(timingMatch[1]) * 3600000 +
      parseInt(timingMatch[2]) * 60000 +
      parseInt(timingMatch[3]) * 1000 +
      parseInt(timingMatch[4]);

    const endMs =
      parseInt(timingMatch[5]) * 3600000 +
      parseInt(timingMatch[6]) * 60000 +
      parseInt(timingMatch[7]) * 1000 +
      parseInt(timingMatch[8]);

    const text = textLines.join('\n').trim();

    if (text) {
      subtitles.push({
        index: subtitles.length + 1,
        text,
        startSeconds: startMs / 1000,
        endSeconds: endMs / 1000,
        startTime: formatTime(startMs),
        endTime: formatTime(endMs),
      });
    }
  }

  return subtitles;
}
