/**
 * TypeScript Type Definitions for English Listening Dictation Practice App
 * Based on data-model.md entity definitions
 */

// ===== USER ENTITIES =====

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  registrationDate: Date;
  lastLoginDate?: Date;
  isActive: boolean;
}

export interface InvitationCode {
  codeId: string;
  code: string;
  createdDate: Date;
  expiryDate: Date;
  isUsed: boolean;
  usedByUserId?: string;
}

// ===== CONTENT ENTITIES =====

export interface Series {
  seriesId: string;
  title: string;
  description?: string;
  genre?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  coverImageUrl?: string;
  totalEpisodes: number;
  createdDate: Date;
  updatedDate: Date;
}

export interface Season {
  seasonId: string;
  seriesId: string;
  seasonNumber: number;
  description?: string;
  totalEpisodes: number;
  createdDate: Date;
}

export interface Episode {
  episodeId: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  totalExercises: number;
  createdDate: Date;
}

export interface Exercise {
  exerciseId: string;
  episodeId: string;
  title: string;
  videoUrl: string;
  subtitleUrl: string;
  subtitleFormat: 'srt' | 'vtt' | 'ssa' | 'ass';
  totalSentences: number;
  durationSeconds: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdDate: Date;
  updatedDate: Date;
}

// ===== PROGRESS & PRACTICE ENTITIES =====

export interface UserExerciseProgress {
  progressId: string;
  userId: string;
  exerciseId: string;
  currentSentenceIndex: number;
  isCompleted: boolean;
  lastAttemptDate?: Date;
  createdDate: Date;
  updatedDate: Date;
}

export interface UserDictationAttempt {
  attemptId: string;
  progressId: string;
  sentenceIndex: number;
  userInput: string;
  correctAnswer: string;
  accuracy: number;
  wordFeedback: WordFeedback[];
  attemptDate: Date;
}

export interface WordFeedback {
  correctWord: string;
  userWord: string;
  status: 'correct' | 'acceptable' | 'wrong' | 'missing';
}

// ===== CONFIGURATION ENTITIES =====

export interface UserSubtitleConfig {
  configId: string;
  userId: string;
  exerciseId: string;
  mergedGroups: string; // JSON string in database
  skippedSentences: string; // JSON string in database
  createdDate: Date;
  updatedDate: Date;
}

export interface MergeGroup {
  startIndex: number;
  endIndex: number;
  label?: string;
  customText?: string;
}

// ===== SUBTITLE PARSING =====

export interface ParsedSubtitle {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  startTime: string;
  endTime: string;
  isMerged?: boolean;
  isSkipped?: boolean;
}

export interface EffectiveSubtitle extends ParsedSubtitle {
  originalIndices: number[];
  isMerged: boolean;
  isSkipped: boolean;
  isLocked?: boolean;
}

// ===== API REQUEST/RESPONSE TYPES =====

// Authentication
export interface RegisterRequest {
  code: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  token: string;
  email: string;
  role: 'admin' | 'user';
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  statusCode: number;
}

// Exercise Browsing
export interface SeriesInfo {
  seriesId: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalEpisodes: number;
  coverImageUrl?: string;
  seasons: SeasonInfo[];
}

export interface SeasonInfo {
  seasonId: string;
  seasonNumber: number;
  description?: string;
  episodes: EpisodeInfo[];
}

export interface EpisodeInfo {
  episodeId: string;
  episodeNumber: number;
  title: string;
  exercises: ExerciseMetadata[];
}

export interface ExerciseMetadata {
  exerciseId: string;
  title?: string;
  durationSeconds: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  totalSentences: number;
  userProgress?: {
    currentSentenceIndex: number;
    isCompleted: boolean;
  };
}

export interface ExerciseListResponse {
  series: SeriesInfo[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Practice Routes
export interface CheckAccuracyRequest {
  sentenceIndex: number;
  userInput: string;
}

export interface CheckAccuracyResponse {
  accuracy: number;
  userInput: string;
  correctAnswer: string;
  wordFeedback: WordFeedback[];
}

export interface SaveProgressRequest {
  sentenceIndex: number;
  userInput: string;
  accuracy: number;
  wordFeedback: WordFeedback[];
  isCompleted?: boolean;
}

export interface SaveProgressResponse {
  success: boolean;
  progressId: string;
  currentSentenceIndex: number;
  isCompleted: boolean;
  overallAccuracy?: number;
}

// Subtitle Configuration
export interface SubtitleConfigRequest {
  mergedGroups: MergeGroup[];
  skippedSentences: number[];
}

export interface SubtitleConfigResponse {
  configId: string;
  mergedGroups: MergeGroup[];
  skippedSentences: number[];
  currentProgress: number;
  editableFrom: number;
}

export interface PracticeContentResponse {
  exerciseId: string;
  videoUrl: string;
  subtitles: ParsedSubtitle[];
  userProgress?: {
    currentSentenceIndex: number;
    isCompleted: boolean;
  };
}

// ===== PAGINATION & FILTERING =====

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterOptions {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  seriesId?: string;
  seasonId?: string;
  episodeId?: string;
}

// ===== UTILITY TYPES =====

export interface ApiResponse<T> {
  data?: T;
  error?: ErrorResponse;
  success: boolean;
  timestamp: Date;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

export interface CosConfig {
  region: string;
  bucket: string;
  secretId: string;
  secretKey: string;
}

// ===== ENVIRONMENT VARIABLES TYPE =====

export interface EnvironmentVariables {
  DATABASE_URL: string;
  COS_REGION: string;
  COS_BUCKET: string;
  COS_SECRET_ID: string;
  COS_SECRET_KEY: string;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}
