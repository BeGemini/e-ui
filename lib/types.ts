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
  overallAccuracy?: number | null;
  completedDate?: Date | null;
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
  effectiveSentenceCount?: number | null; // Effective sentence count after merge/skip
  createdDate: Date;
  updatedDate: Date;
}

export interface MergeGroup {
  startIndex: number;
  endIndex: number;
  label?: string;
  customText?: string;
  /** @deprecated Legacy field used during migration */
  start?: number;
  /** @deprecated Legacy field used during migration */
  end?: number;
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

// POST /api/practice/[exerciseId]/save-attempt request body
export interface SaveAttemptRequest {
  sentenceIndex: number; // integer, >= 0
  userInput: string; // non-empty after trim
  correctText: string; // original sentence snapshot, non-empty
  accuracy: number; // 0–100
  wordFeedback?: WordFeedback[];
}

// One saved sentence in "My Sentences"
export interface MySentence {
  sentenceIndex: number; // 0-based
  userInput: string; // empty string means the sentence was skipped
  correctAnswer: string; // original sentence snapshot
  savedAt: string; // ISO 8601
}

// GET /api/practice/[exerciseId]/sentences response
export interface MySentencesResponse {
  success: true;
  exercise: { exerciseId: string; title: string };
  sentences: MySentence[]; // ascending by sentenceIndex, at most one per index
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

// ===== KNOWLEDGE POINT ENTITIES =====

export type KnowledgePointCategory = 'word' | 'phrase' | 'sentence';

export interface KnowledgePointCategoryConfig {
  category: KnowledgePointCategory;
  label: string;
  colorClass: string;
  fallbackColor: string;
}

export interface KnowledgePoint {
  knowledgePointId: string;
  userId: string;
  exerciseId: string;
  sourceSentenceIndex: number;
  capturedText: string;
  category: KnowledgePointCategory;
  description: string;
  createdDate: string;
  updatedDate: string;
}

export interface KnowledgePointCreateRequest {
  sourceSentenceIndex: number;
  capturedText: string;
  category: KnowledgePointCategory;
  description: string;
}

export interface KnowledgePointUpdateRequest {
  category?: KnowledgePointCategory;
  description?: string;
}

export interface ExerciseWithKnowledgePointCount {
  knowledgePointCount: number;
}

// ===== AI KNOWLEDGE POINT TEACHING =====

export interface AiKnowledgePointTeachRequest {
  capturedText: string;
  category: KnowledgePointCategory;
  sourceSentence: string;
}

export interface AiKnowledgePointTeachResponse {
  explanation: string;
}

export interface DeepSeekMessage {
  role: 'system' | 'user';
  content: string;
}

export interface DeepSeekChoice {
  message: DeepSeekMessage;
  index: number;
  finish_reason: string;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
}

// Knowledge point category colors (application constants)
export const KNOWLEDGE_POINT_CATEGORIES: KnowledgePointCategoryConfig[] = [
  { category: 'word', label: 'Word', colorClass: 'bg-blue-200 text-blue-900', fallbackColor: '#bfdbfe' },
  { category: 'phrase', label: 'Phrase', colorClass: 'bg-green-200 text-green-900', fallbackColor: '#bbf7d0' },
  { category: 'sentence', label: 'Sentence', colorClass: 'bg-purple-200 text-purple-900', fallbackColor: '#e9d5ff' },
];

export const KNOWLEDGE_POINT_CATEGORY_MAP: Record<KnowledgePointCategory, KnowledgePointCategoryConfig> = {
  word: KNOWLEDGE_POINT_CATEGORIES[0],
  phrase: KNOWLEDGE_POINT_CATEGORIES[1],
  sentence: KNOWLEDGE_POINT_CATEGORIES[2],
};

// ===== ADMIN CONTENT MANAGEMENT =====

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ProbeErrorCode =
  | 'INVALID_KEY'
  | 'FOREIGN_HOST'
  | 'UNSUPPORTED_EXTENSION'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'FETCH_FAILED'
  | 'NOT_ISO_BMFF'
  | 'DURATION_UNREADABLE'
  | 'NOT_UTF8'
  | 'PARSE_FAILED'
  | 'EMPTY_SUBTITLE'
  | 'SUBTITLE_EXCEEDS_VIDEO';

export interface ProbeIssue {
  code: ProbeErrorCode;
  message: string;
}

export interface VideoProbe {
  key: string;
  ok: boolean;
  durationSeconds?: number;
  error?: ProbeIssue;
}

export interface SubtitleProbe {
  key: string;
  ok: boolean;
  subtitleFormat?: Exercise['subtitleFormat'];
  totalSentences?: number;
  lastCueEndSeconds?: number;
  error?: ProbeIssue;
}

export interface ExerciseProbeResult {
  ok: boolean;
  video: VideoProbe;
  subtitle: SubtitleProbe;
  warnings: ProbeIssue[];
}

export interface AdminExerciseNode {
  exerciseId: string;
  title: string;
  subtitleFormat: Exercise['subtitleFormat'];
  totalSentences: number;
  durationSeconds: number;
}

export interface AdminEpisodeNode {
  episodeId: string;
  episodeNumber: number;
  title: string;
  totalExercises: number;
  exercises: AdminExerciseNode[];
}

export interface AdminSeasonNode {
  seasonId: string;
  seasonNumber: number;
  totalEpisodes: number;
  episodes: AdminEpisodeNode[];
}

export interface AdminSeriesNode {
  seriesId: string;
  title: string;
  difficulty: Difficulty;
  totalEpisodes: number;
  seasons: AdminSeasonNode[];
}

export interface AdminContentTree {
  series: AdminSeriesNode[];
}

export interface AdminSeriesCreateRequest {
  title: string;
  difficulty: Difficulty;
  description?: string;
  genre?: string;
  coverImageUrl?: string;
}

export interface AdminSeasonCreateRequest {
  seriesId: string;
  seasonNumber: number;
  description?: string;
}

export interface AdminEpisodeCreateRequest {
  seasonId: string;
  episodeNumber: number;
  title: string;
  description?: string;
}

export interface AdminExerciseProbeRequest {
  videoUrl: string;
  subtitleUrl: string;
}

export interface AdminExerciseCreateRequest extends AdminExerciseProbeRequest {
  episodeId: string;
  title: string;
  difficulty?: Difficulty | null;
}

export interface AdminErrorResponse {
  error: string;
  field?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface AdminExerciseCreateResponse {
  exerciseId: string;
  probe: ExerciseProbeResult;
}
