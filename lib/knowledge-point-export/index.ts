/**
 * Lightweight helpers shared by the knowledge points export flow.
 *
 * IMPORTANT: this module must NOT import `@react-pdf/renderer`.
 * It is loaded on demand from ./build-pdf when the user exports.
 */

import type { KnowledgePoint, KnowledgePointCategoryConfig } from '@/lib/types';
import { KNOWLEDGE_POINT_CATEGORIES } from '@/lib/types';
import { formatLocalDate, sanitizeExportTitle } from '@/lib/sentence-export';

export interface KnowledgePointExportInput {
  title: string;
  exportedAt: Date;
  knowledgePoints: KnowledgePoint[];
}

export interface KnowledgePointGroup extends KnowledgePointCategoryConfig {
  items: KnowledgePoint[];
}

/** Group knowledge points by category, in KNOWLEDGE_POINT_CATEGORIES order, empty groups dropped. */
export function groupByCategory(knowledgePoints: KnowledgePoint[]): KnowledgePointGroup[] {
  return KNOWLEDGE_POINT_CATEGORIES.map((config) => ({
    ...config,
    items: knowledgePoints.filter((kp) => kp.category === config.category),
  })).filter((group) => group.items.length > 0);
}

/** Build `<title>-知识点-YYYY-MM-DD.pdf` with a filesystem-safe title. */
export function buildKnowledgePointExportFilename(title: string, date: Date): string {
  return `${sanitizeExportTitle(title)}-知识点-${formatLocalDate(date)}.pdf`;
}
