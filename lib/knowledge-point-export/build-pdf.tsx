/**
 * PDF export for knowledge points. Loaded on demand via dynamic import() from a client component.
 *
 * Descriptions are markdown, parsed with remark-parse (CommonMark, same subset that
 * react-markdown renders in the UI) and converted to @react-pdf/renderer elements.
 *
 * Uses Noto Sans (Latin) from /public/fonts, falling back to Noto Sans SC per glyph
 * for CJK text (Noto Sans SC lacks IPA glyphs used by phonetics).
 */

import type { ReactNode } from 'react';
import { Document, Font, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { PhrasingContent, Root, RootContent } from 'mdast';
import { containsCjk, formatLocalDate } from '@/lib/sentence-export';
import {
  groupByCategory,
  type KnowledgePointExportInput,
} from '@/lib/knowledge-point-export';

const FONT_LATIN = 'NotoSans';
const FONT_CJK = 'NotoSansSC';

Font.register({
  family: FONT_LATIN,
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 700 },
  ],
});
Font.register({
  family: FONT_CJK,
  fonts: [
    { src: '/fonts/NotoSansSC-Regular.otf', fontWeight: 400 },
    { src: '/fonts/NotoSansSC-Bold.otf', fontWeight: 700 },
  ],
});
// Never hyphenate words across lines.
Font.registerHyphenationCallback((word) => [word]);

const markdownParser = unified().use(remarkParse);

// Category badge colors matching KNOWLEDGE_POINT_CATEGORIES colorClass (bg-*-200 / text-*-900).
const CATEGORY_COLORS: Record<string, { background: string; text: string }> = {
  word: { background: '#BFDBFE', text: '#1E3A8A' },
  phrase: { background: '#BBF7D0', text: '#14532D' },
  sentence: { background: '#E9D5FF', text: '#6B21A8' },
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, lineHeight: 1.5, color: '#111827' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#6B7280', marginBottom: 16 },
  groupHeader: { marginTop: 10, marginBottom: 6 },
  groupBadge: {
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  item: { marginBottom: 10 },
  captured: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  paragraph: { marginBottom: 4 },
  heading: { fontWeight: 700, marginTop: 6, marginBottom: 3 },
  bold: { fontWeight: 700 },
  italic: { fontStyle: 'italic' },
  strikethrough: { textDecoration: 'line-through' },
  inlineCode: { fontSize: 10, backgroundColor: '#F3F4F6' },
  codeBlock: {
    fontSize: 10,
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
    paddingLeft: 8,
    marginBottom: 4,
    color: '#4B5563',
  },
  list: { marginBottom: 4 },
  listRow: { flexDirection: 'row', marginBottom: 2 },
  listBullet: { width: 14 },
  listContent: { flex: 1 },
  link: { color: '#2563EB', textDecoration: 'underline' },
  hr: { borderBottomWidth: 1, borderBottomColor: '#D1D5DB', marginVertical: 6 },
});

const HEADING_SIZES: Record<number, number> = { 1: 16, 2: 14, 3: 13, 4: 12, 5: 11, 6: 11 };

function renderInline(nodes: PhrasingContent[]): ReactNode[] {
  return nodes.map((node, index) => {
    const key = index;
    switch (node.type) {
      case 'text':
        return node.value;
      case 'strong':
        return (
          <Text key={key} style={styles.bold}>
            {renderInline(node.children)}
          </Text>
        );
      case 'emphasis':
        return (
          <Text key={key} style={styles.italic}>
            {renderInline(node.children)}
          </Text>
        );
      case 'delete':
        return (
          <Text key={key} style={styles.strikethrough}>
            {renderInline(node.children)}
          </Text>
        );
      case 'inlineCode':
        return (
          <Text key={key} style={styles.inlineCode}>
            {node.value}
          </Text>
        );
      case 'link':
        return (
          <Link key={key} src={node.url} style={styles.link}>
            {renderInline(node.children)}
          </Link>
        );
      case 'image':
        return node.alt ? `[${node.alt}]` : null;
      case 'break':
        return '\n';
      case 'html':
        return null;
      default:
        // Footnote references, MDX nodes, etc. — nothing the in-app ReactMarkdown renders either.
        return null;
    }
  });
}

function renderBlocks(nodes: RootContent[]): ReactNode[] {
  return nodes.map((node, index) => {
    const key = index;
    switch (node.type) {
      case 'paragraph':
        return (
          <Text key={key} style={styles.paragraph}>
            {renderInline(node.children)}
          </Text>
        );
      case 'heading':
        return (
          <Text key={key} style={[styles.heading, { fontSize: HEADING_SIZES[node.depth] ?? 11 }]}>
            {renderInline(node.children)}
          </Text>
        );
      case 'list': {
        const start = node.start ?? 1;
        return (
          <View key={key} style={styles.list}>
            {node.children.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.listRow}>
                <Text style={styles.listBullet}>
                  {node.ordered ? `${start + itemIndex}.` : '•'}
                </Text>
                <View style={styles.listContent}>{renderBlocks(item.children)}</View>
              </View>
            ))}
          </View>
        );
      }
      case 'blockquote':
        return (
          <View key={key} style={styles.quote}>
            {renderBlocks(node.children)}
          </View>
        );
      case 'code':
        return (
          <View key={key} style={styles.codeBlock}>
            <Text>{node.value}</Text>
          </View>
        );
      case 'thematicBreak':
        return <View key={key} style={styles.hr} />;
      default:
        // html, definition, footnoteDefinition — not rendered by the in-app ReactMarkdown either.
        return null;
    }
  });
}

function Markdown({ children }: { children: string }) {
  const tree = markdownParser.parse(children) as Root;
  return <View>{renderBlocks(tree.children)}</View>;
}

function KnowledgePointsPdf({ title, exportedAt, knowledgePoints }: KnowledgePointExportInput) {
  const hasCjk =
    containsCjk(title) ||
    knowledgePoints.some((kp) => containsCjk(kp.capturedText) || containsCjk(kp.description));
  // NotoSansSC has no IPA glyphs (phonetics like /krɪˈeɪʃn/ render as garbage), so keep
  // NotoSans first and let CJK characters fall back to NotoSansSC per glyph.
  const fontFamily = hasCjk ? [FONT_LATIN, FONT_CJK] : FONT_LATIN;
  const groups = groupByCategory(knowledgePoints);

  return (
    <Document title={title}>
      <Page size="A4" wrap style={[styles.page, { fontFamily }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Knowledge Points · Exported on {formatLocalDate(exportedAt)} · {knowledgePoints.length} items
        </Text>
        {groups.map((group) => {
          const colors = CATEGORY_COLORS[group.category];
          return (
            <View key={group.category}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupBadge, { backgroundColor: colors.background, color: colors.text }]}>
                  {group.label} ({group.items.length})
                </Text>
              </View>
              {group.items.map((kp) => (
                <View key={kp.knowledgePointId} style={styles.item}>
                  <Text style={styles.captured}>{kp.capturedText}</Text>
                  <Markdown>{kp.description}</Markdown>
                </View>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function build(input: KnowledgePointExportInput): Promise<Blob> {
  const blob = await pdf(<KnowledgePointsPdf {...input} />).toBlob();
  return blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
}
