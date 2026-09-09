import { query, queryOne } from './db';
import { UserExerciseProgress, UserDictationAttempt, UserSubtitleConfig } from './types';

/**
 * Calculate exercise completion summary
 * Includes overall accuracy, completion stats, and performance metrics
 */
export async function calculateExerciseSummary(progressId: string, exerciseId: string, userId: string) {
  try {
    // Get all attempts for this progress
    const attemptsList = await query<any>(
      'SELECT * FROM UserDictationAttempt WHERE progressId = ? ORDER BY sentenceIndex',
      [progressId]
    );

    const attempts = (Array.isArray(attemptsList) ? attemptsList : []) as UserDictationAttempt[];

    if (attempts.length === 0) {
      return {
        totalSentences: 0,
        completedSentences: 0,
        skippedSentences: 0,
        overallAccuracy: 0,
        accuracyTrend: [],
      };
    }

    // Get user's subtitle config
    const configResult = await queryOne<any>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [userId, exerciseId]
    );

    const config = configResult as UserSubtitleConfig | null;
    const skippedSentencesList = config?.skippedSentences
      ? (Array.isArray(config.skippedSentences) ? config.skippedSentences : JSON.parse(config.skippedSentences as any))
      : [];

    // Calculate metrics
    let totalAccuracy = 0;
    let countedAttempts = 0;
    const accuracyTrend = [];

    for (const attempt of attempts) {
      // Skip if sentence was skipped
      if (!skippedSentencesList.includes(attempt.sentenceIndex)) {
        totalAccuracy += attempt.accuracy;
        countedAttempts++;
        accuracyTrend.push({
          sentenceIndex: attempt.sentenceIndex,
          accuracy: attempt.accuracy,
          timestamp: attempt.attemptDate,
        });
      }
    }

    const overallAccuracy = countedAttempts > 0 ? Math.round(totalAccuracy / countedAttempts) : 0;

    return {
      totalSentences: attempts.length,
      completedSentences: countedAttempts,
      skippedSentences: skippedSentencesList.length,
      overallAccuracy,
      accuracyTrend,
    };
  } catch (error) {
    console.error('Error calculating exercise summary:', error);
    return {
      totalSentences: 0,
      completedSentences: 0,
      skippedSentences: 0,
      overallAccuracy: 0,
      accuracyTrend: [],
    };
  }
}

/**
 * Get completion statistics for user across all exercises
 */
export async function getUserStatistics(userId: string) {
  try {
    const progressListResult = await query<any>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ?',
      [userId]
    );

    const progressRecords = (Array.isArray(progressListResult) ? progressListResult : []) as UserExerciseProgress[];

    const completedExercises = progressRecords.filter((p: any) => p.isCompleted).length;
    const inProgressExercises = progressRecords.filter(
      (p: any) => !p.isCompleted && (p.currentSentenceIndex ?? 0) > 0
    ).length;
    const averageAccuracy =
      progressRecords.length > 0
        ? Math.round(
            progressRecords.reduce((sum: number, p: any) => sum + (p.overallAccuracy ?? 0), 0) /
              progressRecords.length
          )
        : 0;

    return {
      totalExercisesStarted: progressRecords.length,
      completedExercises,
      inProgressExercises,
      averageAccuracy,
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      totalExercisesStarted: 0,
      completedExercises: 0,
      inProgressExercises: 0,
      averageAccuracy: 0,
    };
  }
}
