/**
 * Dictation attempt persistence shared by the practice API routes.
 *
 * Every learner keeps at most ONE attempt per sentence: UserDictationAttempt has
 * UNIQUE(progressId, sentenceIndex) (migration 005), and all writes go through
 * `upsertAttempt` so later saves (Check / Next / Skip) overwrite the earlier one.
 */

import { v4 as uuidv4 } from 'uuid';
import { execute, query, queryOne } from '@/lib/db';
import type { MySentence, UserExerciseProgress, WordFeedback } from '@/lib/types';

/**
 * Return the learner's progress row for an exercise, creating it on first use.
 * Relies on the existing UNIQUE(userId, exerciseId) so concurrent first saves
 * only ever create a single row.
 */
export async function getOrCreateProgress(
  userId: string,
  exerciseId: string
): Promise<UserExerciseProgress> {
  await execute(
    `INSERT INTO UserExerciseProgress (progressId, userId, exerciseId, currentSentenceIndex, isCompleted)
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE progressId = progressId`,
    [uuidv4(), userId, exerciseId]
  );

  const progress = await queryOne<UserExerciseProgress>(
    'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
    [userId, exerciseId]
  );

  if (!progress) {
    throw new Error('Could not initialize exercise progress');
  }

  return progress;
}

export interface UpsertAttemptParams {
  progressId: string;
  sentenceIndex: number;
  userInput: string;
  correctAnswer: string;
  accuracy: number;
  wordFeedback: WordFeedback[];
}

/**
 * Insert the attempt for a sentence, or overwrite the existing one.
 * On overwrite the original attemptId is kept and attemptDate is refreshed.
 *
 * Note: MySQL 8.0.20+ only emits a deprecation warning for `VALUES()` in
 * ON DUPLICATE KEY UPDATE; it still works. Switch to the row-alias syntax
 * if a future MySQL version removes it.
 */
export async function upsertAttempt(params: UpsertAttemptParams): Promise<void> {
  await execute(
    `INSERT INTO UserDictationAttempt (attemptId, progressId, sentenceIndex, userInput, correctAnswer, accuracy, wordFeedback, attemptDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE userInput = VALUES(userInput), correctAnswer = VALUES(correctAnswer),
       accuracy = VALUES(accuracy), wordFeedback = VALUES(wordFeedback), attemptDate = NOW()`,
    [
      uuidv4(),
      params.progressId,
      params.sentenceIndex,
      params.userInput,
      params.correctAnswer,
      params.accuracy,
      JSON.stringify(params.wordFeedback),
    ]
  );
}

interface MySentenceRow {
  sentenceIndex: number;
  userInput: string | null;
  correctAnswer: string | null;
  attemptDate: Date | string;
}

/**
 * List the current learner's saved sentences for an exercise, ascending by sentenceIndex.
 * Always filtered by the session user; never accepts another userId from the client.
 */
export async function listMySentences(
  userId: string,
  exerciseId: string
): Promise<MySentence[]> {
  const rows = await query<MySentenceRow>(
    `SELECT a.sentenceIndex, a.userInput, a.correctAnswer, a.attemptDate
     FROM UserDictationAttempt a
     JOIN UserExerciseProgress p ON p.progressId = a.progressId
     WHERE p.userId = ? AND p.exerciseId = ?
       -- Keep only the latest attempt per sentence (same rule as migration 005),
       -- so legacy duplicates never surface even before the migration runs.
       AND NOT EXISTS (
         SELECT 1 FROM UserDictationAttempt newer
         WHERE newer.progressId = a.progressId
           AND newer.sentenceIndex = a.sentenceIndex
           AND (newer.attemptDate > a.attemptDate
                OR (newer.attemptDate = a.attemptDate AND newer.attemptId > a.attemptId))
       )
     ORDER BY a.sentenceIndex ASC`,
    [userId, exerciseId]
  );

  return rows.map((row) => ({
    sentenceIndex: Number(row.sentenceIndex),
    userInput: row.userInput ?? '',
    correctAnswer: row.correctAnswer ?? '',
    savedAt: new Date(row.attemptDate).toISOString(),
  }));
}
