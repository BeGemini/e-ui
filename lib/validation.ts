/**
 * Security & Validation Schema
 * Implements input validation for all API endpoints
 */

import { z } from 'zod';

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
  label: z.string().min(1, 'Label required').max(100, 'Label too long'),
});

export const SubtitleConfigSchema = z.object({
  mergedGroups: z.array(MergeGroupSchema).default([]),
  skippedSentences: z.array(z.number()).default([]),
});

/**
 * Validate function with error handling
 */
export async function validate<T>(schema: z.ZodSchema, data: unknown): Promise<T> {
  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}
