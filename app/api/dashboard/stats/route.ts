import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, query, queryOne, queryValue } from '@/lib/db';

interface AttemptTodayRow {
  attemptDate: Date | string;
  accuracy: number | string;
}

interface TrendRow {
  day: string;
  sentences: number;
  avgAccuracy: number | string | null;
}

interface DayRow {
  day: string;
}

interface ContinueRow {
  exerciseId: string;
  title: string;
  seriesTitle: string;
  episodeNumber: number;
  currentSentenceIndex: number;
  totalSentences: number;
  lastAttemptDate: Date | string;
}

// Practice time is not tracked directly, so estimate it from attempt
// timestamps: each attempt accounts for the gap since the previous one,
// capped to ignore idle time away from the page.
const FIRST_ATTEMPT_SECONDS = 15;
const MAX_GAP_SECONDS = 60;

function estimatePracticeSeconds(timestamps: number[]): number {
  let total = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (i === 0) {
      total += FIRST_ATTEMPT_SECONDS;
      continue;
    }
    const gap = (timestamps[i] - timestamps[i - 1]) / 1000;
    if (gap > 0) {
      total += Math.min(gap, MAX_GAP_SECONDS);
    }
  }
  return Math.round(total);
}

function computeStreakDays(daysDesc: string[], today: string): number {
  if (daysDesc.length === 0) return 0;

  const toDate = (day: string) => new Date(`${day}T00:00:00Z`).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const latest = daysDesc[0];
  const gapToToday = Math.round((toDate(today) - toDate(latest)) / DAY_MS);
  // A streak survives until the end of today even if nothing was practiced yet.
  if (gapToToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < daysDesc.length; i++) {
    const gap = Math.round((toDate(daysDesc[i - 1]) - toDate(daysDesc[i])) / DAY_MS);
    if (gap !== 1) break;
    streak++;
  }
  return streak;
}

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.userId;

    const [
      todayRow,
      todayAttempts,
      todayNotes,
      trendRows,
      activeDays,
      totalSentences,
      totalNotes,
      completedExercises,
      continueRows,
      lastPracticedRow,
    ] = await Promise.all([
      queryValue<string>(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today`),
      query<AttemptTodayRow>(
        `SELECT a.attemptDate, a.accuracy
         FROM UserDictationAttempt a
         JOIN UserExerciseProgress p ON p.progressId = a.progressId
         WHERE p.userId = ? AND DATE(a.attemptDate) = CURDATE()
         ORDER BY a.attemptDate ASC`,
        [userId]
      ),
      queryValue<number>(
        'SELECT COUNT(*) AS cnt FROM Note WHERE userId = ? AND DATE(createdDate) = CURDATE()',
        [userId]
      ),
      query<TrendRow>(
        `SELECT DATE_FORMAT(a.attemptDate, '%Y-%m-%d') AS day,
                COUNT(*) AS sentences,
                ROUND(AVG(a.accuracy), 1) AS avgAccuracy
         FROM UserDictationAttempt a
         JOIN UserExerciseProgress p ON p.progressId = a.progressId
         WHERE p.userId = ? AND a.attemptDate >= CURDATE() - INTERVAL 6 DAY
         GROUP BY DATE_FORMAT(a.attemptDate, '%Y-%m-%d')
         ORDER BY day ASC`,
        [userId]
      ),
      query<DayRow>(
        `SELECT DISTINCT DATE_FORMAT(a.attemptDate, '%Y-%m-%d') AS day
         FROM UserDictationAttempt a
         JOIN UserExerciseProgress p ON p.progressId = a.progressId
         WHERE p.userId = ?
         ORDER BY day DESC
         LIMIT 400`,
        [userId]
      ),
      queryValue<number>(
        `SELECT COUNT(*) AS cnt
         FROM UserDictationAttempt a
         JOIN UserExerciseProgress p ON p.progressId = a.progressId
         WHERE p.userId = ?`,
        [userId]
      ),
      queryValue<number>(
        'SELECT COUNT(*) AS cnt FROM Note WHERE userId = ?',
        [userId]
      ),
      queryValue<number>(
        'SELECT COUNT(*) AS cnt FROM UserExerciseProgress WHERE userId = ? AND isCompleted = 1',
        [userId]
      ),
      query<ContinueRow>(
        `SELECT p.exerciseId, p.currentSentenceIndex, p.lastAttemptDate,
                e.title,
                COALESCE(cfg.effectiveSentenceCount, e.totalSentences) AS totalSentences,
                s.title AS seriesTitle,
                ep.episodeNumber
         FROM UserExerciseProgress p
         JOIN Exercise e ON e.exerciseId = p.exerciseId
         JOIN Episode ep ON ep.episodeId = e.episodeId
         JOIN Season se ON se.seasonId = ep.seasonId
         JOIN Series s ON s.seriesId = se.seriesId
         LEFT JOIN UserSubtitleConfig cfg
           ON cfg.userId = p.userId AND cfg.exerciseId = p.exerciseId
         WHERE p.userId = ? AND p.isCompleted = 0 AND p.lastAttemptDate IS NOT NULL
         ORDER BY p.lastAttemptDate DESC
         LIMIT 3`,
        [userId]
      ),
      queryOne<ContinueRow>(
        `SELECT p.exerciseId, p.currentSentenceIndex, p.lastAttemptDate,
                e.title,
                COALESCE(cfg.effectiveSentenceCount, e.totalSentences) AS totalSentences,
                s.title AS seriesTitle,
                ep.episodeNumber
         FROM UserExerciseProgress p
         JOIN Exercise e ON e.exerciseId = p.exerciseId
         JOIN Episode ep ON ep.episodeId = e.episodeId
         JOIN Season se ON se.seasonId = ep.seasonId
         JOIN Series s ON s.seriesId = se.seriesId
         LEFT JOIN UserSubtitleConfig cfg
           ON cfg.userId = p.userId AND cfg.exerciseId = p.exerciseId
         WHERE p.userId = ? AND p.lastAttemptDate IS NOT NULL
         ORDER BY p.lastAttemptDate DESC
         LIMIT 1`,
        [userId]
      ),
    ]);

    const today = todayRow ?? new Date().toISOString().slice(0, 10);

    const timestamps = todayAttempts.map((row) => new Date(row.attemptDate).getTime());
    const accuracies = todayAttempts.map((row) => Number(row.accuracy));
    const avgAccuracy = accuracies.length
      ? Math.round((accuracies.reduce((sum, v) => sum + v, 0) / accuracies.length) * 10) / 10
      : null;

    return NextResponse.json({
      success: true,
      data: {
        today,
        todayStats: {
          practiceSeconds: estimatePracticeSeconds(timestamps),
          sentencesPracticed: todayAttempts.length,
          avgAccuracy,
          notesCreated: Number(todayNotes ?? 0),
        },
        streakDays: computeStreakDays(activeDays.map((row) => row.day), today),
        weeklyTrend: trendRows.map((row) => ({
          date: row.day,
          sentences: Number(row.sentences),
          avgAccuracy: row.avgAccuracy === null ? null : Number(row.avgAccuracy),
        })),
        totals: {
          sentencesPracticed: Number(totalSentences ?? 0),
          notes: Number(totalNotes ?? 0),
          exercisesCompleted: Number(completedExercises ?? 0),
        },
        continuePracticing: continueRows.map((row) => ({
          exerciseId: row.exerciseId,
          title: row.title,
          seriesTitle: row.seriesTitle,
          episodeNumber: Number(row.episodeNumber),
          currentSentenceIndex: Number(row.currentSentenceIndex),
          totalSentences: Number(row.totalSentences),
          lastAttemptDate: new Date(row.lastAttemptDate).toISOString(),
        })),
        lastPracticed: lastPracticedRow
          ? {
              exerciseId: lastPracticedRow.exerciseId,
              title: lastPracticedRow.title,
              seriesTitle: lastPracticedRow.seriesTitle,
              episodeNumber: Number(lastPracticedRow.episodeNumber),
              currentSentenceIndex: Number(lastPracticedRow.currentSentenceIndex),
              totalSentences: Number(lastPracticedRow.totalSentences),
              lastAttemptDate: new Date(lastPracticedRow.lastAttemptDate).toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
