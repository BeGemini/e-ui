import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, query, queryOne } from '@/lib/db';
import { Series, Season, Episode, Exercise, UserExerciseProgress } from '@/lib/types';

// Define hierarchy types
interface ExerciseInHierarchy extends Exercise {
  completed?: boolean;
  currentProgress?: number;
  knowledgePointCount?: number;
}

interface EpisodeInHierarchy extends Episode {
  exercises: ExerciseInHierarchy[];
}

interface SeasonInHierarchy extends Season {
  episodes: EpisodeInHierarchy[];
}

interface SeriesInHierarchy extends Series {
  seasons: SeasonInHierarchy[];
}

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    // Verify authentication
    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');

    // Build base query
    let seriesQuery = 'SELECT * FROM Series';
    const seriesParams: (string | number | boolean | null)[] = [];

    if (difficulty) {
      seriesQuery += ' WHERE difficulty = ?';
      seriesParams.push(difficulty);
    }

    seriesQuery += ' ORDER BY title';

    // Fetch series
    const series = await query<Series>(seriesQuery, seriesParams);

    // Build hierarchy
    const result: SeriesInHierarchy[] = [];

    for (const s of series) {
      // Fetch seasons for this series
      const seasons = await query<Season>(
        'SELECT * FROM Season WHERE seriesId = ? ORDER BY seasonNumber',
        [s.seriesId]
      );

      const seasonsInHierarchy: SeasonInHierarchy[] = [];

      for (const season of seasons) {
        // Fetch episodes for this season
        const episodes = await query<Episode>(
          'SELECT * FROM Episode WHERE seasonId = ? ORDER BY episodeNumber',
          [season.seasonId]
        );

        const episodesInHierarchy: EpisodeInHierarchy[] = [];

        for (const episode of episodes) {
          // Fetch exercises for this episode
          let exerciseQuery = 'SELECT * FROM Exercise WHERE episodeId = ?';
          const exerciseParams: (string | number | boolean | null)[] = [episode.episodeId];

          // Note: Exercise table doesn't have a 'title' column
          // Sort by createdDate instead
          exerciseQuery += ' ORDER BY createdDate';

          const exercises = await query<Exercise>(exerciseQuery, exerciseParams);

          const exercisesWithProgress: ExerciseInHierarchy[] = [];

          for (const exercise of exercises) {
            // Get user's progress for this exercise
            const progress = await queryOne<UserExerciseProgress>(
              'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
              [session.userId, exercise.exerciseId]
            );

            // Get user's knowledge point count for this exercise
            const knowledgePointCountResult = await queryOne<{ count: number }>(
              `SELECT COUNT(*) as count FROM KnowledgePoint
               WHERE userId = ? AND exerciseId = ?`,
              [session.userId, exercise.exerciseId]
            );

            const exerciseData: ExerciseInHierarchy = {
              ...exercise,
              completed: progress?.isCompleted ?? false,
              currentProgress: progress?.currentSentenceIndex ?? 0,
              knowledgePointCount: knowledgePointCountResult?.count ?? 0,
            };

            exercisesWithProgress.push(exerciseData);
          }

          const episodeData: EpisodeInHierarchy = {
            ...episode,
            exercises: exercisesWithProgress,
          };

          episodesInHierarchy.push(episodeData);
        }

        const seasonData: SeasonInHierarchy = {
          ...season,
          episodes: episodesInHierarchy,
        };

        seasonsInHierarchy.push(seasonData);
      }

      const seriesData: SeriesInHierarchy = {
        ...s,
        seasons: seasonsInHierarchy,
      };

      result.push(seriesData);
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get exercises error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
