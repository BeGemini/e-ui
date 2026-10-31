/** @jest-environment node */

import { Packer } from 'docx';
// fflate ships with docx (its zip dependency).
import { strFromU8, unzipSync } from 'fflate';
import {
  EXPORT_MIME,
  buildExportFilename,
  containsCjk,
  formatLocalDate,
  type SentenceExportInput,
} from '@/lib/sentence-export';
import { build, createDocument } from '@/lib/sentence-export/build-docx';

describe('buildExportFilename', () => {
  const date = new Date(2026, 9, 31);

  it('builds <title>-我的句子-YYYY-MM-DD.<ext>', () => {
    expect(buildExportFilename('S01E01 – Pilot', 'docx', date)).toBe(
      'S01E01 – Pilot-我的句子-2026-10-31.docx'
    );
    expect(buildExportFilename('S01E01 – Pilot', 'pdf', date)).toBe(
      'S01E01 – Pilot-我的句子-2026-10-31.pdf'
    );
  });

  it('removes characters that are invalid in file names, including control characters', () => {
    expect(buildExportFilename('a\\b/c:d*e?f"g<h>i|j\u0001k\u007F', 'pdf', date)).toBe(
      'abcdefghijk-我的句子-2026-10-31.pdf'
    );
  });

  it('collapses whitespace and trims leading/trailing dots and spaces', () => {
    expect(buildExportFilename('  ..My   \t Title.. ', 'pdf', date)).toBe(
      'My Title-我的句子-2026-10-31.pdf'
    );
  });

  it('truncates long titles to 80 characters', () => {
    const name = buildExportFilename('x'.repeat(200), 'docx', date);
    expect(name).toBe(`${'x'.repeat(80)}-我的句子-2026-10-31.docx`);
  });

  it('falls back to "exercise" when nothing is left after cleaning', () => {
    expect(buildExportFilename(' ...??** ', 'pdf', date)).toBe('exercise-我的句子-2026-10-31.pdf');
    expect(buildExportFilename('', 'docx', date)).toBe('exercise-我的句子-2026-10-31.docx');
  });

  it('zero-pads month and day', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(buildExportFilename('T', 'pdf', new Date(2026, 0, 5))).toBe('T-我的句子-2026-01-05.pdf');
  });
});

describe('containsCjk', () => {
  it('is false for Latin text and typographic punctuation', () => {
    expect(containsCjk('hello')).toBe(false);
    expect(containsCjk("don't “quoted” – —…")).toBe(false);
  });

  it('is true for CJK ideographs, CJK punctuation and full-width forms', () => {
    expect(containsCjk('你好')).toBe(true);
    expect(containsCjk('全角，')).toBe(true);
    expect(containsCjk('\uFF0C')).toBe(true);
    expect(containsCjk('。')).toBe(true);
  });
});

describe('DOCX export', () => {
  const baseInput: SentenceExportInput = {
    title: 'S01E01 – Pilot',
    exportedAt: new Date(2026, 9, 31),
    includeOriginal: false,
    sentences: [
      {
        sentenceIndex: 0,
        userInput: "Hi, I'm Mary Alice.",
        correctAnswer: "Hi. I'm Mary Alice Young.",
        savedAt: '2026-10-31T12:00:00.000Z',
      },
      {
        sentenceIndex: 2,
        userInput: '',
        correctAnswer: 'It was a beautiful day.',
        savedAt: '2026-10-31T12:01:00.000Z',
      },
    ],
  };

  async function documentXml(input: SentenceExportInput): Promise<string> {
    const buffer = await Packer.toBuffer(createDocument(input));
    const files = unzipSync(new Uint8Array(buffer), {
      filter: (file) => file.name === 'word/document.xml',
    });
    const xml = files['word/document.xml'];
    if (!xml) throw new Error('word/document.xml missing');
    return strFromU8(xml);
  }

  it('contains the title, learner text and (Skipped) placeholder without sentence labels', async () => {
    const xml = await documentXml(baseInput);
    expect(xml).toContain('S01E01 – Pilot');
    expect(xml).toContain('My Sentences · Exported on 2026-10-31');
    expect(xml).not.toContain('Sentence 1');
    expect(xml).toContain('Hi, I&apos;m Mary Alice.');
    expect(xml).toContain('(Skipped)');
  });

  it('omits the original text when includeOriginal is false', async () => {
    const xml = await documentXml(baseInput);
    expect(xml).not.toContain('Mary Alice Young.');
    expect(xml).not.toContain('E8F5E9');
  });

  it('includes the shaded original text (no "Original:" prefix) when includeOriginal is true', async () => {
    const xml = await documentXml({ ...baseInput, includeOriginal: true });
    expect(xml).not.toContain('Original:');
    expect(xml).toContain('Mary Alice Young.');
    expect(xml).toContain('E8F5E9');
  });

  it('build() returns a non-empty DOCX Blob', async () => {
    const blob = await build(baseInput);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(EXPORT_MIME.docx);
  });
});
