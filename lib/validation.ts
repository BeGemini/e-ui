/**
 * Security & Validation Schema
 * Implements input validation for all API endpoints
 */

import { z } from 'zod';
import type { KnowledgePointCategory } from './types';

/**
 * Auth Schemas
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  invitationCode: z.string().min(1, 'Invitation code required'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

/**
 * Practice Schemas
 */
export const CheckAccuracySchema = z.object({
  sentenceIndex: z.number().min(0, 'Invalid sentence index'),
  userInput: z.string(),
  correctText: z.string(),
});

export const SaveProgressSchema = z.object({
  sentenceIndex: z.number().min(0, 'Invalid sentence index'),
  accuracy: z.number().min(0).max(100, 'Accuracy must be 0-100'),
  isCompleted: z.boolean().default(false),
});

/**
 * Subtitle Config Schemas
 */
export const MergeGroupSchema = z.object({
  startIndex: z.number().min(0, 'Start index must be >= 0'),
  endIndex: z.number().min(0, 'End index must be >= 0'),
  label: z.string().max(100, 'Label too long').optional(),
  customText: z.string().max(2000, 'Custom text too long').optional(),
});

export const SubtitleConfigSchema = z.object({
  mergedGroups: z.array(MergeGroupSchema).default([]),
  skippedSentences: z.array(z.number()).default([]),
});

/**
 * Knowledge Point Schemas
 */
export const KnowledgePointCategorySchema: z.ZodType<KnowledgePointCategory> = z.enum([
  'word',
  'phrase',
  'sentence',
]);

export const KnowledgePointCreateSchema = z.object({
  sourceSentenceIndex: z.number().int().min(0, 'Invalid sentence index'),
  capturedText: z.string().min(1, 'Captured text is required').max(500, 'Captured text too long'),
  category: KnowledgePointCategorySchema,
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
});

export const KnowledgePointUpdateSchema = z.object({
  category: KnowledgePointCategorySchema.optional(),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long').optional(),
}).refine((data) => data.category !== undefined || data.description !== undefined, {
  message: 'At least one field (category or description) must be provided',
});

export const AiKnowledgePointTeachSchema = z.object({
  capturedText: z.string().min(1, 'Captured text is required').max(500, 'Captured text too long'),
  category: KnowledgePointCategorySchema,
  sourceSentence: z.string().max(2000, 'Source sentence too long'),
});

/**
 * Validate function with error handling
 */
export async function validate<T>(schema: z.ZodSchema, data: unknown): Promise<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = (result.error as { issues?: { message: string }[] }).issues ?? [];
    throw new Error(`Validation error: ${issues.map((e) => e.message).join(', ')}`);
  }
  return result.data as T;
}

/**
 * Admin Content Management Schemas
 */
const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'], { message: 'Select a difficulty' });

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const positiveInt = (label: string) =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a positive integer`)
    .positive(`${label} must be a positive integer`);

const requiredText = (max: number, label: string) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const parentId = (label: string) => z.string({ message: `Select a ${label}` }).uuid(`Select a ${label}`);

export const AdminSeriesCreateSchema = z.object({
  title: requiredText(255, 'Title'),
  difficulty: DifficultySchema,
  description: optionalText(5000, 'Description'),
  genre: optionalText(100, 'Genre'),
  coverImageUrl: z
    .string()
    .trim()
    .max(500, 'Cover image URL must be at most 500 characters')
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^https?:\/\/\S+$/i.test(v), 'Cover image URL must be an http(s) link'),
});

export const AdminSeasonCreateSchema = z.object({
  seriesId: parentId('series'),
  seasonNumber: positiveInt('Season number'),
  description: optionalText(5000, 'Description'),
});

export const AdminEpisodeCreateSchema = z.object({
  seasonId: parentId('season'),
  episodeNumber: positiveInt('Episode number'),
  title: requiredText(255, 'Title'),
  description: optionalText(5000, 'Description'),
});

export const AdminExerciseProbeSchema = z.object({
  videoUrl: requiredText(500, 'Video'),
  subtitleUrl: requiredText(500, 'Subtitle'),
});

export const AdminExerciseCreateSchema = AdminExerciseProbeSchema.extend({
  episodeId: parentId('episode'),
  title: requiredText(255, 'Title'),
  difficulty: DifficultySchema.nullish(),
});
