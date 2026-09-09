import { ParsedSubtitle } from '@/lib/types';

/**
 * Format milliseconds to time string (0:00:00.00)
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

/**
 * Parse SSA/ASS subtitle format
 * ASS format:
 * [Script Info]
 * Title: Example
 *
 * [V4+ Styles]
 * Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, ...
 * Style: Default, Arial, 20, &H00FFFFFF, ...
 *
 * [Events]
 * Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
 * Dialogue: 0, 0:00:00.00, 0:00:05.00, Default, , 0, 0, 0, , First subtitle text
 */
export function parseSSAASS(content: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];

  const lines = content.split('\n');

  // Find the [Events] section
  let eventsStartIndex = -1;
  let dialogueFormat: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '[Events]') {
      eventsStartIndex = i + 1;
    }

    // Find Format line to know which field is which
    if (eventsStartIndex > -1 && line.startsWith('Format:')) {
      const formatPart = line.substring('Format:'.length).trim();
      dialogueFormat = formatPart.split(',').map((f) => f.trim());
    }

    // Process Dialogue lines
    if (eventsStartIndex > -1 && line.startsWith('Dialogue:')) {
      const dialoguePart = line.substring('Dialogue:'.length).trim();
      const fields = dialoguePart.split(',');

      if (fields.length >= dialogueFormat.length) {
        // Find indices for Start, End, and Text
        const startIdx = dialogueFormat.indexOf('Start');
        const endIdx = dialogueFormat.indexOf('End');
        const textIdx = dialogueFormat.indexOf('Text');

        if (startIdx >= 0 && endIdx >= 0 && textIdx >= 0) {
          const startStr = fields[startIdx]?.trim();
          const endStr = fields[endIdx]?.trim();
          const text = fields.slice(textIdx).join(',').trim();

          // Parse time format: "0:00:00.00"
          const parseTime = (timeStr: string): number => {
            const match = timeStr.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
            if (!match) return 0;

            return (
              parseInt(match[1]) * 3600000 +
              parseInt(match[2]) * 60000 +
              parseInt(match[3]) * 1000 +
              parseInt(match[4]) * 10
            );
          };

          const startMs = parseTime(startStr || '0:00:00.00');
          const endMs = parseTime(endStr || '0:00:00.00');

          // Remove SSA style tags (e.g., {\i1}, {\c&HFFFFFF&})
          const cleanText = text.replace(/\{\\[^}]*\}/g, '');

          if (cleanText.trim()) {
            subtitles.push({
              index: subtitles.length + 1,
              text: cleanText.trim(),
              startSeconds: startMs / 1000,
              endSeconds: endMs / 1000,
              startTime: formatTime(startMs),
              endTime: formatTime(endMs),
            });
          }
        }
      }
    }
  }

  return subtitles;
}
