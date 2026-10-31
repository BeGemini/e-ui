/**
 * DOCX export for "My Sentences". Loaded on demand via dynamic import().
 */

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';
import {
  EXPORT_MIME,
  ORIGINAL_BG_HEX,
  ORIGINAL_TEXT_HEX,
  formatLocalDate,
  type SentenceExportInput,
} from '@/lib/sentence-export';

const SUBTITLE_COLOR = '6B7280';
const SKIPPED_COLOR = '9CA3AF';
// docx units: font size in half-points, spacing/indent in twips (1pt = 20 twips).
const PT = 20;

export function createDocument(input: SentenceExportInput): Document {
  const { title, exportedAt, includeOriginal, sentences } = input;

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(title)],
    }),
    new Paragraph({
      spacing: { after: 16 * PT },
      children: [
        new TextRun({
          text: `My Sentences · Exported on ${formatLocalDate(exportedAt)}`,
          size: 20,
          color: SUBTITLE_COLOR,
        }),
      ],
    }),
  ];

  for (const sentence of sentences) {
    children.push(
      new Paragraph({
        keepNext: includeOriginal,
        spacing: includeOriginal ? { after: 2 * PT } : { after: 10 * PT },
        children: [
          sentence.userInput
            ? new TextRun({ text: sentence.userInput, size: 24 })
            : new TextRun({ text: '(Skipped)', italics: true, size: 24, color: SKIPPED_COLOR }),
        ],
      })
    );

    if (includeOriginal) {
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: ORIGINAL_BG_HEX, color: 'auto' },
          indent: { left: 6 * PT, right: 6 * PT },
          spacing: { after: 10 * PT },
          children: [
            new TextRun({
              text: sentence.correctAnswer,
              size: 24,
              color: ORIGINAL_TEXT_HEX,
            }),
          ],
        })
      );
    }
  }

  return new Document({
    title,
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: 'Microsoft YaHei' },
          },
        },
      },
    },
    sections: [{ children }],
  });
}

export async function build(input: SentenceExportInput): Promise<Blob> {
  const blob = await Packer.toBlob(createDocument(input));
  return blob.type ? blob : new Blob([blob], { type: EXPORT_MIME.docx });
}
