import { ParsedSubtitle } from '@/lib/types';

/**
 * Format milliseconds to time string (HH:MM:SS.mmm)
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Parse VTT subtitle format
 * VTT format:
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:05.000
 * First subtitle text
 *
 * 00:00:05.000 --> 00:00:10.000
 * Second subtitle text
 */
export function parseVTT(content: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];

  // Remove WEBVTT header
  let lines = content.split('\n').map((line) => line.trim());

  // Find and skip the WEBVTT header
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('WEBVTT')) {
      startIndex = i + 1;
      break;
    }
  }

  lines = lines.slice(startIndex);

  // Group lines by cues (separated by blank lines)
  let currentCue: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (currentCue.length > 0) {
        // Process the cue
        const timingIndex = currentCue.findIndex((l) => l.includes('-->'));
        if (timingIndex >= 0) {
          const timingLine = currentCue[timingIndex];
          const textLines = currentCue.slice(timingIndex + 1);

          // Parse timing line: "00:00:00.000 --> 00:00:05.000"
          const timingMatch = timingLine.match(
            /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
          );

          if (timingMatch) {
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
        }
        currentCue = [];
      }
    } else {
      currentCue.push(line);
    }
  }

  // Process last cue if exists
  if (currentCue.length > 0) {
    const timingIndex = currentCue.findIndex((l) => l.includes('-->'));
    if (timingIndex >= 0) {
      const timingLine = currentCue[timingIndex];
      const textLines = currentCue.slice(timingIndex + 1);

      const timingMatch = timingLine.match(
        /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
      );

      if (timingMatch) {
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
    }
  }

  return subtitles;
}
