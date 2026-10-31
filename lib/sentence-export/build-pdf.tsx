/**
 * PDF export for "My Sentences". Loaded on demand via dynamic import() from a client component.
 *
 * Uses Noto Sans (Latin) from /public/fonts so curly quotes, dashes and ellipses render correctly.
 * CJK text is not supported yet: no CJK font is bundled (see plan risk 3).
 */

import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import {
  EXPORT_MIME,
  ORIGINAL_BG_HEX,
  ORIGINAL_TEXT_HEX,
  formatLocalDate,
  type SentenceExportInput,
} from '@/lib/sentence-export';

const FONT_FAMILY = 'NotoSans';

Font.register({
  family: FONT_FAMILY,
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 700 },
  ],
});
// Never hyphenate English words across lines.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: FONT_FAMILY, fontSize: 12, color: '#111827' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6B7280', marginBottom: 16 },
  block: { marginBottom: 10 },
  skipped: { color: '#9CA3AF' },
  original: {
    marginTop: 4,
    backgroundColor: `#${ORIGINAL_BG_HEX}`,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 3,
  },
  originalText: { color: `#${ORIGINAL_TEXT_HEX}` },
});

function SentencesPdf({ title, exportedAt, includeOriginal, sentences }: SentenceExportInput) {
  return (
    <Document title={title}>
      <Page size="A4" wrap style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          My Sentences · Exported on {formatLocalDate(exportedAt)}
        </Text>
        {sentences.map((sentence) => (
          <View key={sentence.sentenceIndex} wrap={false} style={styles.block}>
            {sentence.userInput ? (
              <Text>{sentence.userInput}</Text>
            ) : (
              <Text style={styles.skipped}>(Skipped)</Text>
            )}
            {includeOriginal && (
              <View style={styles.original}>
                <Text style={styles.originalText}>{sentence.correctAnswer}</Text>
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function build(input: SentenceExportInput): Promise<Blob> {
  const blob = await pdf(<SentencesPdf {...input} />).toBlob();
  return blob.type ? blob : new Blob([blob], { type: EXPORT_MIME.pdf });
}
