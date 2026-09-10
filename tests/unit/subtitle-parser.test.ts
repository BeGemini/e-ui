import { describe, it, expect } from '@jest/globals';
import { parseSRT } from '@/lib/parsers/srt';
import { parseVTT } from '@/lib/parsers/vtt';
import { parseSSA, parseASS } from '@/lib/parsers/ssa-ass';

describe('SRT Subtitle Parser', () => {
  it('should parse valid SRT format', () => {
    const srtContent = `1
00:00:00,000 --> 00:00:05,000
First subtitle

2
00:00:05,100 --> 00:00:10,000
Second subtitle

3
00:00:10,100 --> 00:00:15,000
Third subtitle
`;

    const result = parseSRT(srtContent);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      index: 0,
      start: 0,
      end: 5,
      text: 'First subtitle',
    });
    expect(result[1]).toEqual({
      index: 1,
      start: 5.1,
      end: 10,
      text: 'Second subtitle',
    });
  });

  it('should handle multi-line subtitles', () => {
    const srtContent = `1
00:00:00,000 --> 00:00:05,000
First line
Second line
Third line

2
00:00:05,100 --> 00:00:10,000
Single line
`;

    const result = parseSRT(srtContent);
    expect(result).toHaveLength(2);
    expect(result[0].text).toContain('First line');
    expect(result[0].text).toContain('Second line');
  });

  it('should handle edge cases with blank lines', () => {
    const srtContent = `1
00:00:00,000 --> 00:00:05,000
Subtitle


2
00:00:05,100 --> 00:00:10,000
Another
`;

    const result = parseSRT(srtContent);
    expect(result).toHaveLength(2);
  });

  it('should parse timing correctly', () => {
    const srtContent = `1
00:01:30,500 --> 00:02:15,750
Timed subtitle
`;

    const result = parseSRT(srtContent);
    expect(result[0].start).toBe(90.5); // 1 min 30.5 sec
    expect(result[0].end).toBe(135.75); // 2 min 15.75 sec
  });

  it('should handle malformed SRT gracefully', () => {
    const malformedSRT = `not a valid srt
this will fail
`;

    expect(() => parseSRT(malformedSRT)).not.toThrow();
  });
});

describe('VTT Subtitle Parser', () => {
  it('should parse valid VTT format', () => {
    const vttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
First subtitle

00:00:05.100 --> 00:00:10.000
Second subtitle
`;

    const result = parseVTT(vttContent);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      index: 0,
      start: 0,
      end: 5,
      text: 'First subtitle',
    });
  });

  it('should handle VTT cue settings', () => {
    const vttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000 align:start
Subtitle with settings

00:00:05.100 --> 00:00:10.000
Normal subtitle
`;

    const result = parseVTT(vttContent);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Subtitle with settings');
  });

  it('should skip WEBVTT header', () => {
    const vttContent = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:05.000
First subtitle
`;

    const result = parseVTT(vttContent);
    expect(result).toHaveLength(1);
  });
});

describe('SSA/ASS Subtitle Parser', () => {
  it('should parse valid SSA format', () => {
    const ssaContent = `[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Arial,20

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,First subtitle
Dialogue: 0,0:00:05.10,0:00:10.00,Default,,0,0,0,,Second subtitle
`;

    const result = parseSSA(ssaContent);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      index: 0,
      start: 0,
      end: 5,
      text: 'First subtitle',
    });
  });

  it('should parse valid ASS format', () => {
    const assContent = `[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Arial,20

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,First subtitle
Dialogue: 0,0:00:05.10,0:00:10.00,Default,,0,0,0,,Second subtitle
`;

    const result = parseASS(assContent);
    expect(result).toHaveLength(2);
  });

  it('should handle SSA timing format (centiseconds)', () => {
    const ssaContent = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:01:30.50,0:02:15.75,Default,,0,0,0,,Timed subtitle
`;

    const result = parseSSA(ssaContent);
    expect(result[0].start).toBe(90.5);
    expect(result[0].end).toBe(135.75);
  });

  it('should strip SSA/ASS formatting tags', () => {
    const ssaContent = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\c&H0000FF&}Red text{\\c&HFFFFFF&}
`;

    const result = parseSSA(ssaContent);
    expect(result[0].text).not.toContain('\\c&H');
  });
});
